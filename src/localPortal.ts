import {
  CalendarEvent,
  FeedbackCategory,
  FeedbackMessage,
  FeedbackReply,
  StudentStreakData,
  TaskEvidence,
  TeacherLinkNotification,
  UnscheduledTask,
  UserProfileDoc,
  UserRole,
} from './types/calendar';

export const CREATOR_ADMIN_EMAIL = 'nicolecarillo957@gmail.com';
const PORTAL_STORAGE_KEY = 'edutrack_local_portal_v1';

export interface PortalUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface StoredAccount {
  user: PortalUser;
  password: string;
}

interface PortalStoreState {
  currentUid: string | null;
  accounts: Record<string, StoredAccount>;
  profiles: Record<string, UserProfileDoc>;
  eventsByUid: Record<string, CalendarEvent[]>;
  tasksByUid: Record<string, UnscheduledTask[]>;
  feedbackMessages: FeedbackMessage[];
  teacherNotifications: TeacherLinkNotification[];
}

const DEFAULT_STORE: PortalStoreState = {
  currentUid: null,
  accounts: {},
  profiles: {},
  eventsByUid: {},
  tasksByUid: {},
  feedbackMessages: [],
  teacherNotifications: [],
};

type StoreListener = () => void;
const listeners = new Set<StoreListener>();
let lastRemoteDigest = '';
let hasMergedInitialLocal = false;
let syncInFlight: Promise<void> | null = null;
let pendingResync = false;
let syncPollerStarted = false;

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

function loadStore(): PortalStoreState {
  try {
    const raw = localStorage.getItem(PORTAL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STORE };
    const parsed = JSON.parse(raw) as Partial<PortalStoreState>;
    return {
      currentUid: parsed.currentUid ?? null,
      accounts: parsed.accounts ?? {},
      profiles: parsed.profiles ?? {},
      eventsByUid: parsed.eventsByUid ?? {},
      tasksByUid: parsed.tasksByUid ?? {},
      feedbackMessages: Array.isArray(parsed.feedbackMessages) ? parsed.feedbackMessages : [],
      teacherNotifications: Array.isArray(parsed.teacherNotifications)
        ? parsed.teacherNotifications
        : [],
    };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

function saveStore(next: PortalStoreState): void {
  try {
    localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Could not save portal state to localStorage:', err);
  }
  listeners.forEach((cb) => cb());
}

function applyServerSyncPayload(payload: Partial<PortalStoreState>): void {
  if (!payload || typeof payload !== 'object') return;
  const digest = JSON.stringify(payload);
  if (digest === lastRemoteDigest) return;
  lastRemoteDigest = digest;

  const local = loadStore();
  const localSeenMap = new Map<string, string[]>();
  local.teacherNotifications.forEach((n) => {
    if (n.seenByUids && n.seenByUids.length > 0) {
      localSeenMap.set(n.id, n.seenByUids);
    }
  });

  const remoteNotifs = Array.isArray(payload.teacherNotifications)
    ? payload.teacherNotifications
    : [];
  const remoteIds = new Set(remoteNotifs.map((n) => n.id));
  const mergedNotifs: TeacherLinkNotification[] = remoteNotifs.map((n) => {
    const localSeen = localSeenMap.get(n.id) ?? [];
    if (localSeen.length === 0) return n;
    const unionSeen = Array.from(new Set([...(n.seenByUids ?? []), ...localSeen]));
    return { ...n, seenByUids: unionSeen };
  });

  const cutoffMs = Date.now() - 15000;
  local.teacherNotifications.forEach((n) => {
    if (!remoteIds.has(n.id) && (n.createdAtMs || 0) >= cutoffMs) {
      mergedNotifs.push(n);
    }
  });

  const next: PortalStoreState = {
    currentUid: local.currentUid,
    accounts: { ...local.accounts, ...(payload.accounts ?? {}) },
    profiles: { ...local.profiles, ...(payload.profiles ?? {}) },
    eventsByUid: { ...local.eventsByUid, ...(payload.eventsByUid ?? {}) },
    tasksByUid: { ...local.tasksByUid, ...(payload.tasksByUid ?? {}) },
    feedbackMessages: Array.isArray(payload.feedbackMessages)
      ? payload.feedbackMessages
      : local.feedbackMessages,
    teacherNotifications: mergedNotifs,
  };
  saveStore(next);
}

async function postJson<T = unknown>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) {
      if (data?.error) throw new Error(data.error);
      return null;
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.message && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    return null;
  }
}

