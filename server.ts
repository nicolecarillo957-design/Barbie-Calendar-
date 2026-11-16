import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPort = Number(process.env.PORT);
const nginxPort = Number(process.env.NGINX_PORT || 8080);
const PORT =
  process.env.NODE_ENV === 'production'
    ? envPort || 3000
    : !envPort || envPort === nginxPort
    ? 3000
    : envPort;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'portal-db.json');
const CREATOR_ADMIN_EMAIL = 'nicolecarillo957@gmail.com';

interface PortalUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface StoredAccount {
  user: PortalUser;
  password: string;
}

interface UserProfileDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: 'student' | 'teacher';
  teacherEmail?: string;
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  lastActiveDate?: string;
  historyDates: string[];
}

interface TeacherLinkNotification {
  id: string;
  teacherEmail: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  createdAtMs: number;
  seenByUids?: string[];
}

interface PortalDb {
  accounts: Record<string, StoredAccount>;
  profiles: Record<string, UserProfileDoc>;
  eventsByUid: Record<string, Record<string, unknown>[]>;
  tasksByUid: Record<string, Record<string, unknown>[]>;
  feedbackMessages: Record<string, unknown>[];
  teacherNotifications: TeacherLinkNotification[];
}

function makeUidFromEmail(email: string): string {
  const slug = email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 48);
  return `usr_${slug || Date.now()}`;
}

function buildStarterProfile(user: PortalUser): UserProfileDoc {
  return {
    uid: user.uid,
    email: user.email.toLowerCase(),
    displayName: user.displayName,
    photoURL: user.photoURL,
    currentStreak: 0,
    bestStreak: 0,
    totalPoints: 0,
    historyDates: [],
  };
}

function parseEmailList(raw?: string): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .toLowerCase()
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes('@'))
    )
  );
}

function loadDb(): PortalDb {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PortalDb>;
      return {
        accounts: parsed.accounts ?? {},
        profiles: parsed.profiles ?? {},
        eventsByUid: parsed.eventsByUid ?? {},
        tasksByUid: parsed.tasksByUid ?? {},
        feedbackMessages: Array.isArray(parsed.feedbackMessages) ? parsed.feedbackMessages : [],
        teacherNotifications: Array.isArray(parsed.teacherNotifications)
          ? parsed.teacherNotifications
          : [],
      };
    }
  } catch (err) {
    console.error('Failed loading portal-db.json:', err);
  }
  return {
    accounts: {},
    profiles: {},
    eventsByUid: {},
    tasksByUid: {},
    feedbackMessages: [],
    teacherNotifications: [],
  };
}

let db: PortalDb = loadDb();
const sseClients = new Set<Response>();
const wsClients = new Set<WebSocket>();

