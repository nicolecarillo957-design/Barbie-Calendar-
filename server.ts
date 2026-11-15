import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
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

interface PortalDb {
  accounts: Record<string, StoredAccount>;
  profiles: Record<string, UserProfileDoc>;
  eventsByUid: Record<string, Record<string, unknown>[]>;
  tasksByUid: Record<string, Record<string, unknown>[]>;
  feedbackMessages: Record<string, unknown>[];
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
  };
}

let db: PortalDb = loadDb();

function persistDb(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed persisting portal-db.json:', err);
  }
}

function getSyncPayload() {
  return {
    accounts: db.accounts,
    profiles: db.profiles,
    eventsByUid: db.eventsByUid,
    tasksByUid: db.tasksByUid,
    feedbackMessages: db.feedbackMessages,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health & Full Sync
  app.get('/api/portal/sync', (_req: Request, res: Response) => {
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
            teacherEmail: existing.teacherEmail || (prof.teacherEmail ? prof.teacherEmail.trim().toLowerCase() : undefined),
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

    db.profiles[profile.uid] = {
      ...existing,
      ...profile,
      email: cleanEmail,
      teacherEmail: cleanTeacherEmail,
    };

    if (db.accounts[profile.uid]) {
      db.accounts[profile.uid].user.displayName = db.profiles[profile.uid].displayName;
    }

    persistDb();
    res.json({ profile: db.profiles[profile.uid], sync: getSyncPayload() });
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
      db.profiles[existing.uid] = {
        ...existing,
        teacherEmail: cleanTeacher,
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

  // Creator Feedback ChatBox
  app.post('/api/portal/feedback', (req: Request, res: Response) => {
    const msg = req.body as Record<string, unknown>;
    if (!msg?.id || !msg?.text) {
      res.status(400).json({ error: 'Invalid feedback message.' });
      return;
    }
    db.feedbackMessages.push({
      ...msg,
      recipientEmail: CREATOR_ADMIN_EMAIL,
    });
    persistDb();
    res.json({ ok: true });
  });

  app.post('/api/portal/feedback/reply', (req: Request, res: Response) => {
    const { messageId, replyText, adminEmail } = req.body as {
      messageId?: string;
      replyText?: string;
      adminEmail?: string;
    };
    if (!messageId || !replyText) {
      res.status(400).json({ error: 'Missing messageId or replyText.' });
      return;
    }
    db.feedbackMessages = db.feedbackMessages.map((m) =>
      m.id === messageId
        ? { ...m, replyText, replyByEmail: (adminEmail || CREATOR_ADMIN_EMAIL).toLowerCase() }
        : m
    );
    persistDb();
    res.json({ ok: true });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduTrack Portal server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