export async function syncPortalNow(): Promise<void> {
  if (syncInFlight) {
    pendingResync = true;
    return syncInFlight;
  }
  syncInFlight = (async () => {
    try {
      if (!hasMergedInitialLocal) {
        hasMergedInitialLocal = true;
        const local = loadStore();
        const res = await fetch('/api/portal/merge-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accounts: local.accounts,
            profiles: local.profiles,
            eventsByUid: local.eventsByUid,
            tasksByUid: local.tasksByUid,
            feedbackMessages: local.feedbackMessages,
            teacherNotifications: local.teacherNotifications,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as Partial<PortalStoreState>;
          applyServerSyncPayload(data);
          return;
        }
      }

      const res = await fetch('/api/portal/sync');
      if (res.ok) {
        const data = (await res.json()) as Partial<PortalStoreState>;
        applyServerSyncPayload(data);
      }
    } catch {
      // Backend optional fallback: continue with localStorage smoothly
    } finally {
      syncInFlight = null;
      if (pendingResync) {
        pendingResync = false;
        void syncPortalNow();
      }
    }
  })();
  return syncInFlight;
}

function ensureSyncPoller(): void {
  if (syncPollerStarted || typeof window === 'undefined') return;
  syncPollerStarted = true;
  void syncPortalNow();

  if (typeof EventSource !== 'undefined') {
    try {
      const es = new EventSource('/api/portal/stream');
      es.addEventListener('sync', () => {
        void syncPortalNow();
      });
      es.onmessage = () => {
        void syncPortalNow();
      };
    } catch {
      // Ignore if SSE unavailable; fallback poller below still handles sync
    }
  }

  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void syncPortalNow();
    }
  }, 2500);

  window.addEventListener('focus', () => {
    void syncPortalNow();
  });
}

function subscribeStore(cb: StoreListener): () => void {
  ensureSyncPoller();
  listeners.add(cb);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === PORTAL_STORAGE_KEY) cb();
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', handleStorage);
  };
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

function buildStarterProfile(user: PortalUser, streak?: StudentStreakData): UserProfileDoc {
  return {
    uid: user.uid,
    email: user.email.toLowerCase(),
    displayName: user.displayName,
    photoURL: user.photoURL,
    currentStreak: streak?.currentStreak ?? 0,
    bestStreak: streak?.bestStreak ?? 0,
    totalPoints: streak?.totalPoints ?? 0,
    lastActiveDate: streak?.lastActiveDate,
    historyDates: streak?.historyDates ?? [],
  };
}

export function getCurrentPortalUser(): PortalUser | null {
  const store = loadStore();
  if (!store.currentUid) return null;
  return store.accounts[store.currentUid]?.user ?? null;
}

export function listSavedPortalAccounts(): PortalUser[] {
  const store = loadStore();
  return Object.values(store.accounts).map((acc) => acc.user);
}

function getAuthSignature(user: PortalUser | null): string | null {
  if (!user) return null;
  return `${user.uid}|${user.email}|${user.displayName}|${user.photoURL ?? ''}`;
}

export function subscribeAuthState(callback: (user: PortalUser | null) => void): () => void {
  ensureSyncPoller();
  const initialUser = getCurrentPortalUser();
  let lastSig = getAuthSignature(initialUser);
  callback(initialUser);
  return subscribeStore(() => {
    const user = getCurrentPortalUser();
    const nextSig = getAuthSignature(user);
    if (nextSig !== lastSig) {
      lastSig = nextSig;
      callback(user);
    }
  });
}