function broadcastSync(): void {
  const ssePayload = `event: sync\ndata: ${Date.now()}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(ssePayload);
    } catch {
      sseClients.delete(client);
    }
  }

  if (wsClients.size > 0) {
    const wsPayload = JSON.stringify({ type: 'sync', sync: getSyncPayload() });
    for (const ws of wsClients) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(wsPayload);
        } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          wsClients.delete(ws);
        }
      } catch {
        wsClients.delete(ws);
      }
    }
  }
}

function persistDb(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed persisting portal-db.json:', err);
  }
  broadcastSync();
}

function upsertFeedbackMessageRecord(msg: Record<string, unknown>): Record<string, unknown> {
  const cleanSenderEmail = String(msg.senderEmail || '').trim().toLowerCase();
  const isFromCreator = cleanSenderEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
  const requestedRecipient = String(msg.recipientEmail || '').trim().toLowerCase();
  const cleanRecipientEmail = isFromCreator
    ? requestedRecipient || CREATOR_ADMIN_EMAIL
    : CREATOR_ADMIN_EMAIL;

  const incomingReplies = Array.isArray(msg.replies) ? msg.replies : [];
  const existingIdx = db.feedbackMessages.findIndex((m) => String(m.id) === String(msg.id));
  const existing = existingIdx >= 0 ? db.feedbackMessages[existingIdx] : undefined;
  const existingReplies = Array.isArray(existing?.replies)
    ? (existing.replies as Record<string, unknown>[])
    : [];

  // Idempotent union of replies by id
  const replyMap = new Map<string, Record<string, unknown>>();
  for (const r of existingReplies) {
    if (r && r.id) replyMap.set(String(r.id), r);
  }
  for (const r of incomingReplies as Record<string, unknown>[]) {
    if (r && r.id && !replyMap.has(String(r.id))) {
      replyMap.set(String(r.id), r);
    }
  }
  const mergedReplies = Array.from(replyMap.values()).sort(
    (a, b) => Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0)
  );

  const savedMsg: Record<string, unknown> = {
    ...existing,
    ...msg,
    id: String(msg.id),
    senderEmail: cleanSenderEmail,
    recipientEmail: cleanRecipientEmail,
    replies: mergedReplies,
    seenByCreator: existing ? Boolean(existing.seenByCreator) : isFromCreator,
    seenBySender: existing ? Boolean(existing.seenBySender) : !isFromCreator,
    createdAtMs:
      typeof msg.createdAtMs === 'number'
        ? msg.createdAtMs
        : typeof existing?.createdAtMs === 'number'
        ? existing.createdAtMs
        : Date.now(),
  };

  if (existingIdx >= 0) {
    db.feedbackMessages[existingIdx] = savedMsg;
  } else {
    db.feedbackMessages.push(savedMsg);
  }
  return savedMsg;
}

function appendFeedbackReplyRecord(params: {
  messageId?: string;
  replyId?: string;
  replyText?: string;
  adminEmail?: string;
  senderEmail?: string;
  senderName?: string;
  senderUid?: string;
  isCreator?: boolean;
  createdAtMs?: number;
}) {
  const cleanText = (params.replyText || '').trim().slice(0, 1000);
  if (!params.messageId || !cleanText) return null;

  const authorEmail = (params.senderEmail || params.adminEmail || CREATOR_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
  const creatorReply =
    typeof params.isCreator === 'boolean'
      ? params.isCreator
      : authorEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
  const authorName =
    (params.senderName || '').trim() ||
    (creatorReply ? 'Creator (Nicole)' : authorEmail.split('@')[0] || 'User');
  const now = typeof params.createdAtMs === 'number' ? params.createdAtMs : Date.now();
  const replyId =
    params.replyId || `fbr_${now}_${Math.random().toString(36).slice(2, 7)}`;

  const newReply = {
    id: replyId,
    senderUid: params.senderUid,
    senderName: authorName,
    senderEmail: authorEmail,
    isCreator: creatorReply,
    text: cleanText,
    createdAtMs: now,
  };

  db.feedbackMessages = db.feedbackMessages.map((m) => {
    if (String(m.id) !== String(params.messageId)) return m;
    const existingReplies = Array.isArray(m.replies)
      ? [...(m.replies as Record<string, unknown>[])]
      : m.replyText
      ? [
          {
            id: `fbr_legacy_${String(m.id)}`,
            senderName: 'Creator',
            senderEmail: String(m.replyByEmail || CREATOR_ADMIN_EMAIL),
            isCreator: true,
            text: String(m.replyText),
            createdAtMs:
              typeof m.replyAtMs === 'number'
                ? m.replyAtMs
                : typeof m.createdAtMs === 'number'
                ? m.createdAtMs + 1
                : now - 1,
          },
        ]
      : [];

    if (!existingReplies.some((r) => String(r.id) === replyId)) {
      existingReplies.push(newReply);
    }

    return {
      ...m,
      replies: existingReplies,
      ...(creatorReply
        ? {
            replyText: cleanText,
            replyByEmail: authorEmail,
            replyAtMs: now,
            seenByCreator: true,
            seenBySender: false,
          }
        : {
            seenByCreator: false,
            seenBySender: true,
          }),
    };
  });

  return newReply;
}

function markFeedbackSeenRecord(messageIds: string[], viewerEmail: string): void {
  const cleanViewer = viewerEmail.trim().toLowerCase();
  if (!cleanViewer || !Array.isArray(messageIds) || messageIds.length === 0) return;
  const idSet = new Set(messageIds.map(String));
  const viewerIsCreator = cleanViewer === CREATOR_ADMIN_EMAIL.toLowerCase();

  db.feedbackMessages = db.feedbackMessages.map((m) => {
    if (!idSet.has(String(m.id))) return m;
    if (viewerIsCreator) {
      return { ...m, seenByCreator: true };
    }
    const senderMatch = String(m.senderEmail || '').trim().toLowerCase() === cleanViewer;
    const recipientMatch = String(m.recipientEmail || '').trim().toLowerCase() === cleanViewer;
    if (senderMatch || recipientMatch) {
      return { ...m, seenBySender: true };
    }
    return m;
  });
}

function enqueueTeacherLinkNotifications(
  studentProfile: UserProfileDoc,
  teacherEmails: string[]
): void {
  for (const tEmail of teacherEmails) {
    if (!tEmail || tEmail === studentProfile.email.toLowerCase()) continue;
    db.teacherNotifications.push({
      id: `tlink_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      teacherEmail: tEmail,
      studentUid: studentProfile.uid,
      studentName: studentProfile.displayName || studentProfile.email.split('@')[0] || 'Student',
      studentEmail: studentProfile.email.toLowerCase(),
      createdAtMs: Date.now(),
      seenByUids: [],
    });
  }
  if (db.teacherNotifications.length > 300) {
    db.teacherNotifications = db.teacherNotifications.slice(-300);
  }
}