export async function registerAccountFreely(
  displayName: string,
  email: string,
  password: string
): Promise<PortalUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (password.length < 4) {
    throw new Error('Please create a safety password of at least 4 characters.');
  }

  const serverRes = await postJson<{ user: PortalUser; sync?: Partial<PortalStoreState> }>(
    '/api/portal/register',
    { displayName, email: cleanEmail, password }
  );

  if (serverRes?.user) {
    const store = loadStore();
    store.currentUid = serverRes.user.uid;
    store.accounts[serverRes.user.uid] = { user: serverRes.user, password };
    if (!store.profiles[serverRes.user.uid]) {
      store.profiles[serverRes.user.uid] = buildStarterProfile(serverRes.user);
    }
    saveStore(store);
    if (serverRes.sync) applyServerSyncPayload(serverRes.sync);
    return serverRes.user;
  }

  const store = loadStore();
  const existing = Object.values(store.accounts).find(
    (a) => a.user.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    throw new Error('An account with this email already exists. Switch to Sign In to continue!');
  }

  const cleanName = displayName.trim().slice(0, 120) || cleanEmail.split('@')[0] || 'Student';
  const uid = makeUidFromEmail(cleanEmail);
  const newUser: PortalUser = {
    uid,
    email: cleanEmail,
    displayName: cleanName,
  };

  store.accounts[uid] = { user: newUser, password };
  if (!store.profiles[uid]) {
    store.profiles[uid] = buildStarterProfile(newUser);
  }
  store.currentUid = uid;
  saveStore(store);
  return newUser;
}

export async function signInFreely(
  email: string,
  password: string,
  displayNameIfNew?: string
): Promise<PortalUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }

  const serverRes = await postJson<{ user: PortalUser; sync?: Partial<PortalStoreState> }>(
    '/api/portal/login',
    { email: cleanEmail, password, displayNameIfNew }
  );

  if (serverRes?.user) {
    const store = loadStore();
    store.currentUid = serverRes.user.uid;
    store.accounts[serverRes.user.uid] = { user: serverRes.user, password };
    if (!store.profiles[serverRes.user.uid]) {
      store.profiles[serverRes.user.uid] = buildStarterProfile(serverRes.user);
    }
    saveStore(store);
    if (serverRes.sync) applyServerSyncPayload(serverRes.sync);
    return serverRes.user;
  }

  const store = loadStore();
  const existing = Object.values(store.accounts).find(
    (a) => a.user.email.toLowerCase() === cleanEmail
  );

  if (existing) {
    if (existing.password && existing.password !== password) {
      throw new Error('Incorrect password. Please try again or reset your password.');
    }
    store.currentUid = existing.user.uid;
    saveStore(store);
    return existing.user;
  }

  if (password.length < 4) {
    throw new Error('Please use a password of at least 4 characters to protect your new account.');
  }
  const cleanName =
    (displayNameIfNew || '').trim().slice(0, 120) || cleanEmail.split('@')[0] || 'Student';
  const uid = makeUidFromEmail(cleanEmail);
  const newUser: PortalUser = {
    uid,
    email: cleanEmail,
    displayName: cleanName,
  };
  store.accounts[uid] = { user: newUser, password };
  if (!store.profiles[uid]) {
    store.profiles[uid] = buildStarterProfile(newUser);
  }
  store.currentUid = uid;
  saveStore(store);
  return newUser;
}

export async function quickSignInWithSavedAccount(uid: string, password?: string): Promise<PortalUser> {
  const store = loadStore();
  const acc = store.accounts[uid];
  if (!acc) throw new Error('Account not found.');
  if (acc.password && password !== undefined && acc.password !== password) {
    throw new Error('Incorrect password for this account.');
  }
  store.currentUid = uid;
  saveStore(store);
  return acc.user;
}

export async function resetLocalAccountPassword(email: string, newPassword: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (newPassword.length < 4) {
    throw new Error('New password must be at least 4 characters.');
  }

  const serverRes = await postJson<{ ok: boolean; sync?: Partial<PortalStoreState> }>(
    '/api/portal/reset-password',
    { email: cleanEmail, newPassword }
  );

  const store = loadStore();
  const entry = Object.values(store.accounts).find(
    (a) => a.user.email.toLowerCase() === cleanEmail
  );
  if (!entry && !serverRes?.ok) {
    throw new Error('No saved account found for that email. Create a new account freely!');
  }
  if (entry) {
    store.accounts[entry.user.uid] = { ...entry, password: newPassword };
    saveStore(store);
  }
  if (serverRes?.sync) applyServerSyncPayload(serverRes.sync);
}

export function hasAccountPassword(user: PortalUser | null): boolean {
  if (!user) return false;
  const store = loadStore();
  return Boolean(store.accounts[user.uid]?.password);
}

export async function setOrUpdateAccountPassword(
  newPassword: string,
  currentPassword?: string
): Promise<void> {
  const store = loadStore();
  if (!store.currentUid || !store.accounts[store.currentUid]) {
    throw new Error('You must be signed in to update your password.');
  }
  if (newPassword.length < 4) {
    throw new Error('Password must be at least 4 characters.');
  }
  const acc = store.accounts[store.currentUid];
  if (acc.password && currentPassword !== undefined && acc.password !== currentPassword) {
    throw new Error('Current password is incorrect.');
  }

  await postJson('/api/portal/password', {
    uid: store.currentUid,
    newPassword,
    currentPassword,
  });

  store.accounts[store.currentUid] = { ...acc, password: newPassword };
  saveStore(store);
}

export async function signOutUser(): Promise<void> {
  const store = loadStore();
  store.currentUid = null;
  saveStore(store);
}

export async function ensureUserProfile(user: PortalUser): Promise<void> {
  const store = loadStore();
  if (!store.profiles[user.uid]) {
    const starter = buildStarterProfile(user);
    store.profiles[user.uid] = starter;
    saveStore(store);
    await postJson('/api/portal/profile', starter);
  }
  void syncPortalNow();
}