function getSyncPayload() {
  return {
    accounts: db.accounts,
    profiles: db.profiles,
    eventsByUid: db.eventsByUid,
    tasksByUid: db.tasksByUid,
    feedbackMessages: db.feedbackMessages,
    teacherNotifications: db.teacherNotifications,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Live Server-Sent Events stream for immediate notifications & sync
  app.get('/api/portal/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(`event: connected\ndata: ${Date.now()}\n\n`);
    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // Full Sync (never cache behind proxies)
  app.get('/api/portal/sync', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(getSyncPayload());
  });

  // Merge initial localStorage store into server DB (non-destructive)
  app.post('/api/portal/merge-local', (req: Request, res: Response) => {
    const body = (req.body || {}) as Partial<PortalDb>;

    if (body.accounts && typeof body.accounts === 'object') {
      for (const [uid, acc] of Object.entries(body.accounts)) {
        if (!db.accounts[uid] && acc?.user?.email) {
          db.accounts[uid] = acc;
        }
      }
    }

    if (body.profiles && typeof body.profiles === 'object') {
      for (const [uid, prof] of Object.entries(body.profiles)) {
        if (!prof?.email) continue;
        const existing = db.profiles[uid];
        if (!existing) {
          db.profiles[uid] = {
            ...prof,
            email: prof.email.trim().toLowerCase(),
            teacherEmail: prof.teacherEmail ? prof.teacherEmail.trim().toLowerCase() : undefined,
          };
        } else {
          db.profiles[uid] = {
            ...existing,
            displayName: existing.displayName || prof.displayName,
            role: existing.role || prof.role,
            teacherEmail:
              existing.teacherEmail ||
              (prof.teacherEmail ? prof.teacherEmail.trim().toLowerCase() : undefined),
            currentStreak: Math.max(existing.currentStreak ?? 0, prof.currentStreak ?? 0),
            bestStreak: Math.max(existing.bestStreak ?? 0, prof.bestStreak ?? 0),
            totalPoints: Math.max(existing.totalPoints ?? 0, prof.totalPoints ?? 0),
            historyDates:
              existing.historyDates && existing.historyDates.length >= (prof.historyDates?.length ?? 0)
                ? existing.historyDates
                : prof.historyDates ?? [],
          };
        }
      }
    }

    if (body.eventsByUid && typeof body.eventsByUid === 'object') {
      for (const [uid, list] of Object.entries(body.eventsByUid)) {
        if (!Array.isArray(list)) continue;
        const current = db.eventsByUid[uid] ?? [];
        const existingIds = new Set(current.map((e) => String(e.id)));
        for (const item of list) {
          if (item && !existingIds.has(String(item.id))) {
            current.push(item);
          }
        }
        db.eventsByUid[uid] = current;
      }
    }

    if (body.tasksByUid && typeof body.tasksByUid === 'object') {
      for (const [uid, list] of Object.entries(body.tasksByUid)) {
        if (!Array.isArray(list)) continue;
        const current = db.tasksByUid[uid] ?? [];
        const existingIds = new Set(current.map((t) => String(t.id)));
        for (const item of list) {
          if (item && !existingIds.has(String(item.id))) {
            current.push(item);
          }
        }
        db.tasksByUid[uid] = current;
      }
    }

    if (Array.isArray(body.feedbackMessages)) {
      const existingIds = new Set(db.feedbackMessages.map((m) => String(m.id)));
      for (const msg of body.feedbackMessages) {
        if (msg && !existingIds.has(String(msg.id))) {
          db.feedbackMessages.push(msg);
        }
      }
    }

    if (Array.isArray(body.teacherNotifications)) {
      const existingIds = new Set(db.teacherNotifications.map((n) => n.id));
      for (const n of body.teacherNotifications) {
        if (n?.id && !existingIds.has(n.id)) {
          db.teacherNotifications.push(n);
        }
      }
    }

    persistDb();
    res.json(getSyncPayload());
  });

  // Register freely
  app.post('/api/portal/register', (req: Request, res: Response) => {
    const { displayName = '', email = '', password = '' } = req.body as {
      displayName?: string;
      email?: string;
      password?: string;
    };
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ error: 'Please create a safety password of at least 4 characters.' });
      return;
    }

    const existing = Object.values(db.accounts).find(
      (a) => a.user.email.toLowerCase() === cleanEmail
    );
    if (existing) {
      res.status(409).json({
        error: 'An account with this email already exists. Switch to Sign In to continue!',
      });
      return;
    }

    const cleanName = displayName.trim().slice(0, 120) || cleanEmail.split('@')[0] || 'Student';
    const uid = makeUidFromEmail(cleanEmail);
    const newUser: PortalUser = { uid, email: cleanEmail, displayName: cleanName };
    db.accounts[uid] = { user: newUser, password };

    const existingProfile = db.profiles[uid];
    db.profiles[uid] = existingProfile
      ? { ...existingProfile, displayName: cleanName }
      : buildStarterProfile(newUser);

    persistDb();
    res.json({ user: newUser, sync: getSyncPayload() });
  });

  // Sign in freely (auto-creates if email doesn't exist yet)
  app.post('/api/portal/login', (req: Request, res: Response) => {
    const { email = '', password = '', displayNameIfNew = '' } = req.body as {
      email?: string;
      password?: string;
      displayNameIfNew?: string;
    };
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'Please enter your password.' });
      return;
    }

    const existing = Object.values(db.accounts).find(
      (a) => a.user.email.toLowerCase() === cleanEmail
    );
    if (existing) {
      if (existing.password && existing.password !== password) {
        res.status(401).json({
          error: 'Incorrect password. Please try again or reset your password.',
        });
        return;
      }
      if (!db.profiles[existing.user.uid]) {
        db.profiles[existing.user.uid] = buildStarterProfile(existing.user);
        persistDb();
      }
      res.json({ user: existing.user, sync: getSyncPayload() });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({
        error: 'Please use a password of at least 4 characters to protect your new account.',
      });
      return;
    }

    const cleanName =
      displayNameIfNew.trim().slice(0, 120) || cleanEmail.split('@')[0] || 'Student';
    const uid = makeUidFromEmail(cleanEmail);
    const newUser: PortalUser = { uid, email: cleanEmail, displayName: cleanName };
    db.accounts[uid] = { user: newUser, password };
    const existingProfile = db.profiles[uid];
    db.profiles[uid] = existingProfile
      ? { ...existingProfile, displayName: cleanName }
      : buildStarterProfile(newUser);

    persistDb();
    res.json({ user: newUser, sync: getSyncPayload() });
  });

  app.post('/api/portal/reset-password', (req: Request, res: Response) => {
    const { email = '', newPassword = '' } = req.body as { email?: string; newPassword?: string };
    const cleanEmail = email.trim().toLowerCase();
    if (newPassword.length < 4) {
      res.status(400).json({ error: 'New password must be at least 4 characters.' });
      return;
    }
    const entry = Object.values(db.accounts).find(
      (a) => a.user.email.toLowerCase() === cleanEmail
    );
    if (!entry) {
      res.status(404).json({
        error: 'No account found for that email. Create a new account freely!',
      });
      return;
    }
    db.accounts[entry.user.uid] = { ...entry, password: newPassword };
    persistDb();
    res.json({ ok: true, sync: getSyncPayload() });
  });

  app.post('/api/portal/password', (req: Request, res: Response) => {
    const { uid = '', newPassword = '', currentPassword } = req.body as {
      uid?: string;
      newPassword?: string;
      currentPassword?: string;
    };
    const acc = db.accounts[uid];
    if (!acc) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    if (newPassword.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters.' });
      return;
    }
    if (acc.password && currentPassword !== undefined && acc.password !== currentPassword) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }
    db.accounts[uid] = { ...acc, password: newPassword };
    persistDb();
    res.json({ ok: true, sync: getSyncPayload() });
  });

  // Update user profile (teacherEmail, role, name, streak, points)
  app.post('/api/portal/profile', (req: Request, res: Response) => {
    const profile = req.body as UserProfileDoc;
    if (!profile?.uid || !profile?.email) {
      res.status(400).json({ error: 'Invalid profile payload.' });
      return;
    }
    const existing = db.profiles[profile.uid];
    const cleanEmail = profile.email.trim().toLowerCase();
    const cleanTeacherEmail =
      profile.teacherEmail !== undefined
        ? profile.teacherEmail.trim().toLowerCase()
        : existing?.teacherEmail;

    const prevTeachers = new Set(parseEmailList(existing?.teacherEmail));
    const nextTeachers = parseEmailList(cleanTeacherEmail);
    const newlyAddedTeachers = nextTeachers.filter((t) => !prevTeachers.has(t));

    const updatedProfile: UserProfileDoc = {
      ...existing,
      ...profile,
      email: cleanEmail,
      teacherEmail: cleanTeacherEmail,
    };

    db.profiles[profile.uid] = updatedProfile;

    if (db.accounts[profile.uid]) {
      db.accounts[profile.uid].user.displayName = updatedProfile.displayName;
    }

    if (newlyAddedTeachers.length > 0) {
      enqueueTeacherLinkNotifications(updatedProfile, newlyAddedTeachers);
    }

    persistDb();
    res.json({ profile: updatedProfile, sync: getSyncPayload() });
  });

  // Explicit Student -> Teacher Gmail link endpoint (always notifies teacher immediately!)
  app.post('/api/portal/link-teacher', (req: Request, res: Response) => {
    const { studentProfile, teacherEmail = '', notification, notifications } = req.body as {
      studentProfile?: UserProfileDoc;
      teacherEmail?: string;
      notification?: TeacherLinkNotification;
      notifications?: TeacherLinkNotification[];
    };
    if (!studentProfile?.uid || !studentProfile?.email) {
      res.status(400).json({ error: 'Missing student profile.' });
      return;
    }

    const cleanStudentEmail = studentProfile.email.trim().toLowerCase();
    const cleanTeacher = teacherEmail.trim().toLowerCase();
    const existing = db.profiles[studentProfile.uid];

    const updatedProfile: UserProfileDoc = {
      ...existing,
      ...studentProfile,
      email: cleanStudentEmail,
      teacherEmail: cleanTeacher,
    };
    db.profiles[studentProfile.uid] = updatedProfile;

    const incomingList = Array.isArray(notifications)
      ? notifications
      : notification?.id
      ? [notification]
      : [];

    if (incomingList.length > 0) {
      for (const item of incomingList) {
        if (item?.id && !db.teacherNotifications.some((n) => n.id === item.id)) {
          db.teacherNotifications.push(item);
        }
      }
      if (db.teacherNotifications.length > 300) {
        db.teacherNotifications = db.teacherNotifications.slice(-300);
      }
    } else {
      const parsedTeachers = parseEmailList(cleanTeacher);
      if (parsedTeachers.length > 0) {
        enqueueTeacherLinkNotifications(updatedProfile, parsedTeachers);
      }
    }

    persistDb();
    res.json({ profile: updatedProfile, sync: getSyncPayload() });
  });

  // Mark teacher link notifications seen for a user
  app.post('/api/portal/teacher-notifications/seen', (req: Request, res: Response) => {
    const { ids = [], uid = '' } = req.body as { ids?: string[]; uid?: string };
    if (!uid || !Array.isArray(ids) || ids.length === 0) {
      res.json({ ok: true });
      return;
    }
    const idSet = new Set(ids);
    db.teacherNotifications = db.teacherNotifications.map((n) => {
      if (!idSet.has(n.id)) return n;
      const seen = new Set(n.seenByUids ?? []);
      seen.add(uid);
      return { ...n, seenByUids: Array.from(seen) };
    });
    persistDb();
    res.json({ ok: true, sync: getSyncPayload() });
  });

  // Teacher links a student by student email (finds existing student or creates pre-linked profile)
  app.post('/api/portal/link-student', (req: Request, res: Response) => {
    const { teacherEmail = '', studentEmail = '' } = req.body as {
      teacherEmail?: string;
      studentEmail?: string;
    };
    const cleanTeacher = teacherEmail.trim().toLowerCase();
    const cleanStudent = studentEmail.trim().toLowerCase();

    if (!cleanTeacher || !cleanTeacher.includes('@')) {
      res.status(400).json({ error: 'Invalid teacher email.' });
      return;
    }
    if (!cleanStudent || !cleanStudent.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid student email address.' });
      return;
    }
    if (cleanStudent === cleanTeacher) {
      res.status(400).json({ error: 'You cannot link your own email as a student.' });
      return;
    }

    const existing = Object.values(db.profiles).find(
      (p) => p.email.trim().toLowerCase() === cleanStudent
    );
    if (existing) {
      const existingTeachers = parseEmailList(existing.teacherEmail);
      if (!existingTeachers.includes(cleanTeacher)) {
        existingTeachers.push(cleanTeacher);
      }
      db.profiles[existing.uid] = {
        ...existing,
        teacherEmail: existingTeachers.join(', '),
      };
    } else {
      const uid = makeUidFromEmail(cleanStudent);
      db.profiles[uid] = {
        uid,
        email: cleanStudent,
        displayName: cleanStudent.split('@')[0] || 'Student',
        role: 'student',
        teacherEmail: cleanTeacher,
        currentStreak: 0,
        bestStreak: 0,
        totalPoints: 0,
        historyDates: [],
      };
    }

    persistDb();
    res.json({ sync: getSyncPayload() });
  });

  // Events
  app.post('/api/portal/event', (req: Request, res: Response) => {
    const { ownerUid, event } = req.body as {
      ownerUid?: string;
      event?: Record<string, unknown>;
    };
    if (!ownerUid || !event?.id) {
      res.status(400).json({ error: 'Missing ownerUid or event.id' });
      return;
    }
    const list = [...(db.eventsByUid[ownerUid] ?? [])];
    const idx = list.findIndex((e) => e.id === event.id);
    if (idx >= 0) list[idx] = event;
    else list.push(event);
    db.eventsByUid[ownerUid] = list;
    persistDb();
    res.json({ ok: true });
  });

  app.delete('/api/portal/event/:ownerUid/:eventId', (req: Request, res: Response) => {
    const { ownerUid, eventId } = req.params;
    db.eventsByUid[ownerUid] = (db.eventsByUid[ownerUid] ?? []).filter((e) => e.id !== eventId);
    persistDb();
    res.json({ ok: true });
  });

  app.post('/api/portal/event/verify', (req: Request, res: Response) => {
    const { studentUid, eventId, evidence } = req.body as {
      studentUid?: string;
      eventId?: string;
      evidence?: unknown;
    };
    if (!studentUid || !eventId) {
      res.status(400).json({ error: 'Missing studentUid or eventId' });
      return;
    }
    db.eventsByUid[studentUid] = (db.eventsByUid[studentUid] ?? []).map((e) =>
      e.id === eventId ? { ...e, evidence } : e
    );
    persistDb();
    res.json({ ok: true });
  });

  // Tasks
  app.post('/api/portal/task', (req: Request, res: Response) => {
    const { ownerUid, task } = req.body as {
      ownerUid?: string;
      task?: Record<string, unknown>;
    };
    if (!ownerUid || !task?.id) {
      res.status(400).json({ error: 'Missing ownerUid or task.id' });
      return;
    }
    const list = [...(db.tasksByUid[ownerUid] ?? [])];
    const idx = list.findIndex((t) => t.id === task.id);
    if (idx >= 0) list[idx] = task;
    else list.push(task);
    db.tasksByUid[ownerUid] = list;
    persistDb();
    res.json({ ok: true });
  });

  app.delete('/api/portal/task/:ownerUid/:taskId', (req: Request, res: Response) => {
    const { ownerUid, taskId } = req.params;
    db.tasksByUid[ownerUid] = (db.tasksByUid[ownerUid] ?? []).filter((t) => t.id !== taskId);
    persistDb();
    res.json({ ok: true });
  });

  app.post('/api/portal/task/verify', (req: Request, res: Response) => {
    const { studentUid, taskId, evidence } = req.body as {
      studentUid?: string;
      taskId?: string;
      evidence?: unknown;
    };
    if (!studentUid || !taskId) {
      res.status(400).json({ error: 'Missing studentUid or taskId' });
      return;
    }
    db.tasksByUid[studentUid] = (db.tasksByUid[studentUid] ?? []).map((t) =>
      t.id === taskId ? { ...t, evidence } : t
    );
    persistDb();
    res.json({ ok: true });
  });

  // Batch reorder assignments (priority + custom order)
  app.post('/api/portal/batch-reorder', (req: Request, res: Response) => {
    const { ownerUid, tasks = [], events = [] } = req.body as {
      ownerUid?: string;
      tasks?: Record<string, unknown>[];
      events?: Record<string, unknown>[];
    };
    if (!ownerUid) {
      res.status(400).json({ error: 'Missing ownerUid' });
      return;
    }

    if (tasks.length > 0) {
      const taskMap = new Map(tasks.map((t) => [String(t.id), t]));
      db.tasksByUid[ownerUid] = (db.tasksByUid[ownerUid] ?? []).map(
        (existing) => taskMap.get(String(existing.id)) ?? existing
      );
    }

    if (events.length > 0) {
      const eventMap = new Map(events.map((e) => [String(e.id), e]));
      db.eventsByUid[ownerUid] = (db.eventsByUid[ownerUid] ?? []).map(
        (existing) => eventMap.get(String(existing.id)) ?? existing
      );
    }

    persistDb();
    res.json({ ok: true });
  });

  // Creator Feedback & Two-Way Messaging Inbox (Recipient: nicolecarillo957@gmail.com)
  app.post('/api/portal/feedback', (req: Request, res: Response) => {
    const msg = req.body as Record<string, unknown>;
    if (!msg?.id || !msg?.text) {
      res.status(400).json({ error: 'Invalid feedback message.' });
      return;
    }
    const savedMsg = upsertFeedbackMessageRecord(msg);
    persistDb();
    res.json({ ok: true, message: savedMsg, sync: getSyncPayload() });
  });

  app.post('/api/portal/feedback/reply', (req: Request, res: Response) => {
    const body = req.body as {
      messageId?: string;
      replyId?: string;
      replyText?: string;
      adminEmail?: string;
      senderEmail?: string;
      senderName?: string;
      senderUid?: string;
      isCreator?: boolean;
      createdAtMs?: number;
    };
    const newReply = appendFeedbackReplyRecord(body);
    if (!newReply) {
      res.status(400).json({ error: 'Missing messageId or replyText.' });
      return;
    }
    persistDb();
    res.json({ ok: true, reply: newReply, sync: getSyncPayload() });
  });

  app.post('/api/portal/feedback/seen', (req: Request, res: Response) => {
    const { messageIds = [], viewerEmail = '' } = req.body as {
      messageIds?: string[];
      viewerEmail?: string;
    };
    markFeedbackSeenRecord(messageIds, viewerEmail);
    persistDb();
    res.json({ ok: true, sync: getSyncPayload() });
  });

  // Mount Vite middleware in dev or serve built assets in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*path}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/portal' });

  wss.on('connection', (ws) => {
    wsClients.add(ws);
    try {
      ws.send(JSON.stringify({ type: 'sync', sync: getSyncPayload() }));
    } catch {
      // ignore initial send error
    }

    ws.on('message', (raw) => {
      try {
        const packet = JSON.parse(String(raw)) as {
          type?: string;
          payload?: Record<string, unknown>;
        };
        if (packet.type === 'sync:request') {
          ws.send(JSON.stringify({ type: 'sync', sync: getSyncPayload() }));
          return;
        }
        if (packet.type === 'chat:send' && packet.payload?.id && packet.payload?.text) {
          upsertFeedbackMessageRecord(packet.payload);
          persistDb();
          return;
        }
        if (packet.type === 'chat:reply' && packet.payload) {
          const added = appendFeedbackReplyRecord(packet.payload as Parameters<typeof appendFeedbackReplyRecord>[0]);
          if (added) persistDb();
          return;
        }
        if (packet.type === 'chat:seen' && packet.payload) {
          const { messageIds = [], viewerEmail = '' } = packet.payload as {
            messageIds?: string[];
            viewerEmail?: string;
          };
          markFeedbackSeenRecord(messageIds, viewerEmail);
          persistDb();
        }
      } catch {
        // ignore malformed websocket packet
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
    });
    ws.on('error', () => {
      wsClients.delete(ws);
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`EduTrack Portal server + WebSocket listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