export async function syncUserProfile(
  user: PortalUser,
  streakData: StudentStreakData,
  displayNameOverride?: string,
  teacherEmail?: string,
  role?: UserRole
): Promise<void> {
  const store = loadStore();
  const existing = store.profiles[user.uid];
  const cleanName =
    (
      displayNameOverride ||
      existing?.displayName ||
      user.displayName ||
      user.email.split('@')[0] ||
      'Student'
    )
      .trim()
      .slice(0, 120) || 'Student';

  const nextProfile: UserProfileDoc = {
    uid: user.uid,
    email: user.email.toLowerCase(),
    displayName: cleanName,
    photoURL: user.photoURL ?? existing?.photoURL,
    role: role !== undefined ? role : existing?.role,
    teacherEmail:
      teacherEmail !== undefined ? teacherEmail.trim().toLowerCase() : existing?.teacherEmail,
    currentStreak: Math.max(0, Math.round(streakData.currentStreak ?? existing?.currentStreak ?? 0)),
    bestStreak: Math.max(0, Math.round(streakData.bestStreak ?? existing?.bestStreak ?? 0)),
    totalPoints: Math.max(0, Math.round(streakData.totalPoints ?? existing?.totalPoints ?? 0)),
    lastActiveDate: streakData.lastActiveDate ?? existing?.lastActiveDate,
    historyDates: Array.isArray(streakData.historyDates)
      ? streakData.historyDates
      : existing?.historyDates ?? [],
  };

  const prevTeachers = new Set(parseEmailList(existing?.teacherEmail));
  const newlyAddedTeachers = parseEmailList(nextProfile.teacherEmail).filter(
    (t) => !prevTeachers.has(t) && t !== nextProfile.email
  );
  if (newlyAddedTeachers.length > 0) {
    const newNotifs: TeacherLinkNotification[] = newlyAddedTeachers.map((tEmail) => ({
      id: `tlink_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      teacherEmail: tEmail,
      studentUid: user.uid,
      studentName: cleanName,
      studentEmail: nextProfile.email,
      createdAtMs: Date.now(),
      seenByUids: [],
    }));
    store.teacherNotifications = [...store.teacherNotifications, ...newNotifs].slice(-300);
  }

  store.profiles[user.uid] = nextProfile;
  if (store.accounts[user.uid]) {
    store.accounts[user.uid].user.displayName = cleanName;
  }
  saveStore(store);

  const serverRes = await postJson<{ sync?: Partial<PortalStoreState> }>(
    '/api/portal/profile',
    nextProfile
  );
  if (serverRes?.sync) applyServerSyncPayload(serverRes.sync);
}

export async function updateUserRole(
  user: PortalUser,
  role: UserRole,
  streakData: StudentStreakData,
  displayNameOverride?: string
): Promise<void> {
  await syncUserProfile(user, streakData, displayNameOverride, undefined, role);
}

export async function updateAssignedTeacherEmail(
  user: PortalUser,
  teacherEmail: string,
  _events: CalendarEvent[],
  _tasks: UnscheduledTask[],
  streakData: StudentStreakData,
  studentName: string
): Promise<void> {
  const normalized = teacherEmail.trim().toLowerCase();
  if (normalized && !normalized.includes('@')) {
    throw new Error('Please enter a valid teacher Gmail address.');
  }

  const store = loadStore();
  const existing = store.profiles[user.uid];
  const cleanName =
    (studentName || existing?.displayName || user.displayName || user.email.split('@')[0] || 'Student')
      .trim()
      .slice(0, 120) || 'Student';
  const cleanStudentEmail = user.email.toLowerCase();

  const nextProfile: UserProfileDoc = {
    uid: user.uid,
    email: cleanStudentEmail,
    displayName: cleanName,
    photoURL: user.photoURL ?? existing?.photoURL,
    role: existing?.role ?? 'student',
    teacherEmail: normalized,
    currentStreak: Math.max(0, Math.round(streakData.currentStreak ?? existing?.currentStreak ?? 0)),
    bestStreak: Math.max(0, Math.round(streakData.bestStreak ?? existing?.bestStreak ?? 0)),
    totalPoints: Math.max(0, Math.round(streakData.totalPoints ?? existing?.totalPoints ?? 0)),
    lastActiveDate: streakData.lastActiveDate ?? existing?.lastActiveDate,
    historyDates: Array.isArray(streakData.historyDates)
      ? streakData.historyDates
      : existing?.historyDates ?? [],
  };

  const parsedTeachers = parseEmailList(normalized).filter((t) => t !== cleanStudentEmail);
  const newNotifs: TeacherLinkNotification[] = parsedTeachers.map((tEmail) => ({
    id: `tlink_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    teacherEmail: tEmail,
    studentUid: user.uid,
    studentName: cleanName,
    studentEmail: cleanStudentEmail,
    createdAtMs: Date.now(),
    seenByUids: [],
  }));

  store.profiles[user.uid] = nextProfile;
  if (newNotifs.length > 0) {
    store.teacherNotifications = [...store.teacherNotifications, ...newNotifs].slice(-300);
  }
  saveStore(store);

  const serverRes = await postJson<{ sync?: Partial<PortalStoreState> }>(
    '/api/portal/link-teacher',
    {
      studentProfile: nextProfile,
      teacherEmail: normalized,
      notification: newNotifs[0],
      notifications: newNotifs,
    }
  );
  if (serverRes?.sync) applyServerSyncPayload(serverRes.sync);
}

export function subscribeTeacherLinkNotifications(
  userEmail: string | undefined,
  currentUid: string | undefined,
  onNewLinks: (notifications: TeacherLinkNotification[]) => void
): () => void {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  const emit = () => {
    if (!cleanEmail || !currentUid) return;
    const store = loadStore();
    const pending = store.teacherNotifications
      .filter(
        (n) =>
          n.teacherEmail.trim().toLowerCase() === cleanEmail &&
          n.studentUid !== currentUid &&
          !(n.seenByUids ?? []).includes(currentUid)
      )
      .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
    if (pending.length > 0) {
      onNewLinks(pending);
    }
  };
  emit();
  return subscribeStore(emit);
}

export async function markTeacherNotificationsSeen(ids: string[], uid: string): Promise<void> {
  if (!uid || ids.length === 0) return;
  const idSet = new Set(ids);
  const store = loadStore();
  store.teacherNotifications = store.teacherNotifications.map((n) => {
    if (!idSet.has(n.id)) return n;
    const seen = new Set(n.seenByUids ?? []);
    seen.add(uid);
    return { ...n, seenByUids: Array.from(seen) };
  });
  saveStore(store);
  await postJson('/api/portal/teacher-notifications/seen', { ids, uid });
}

export async function linkStudentEmailByTeacher(
  teacherEmail: string,
  studentEmail: string
): Promise<void> {
  const cleanTeacher = teacherEmail.trim().toLowerCase();
  const cleanStudent = studentEmail.trim().toLowerCase();
  if (!cleanStudent || !cleanStudent.includes('@')) {
    throw new Error('Please enter a valid student Gmail address.');
  }
  if (cleanStudent === cleanTeacher) {
    throw new Error('Please enter a student email different from your own.');
  }

  const serverRes = await postJson<{ sync?: Partial<PortalStoreState> }>(
    '/api/portal/link-student',
    { teacherEmail: cleanTeacher, studentEmail: cleanStudent }
  );

  if (serverRes?.sync) {
    applyServerSyncPayload(serverRes.sync);
    return;
  }

  const store = loadStore();
  const existing = Object.values(store.profiles).find(
    (p) => p.email.trim().toLowerCase() === cleanStudent
  );
  if (existing) {
    store.profiles[existing.uid] = { ...existing, teacherEmail: cleanTeacher };
  } else {
    const uid = makeUidFromEmail(cleanStudent);
    store.profiles[uid] = {
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
  saveStore(store);
}

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfileDoc | null) => void
): () => void {
  const emit = () => {
    const store = loadStore();
    onChange(store.profiles[uid] ?? null);
  };
  emit();
  return subscribeStore(emit);
}

export function subscribeMonitoredStudents(
  currentUser: PortalUser,
  isCreatorAdmin: boolean,
  onChange: (students: UserProfileDoc[]) => void
): () => void {
  const emit = () => {
    const store = loadStore();
    const myEmail = currentUser.email.trim().toLowerCase();
    const students = Object.values(store.profiles)
      .filter((prof) => {
        if (prof.uid === currentUser.uid) return false;
        if (isCreatorAdmin) return true;
        const linkedEmails = (prof.teacherEmail || '')
          .toLowerCase()
          .split(/[\s,;]+/)
          .filter(Boolean);
        return linkedEmails.includes(myEmail);
      })
      .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
    onChange(students);
  };
  emit();
  return subscribeStore(emit);
}

export function subscribeEvents(
  targetUid: string | null,
  onChange: (events: CalendarEvent[]) => void
): () => void {
  const emit = () => {
    if (!targetUid) {
      onChange([]);
      return;
    }
    const store = loadStore();
    onChange([...(store.eventsByUid[targetUid] ?? [])]);
  };
  emit();
  return subscribeStore(emit);
}

export async function saveEvent(ownerUid: string, event: CalendarEvent): Promise<void> {
  const store = loadStore();
  const list = [...(store.eventsByUid[ownerUid] ?? [])];
  const idx = list.findIndex((e) => e.id === event.id);
  if (idx >= 0) {
    list[idx] = { ...event };
  } else {
    list.push({ ...event });
  }
  store.eventsByUid[ownerUid] = list;
  saveStore(store);
  await postJson('/api/portal/event', { ownerUid, event });
}

export async function deleteEvent(ownerUid: string, eventId: string): Promise<void> {
  const store = loadStore();
  store.eventsByUid[ownerUid] = (store.eventsByUid[ownerUid] ?? []).filter((e) => e.id !== eventId);
  saveStore(store);
  try {
    await fetch(`/api/portal/event/${encodeURIComponent(ownerUid)}/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
    });
  } catch {
    // offline fallback already updated local state
  }
}

export async function verifyEventEvidence(
  studentUid: string,
  eventId: string,
  evidence: TaskEvidence
): Promise<void> {
  const store = loadStore();
  const list = [...(store.eventsByUid[studentUid] ?? [])];
  const idx = list.findIndex((e) => e.id === eventId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], evidence };
    store.eventsByUid[studentUid] = list;
    saveStore(store);
  }
  await postJson('/api/portal/event/verify', { studentUid, eventId, evidence });
}

export function subscribeTasks(
  targetUid: string | null,
  onChange: (tasks: UnscheduledTask[]) => void
): () => void {
  const emit = () => {
    if (!targetUid) {
      onChange([]);
      return;
    }
    const store = loadStore();
    onChange([...(store.tasksByUid[targetUid] ?? [])]);
  };
  emit();
  return subscribeStore(emit);
}

export async function saveTask(ownerUid: string, task: UnscheduledTask): Promise<void> {
  const store = loadStore();
  const list = [...(store.tasksByUid[ownerUid] ?? [])];
  const idx = list.findIndex((t) => t.id === task.id);
  if (idx >= 0) {
    list[idx] = { ...task };
  } else {
    list.push({ ...task });
  }
  store.tasksByUid[ownerUid] = list;
  saveStore(store);
  await postJson('/api/portal/task', { ownerUid, task });
}

export async function deleteTask(ownerUid: string, taskId: string): Promise<void> {
  const store = loadStore();
  store.tasksByUid[ownerUid] = (store.tasksByUid[ownerUid] ?? []).filter((t) => t.id !== taskId);
  saveStore(store);
  try {
    await fetch(`/api/portal/task/${encodeURIComponent(ownerUid)}/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
    });
  } catch {
    // offline fallback already updated local state
  }
}

export async function verifyTaskEvidence(
  studentUid: string,
  taskId: string,
  evidence: TaskEvidence
): Promise<void> {
  const store = loadStore();
  const list = [...(store.tasksByUid[studentUid] ?? [])];
  const idx = list.findIndex((t) => t.id === taskId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], evidence };
    store.tasksByUid[studentUid] = list;
    saveStore(store);
  }
  await postJson('/api/portal/task/verify', { studentUid, taskId, evidence });
}

export async function batchReorderAssignments(
  ownerUid: string,
  updates: { tasks: UnscheduledTask[]; events: CalendarEvent[] }
): Promise<void> {
  const store = loadStore();
  if (updates.tasks.length > 0) {
    const taskMap = new Map(updates.tasks.map((t) => [t.id, t]));
    store.tasksByUid[ownerUid] = (store.tasksByUid[ownerUid] ?? []).map(
      (existing) => taskMap.get(existing.id) ?? existing
    );
  }
  if (updates.events.length > 0) {
    const eventMap = new Map(updates.events.map((e) => [e.id, e]));
    store.eventsByUid[ownerUid] = (store.eventsByUid[ownerUid] ?? []).map(
      (existing) => eventMap.get(existing.id) ?? existing
    );
  }
  saveStore(store);
  await postJson('/api/portal/batch-reorder', {
    ownerUid,
    tasks: updates.tasks,
    events: updates.events,
  });
}

export function subscribeFeedbackMessages(
  currentUser: PortalUser,
  isCreator: boolean,
  onChange: (messages: FeedbackMessage[]) => void
): () => void {
  const myEmail = (currentUser.email || '').trim().toLowerCase();
  const creatorMode = isCreator || myEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
  const emit = () => {
    const store = loadStore();
    const list = store.feedbackMessages
      .filter(
        (m) =>
          creatorMode ||
          m.senderUid === currentUser.uid ||
          (myEmail && (m.senderEmail || '').trim().toLowerCase() === myEmail)
      )
      .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
    onChange(list);
  };
  emit();
  return subscribeStore(emit);
}

export async function sendFeedbackMessage(
  user: PortalUser,
  text: string,
  category: FeedbackCategory
): Promise<void> {
  const cleanText = text.trim().slice(0, 1000);
  if (!cleanText) return;
  const cleanEmail = user.email.trim().toLowerCase();
  const isFromCreator = cleanEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
  const store = loadStore();
  const msg: FeedbackMessage = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    senderUid: user.uid,
    senderName: user.displayName || cleanEmail.split('@')[0] || 'User',
    senderEmail: cleanEmail,
    senderPhotoUrl: user.photoURL,
    recipientEmail: CREATOR_ADMIN_EMAIL,
    category,
    text: cleanText,
    replies: [],
    seenByCreator: isFromCreator,
    seenBySender: true,
    createdAtMs: Date.now(),
  };
  store.feedbackMessages = [...store.feedbackMessages, msg];
  saveStore(store);
  const res = await postJson<{ sync?: Partial<PortalStoreState> }>('/api/portal/feedback', msg);
  if (res?.sync) applyServerSyncPayload(res.sync);
}

export async function replyToFeedbackMessage(
  messageId: string,
  replyText: string,
  authorEmail: string,
  opts?: {
    senderName?: string;
    senderUid?: string;
    isCreator?: boolean;
  }
): Promise<void> {
  const cleanReply = replyText.trim().slice(0, 1000);
  if (!cleanReply) return;

  const cleanAuthorEmail = authorEmail.trim().toLowerCase();
  const isCreator =
    typeof opts?.isCreator === 'boolean'
      ? opts.isCreator
      : cleanAuthorEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
  const authorName =
    (opts?.senderName || '').trim() ||
    (isCreator ? 'Creator (Nicole)' : cleanAuthorEmail.split('@')[0] || 'User');
  const now = Date.now();

  const newReply: FeedbackReply = {
    id: `fbr_${now}_${Math.random().toString(36).slice(2, 7)}`,
    senderUid: opts?.senderUid,
    senderName: authorName,
    senderEmail: cleanAuthorEmail,
    isCreator,
    text: cleanReply,
    createdAtMs: now,
  };

  const store = loadStore();
  store.feedbackMessages = store.feedbackMessages.map((m) => {
    if (m.id !== messageId) return m;
    const existingReplies: FeedbackReply[] = Array.isArray(m.replies)
      ? [...m.replies]
      : m.replyText
      ? [
          {
            id: `fbr_legacy_${m.id}`,
            senderName: 'Creator',
            senderEmail: m.replyByEmail || CREATOR_ADMIN_EMAIL,
            isCreator: true,
            text: m.replyText,
            createdAtMs: m.replyAtMs || m.createdAtMs || now - 1,
          },
        ]
      : [];

    existingReplies.push(newReply);

    return {
      ...m,
      replies: existingReplies,
      ...(isCreator
        ? {
            replyText: cleanReply,
            replyByEmail: cleanAuthorEmail,
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
  saveStore(store);

  const res = await postJson<{ sync?: Partial<PortalStoreState> }>('/api/portal/feedback/reply', {
    messageId,
    replyText: cleanReply,
    adminEmail: isCreator ? cleanAuthorEmail : undefined,
    senderEmail: cleanAuthorEmail,
    senderName: authorName,
    senderUid: opts?.senderUid,
    isCreator,
  });
  if (res?.sync) applyServerSyncPayload(res.sync);
}

export async function markFeedbackMessagesSeen(
  messageIds: string[],
  viewerEmail: string
): Promise<void> {
  const cleanViewer = viewerEmail.trim().toLowerCase();
  if (!cleanViewer || messageIds.length === 0) return;

  const idSet = new Set(messageIds);
  const viewerIsCreator = cleanViewer === CREATOR_ADMIN_EMAIL.toLowerCase();
  let changed = false;

  const store = loadStore();
  store.feedbackMessages = store.feedbackMessages.map((m) => {
    if (!idSet.has(m.id)) return m;
    if (viewerIsCreator && m.seenByCreator !== true) {
      changed = true;
      return { ...m, seenByCreator: true };
    }
    if (
      !viewerIsCreator &&
      (m.senderEmail || '').trim().toLowerCase() === cleanViewer &&
      m.seenBySender === false
    ) {
      changed = true;
      return { ...m, seenBySender: true };
    }
    return m;
  });

  if (changed) {
    saveStore(store);
    const res = await postJson<{ sync?: Partial<PortalStoreState> }>('/api/portal/feedback/seen', {
      messageIds,
      viewerEmail: cleanViewer,
    });
    if (res?.sync) applyServerSyncPayload(res.sync);
  }
}
