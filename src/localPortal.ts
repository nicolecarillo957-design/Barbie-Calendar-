import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  CalendarEvent,
  EventCategory,
  FeedbackCategory,
  FeedbackMessage,
  FeedbackReply,
  Priority,
  ReminderSetting,
  StudentStreakData,
  Subtask,
  TaskEvidence,
  TeacherLinkNotification,
  UnscheduledTask,
  UserProfileDoc,
  UserRole,
} from './types/calendar';
import { mapFirebaseAuthError } from './utils/passwordUtils';

export const CREATOR_ADMIN_EMAIL = 'nicolecarillo957@gmail.com';
const PORTAL_STORAGE_KEY = 'edutrack_local_portal_v1';

export interface PortalUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  authProvider?: 'portal' | 'google';
}

interface StoredAccount {
  user: PortalUser;
  password: string;
}

interface LocalPortalStore {
  currentUid: string | null;
  accounts: Record<string, StoredAccount>;
  profiles: Record<string, UserProfileDoc>;
  eventsByUid: Record<string, CalendarEvent[]>;
  tasksByUid: Record<string, UnscheduledTask[]>;
  feedbackMessages: FeedbackMessage[];
  teacherNotifications: TeacherLinkNotification[];
}

const VALID_CATEGORIES: EventCategory[] = [
  'deep_work',
  'meetings',
  'planning',
  'health',
  'personal',
  'admin',
];
const VALID_PRIORITIES: Priority[] = ['low', 'medium', 'high'];
const teacherEmailCache = new Map<string, string>();

// --- Utility Helpers ---

function normalizeEmail(raw?: string | null): string {
  return (raw || '').trim().toLowerCase().slice(0, 200);
}

function clampStr(raw: string | undefined | null, maxLen: number): string {
  return (raw ?? '').trim().slice(0, maxLen);
}

function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const num = typeof val === 'number' && Number.isFinite(val) ? Math.round(val) : fallback;
  return Math.max(min, Math.min(max, num));
}

function sanitizeId(raw: string | undefined | null, prefix: string): string {
  const cleaned = (raw ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 120);
  if (cleaned.length >= 1) return cleaned;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeDateKey(raw?: string): string {
  const trimmed = (raw ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed.slice(0, 20);
  return todayDateKey();
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

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Messenger|Instagram|Line\/|MicroMessenger|Twitter|LinkedInApp|Snapchat|Musical_ly|BytedanceWebview/i.test(
    ua
  );
}

function toPortalUser(fbUser: FirebaseUser | null): PortalUser | null {
  if (!fbUser || !fbUser.email) return null;
  return {
    uid: fbUser.uid,
    email: normalizeEmail(fbUser.email),
    displayName:
      clampStr(fbUser.displayName, 120) ||
      clampStr(fbUser.email.split('@')[0], 120) ||
      'Student',
    photoURL: fbUser.photoURL ? clampStr(fbUser.photoURL, 500) : undefined,
    authProvider: 'google',
  };
}

// --- Local + Server Portal Store (Instant Free Login & Cross-Device Sync) ---

function readPortalStore(): LocalPortalStore {
  try {
    const raw = localStorage.getItem(PORTAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalPortalStore>;
      return {
        currentUid: typeof parsed.currentUid === 'string' ? parsed.currentUid : null,
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
    console.warn('Failed reading local portal store:', err);
  }
  return {
    currentUid: null,
    accounts: {},
    profiles: {},
    eventsByUid: {},
    tasksByUid: {},
    feedbackMessages: [],
    teacherNotifications: [],
  };
}

let cachedStore: LocalPortalStore = readPortalStore();
const storeListeners = new Set<() => void>();
const authListeners = new Set<(user: PortalUser | null) => void>();
let currentFirebaseUser: FirebaseUser | null = auth.currentUser;
let firebaseAuthInitialized = false;

function notifyAllListeners(notifyAuth = false): void {
  storeListeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error('Portal store listener error:', err);
    }
  });
  if (notifyAuth) {
    const active = getCurrentPortalUser();
    authListeners.forEach((fn) => {
      try {
        fn(active);
      } catch (err) {
        console.error('Auth listener error:', err);
      }
    });
  }
}

function savePortalStore(next: LocalPortalStore, notifyAuth = false): void {
  cachedStore = next;
  try {
    localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('Could not persist portal store to localStorage:', err);
  }
  notifyAllListeners(notifyAuth);
}

interface SyncPayload {
  accounts?: Record<string, { user: PortalUser; hasPassword?: boolean }>;
  profiles?: Record<string, UserProfileDoc>;
  eventsByUid?: Record<string, CalendarEvent[]>;
  tasksByUid?: Record<string, UnscheduledTask[]>;
  feedbackMessages?: FeedbackMessage[];
  teacherNotifications?: TeacherLinkNotification[];
}

function applyServerSyncPayload(sync: SyncPayload | undefined | null): void {
  if (!sync) return;
  const cur = readPortalStore();

  const mergedAccounts: Record<string, StoredAccount> = { ...cur.accounts };
  if (sync.accounts) {
    for (const [uid, entry] of Object.entries(sync.accounts)) {
      if (!entry?.user) continue;
      mergedAccounts[uid] = {
        user: {
          ...entry.user,
          authProvider: mergedAccounts[uid]?.user?.authProvider || 'portal',
        },
        password: mergedAccounts[uid]?.password || (entry.hasPassword ? '__server__' : ''),
      };
    }
  }

  const mergedProfiles: Record<string, UserProfileDoc> = {
    ...cur.profiles,
    ...(sync.profiles ?? {}),
  };

  const mergedEvents: Record<string, CalendarEvent[]> = {
    ...cur.eventsByUid,
    ...(sync.eventsByUid ?? {}),
  };

  const mergedTasks: Record<string, UnscheduledTask[]> = {
    ...cur.tasksByUid,
    ...(sync.tasksByUid ?? {}),
  };

  const feedbackMap = new Map<string, FeedbackMessage>();
  for (const m of cur.feedbackMessages) {
    if (m?.id) feedbackMap.set(m.id, m);
  }
  for (const m of sync.feedbackMessages ?? []) {
    if (m?.id) feedbackMap.set(m.id, m);
  }

  const notifMap = new Map<string, TeacherLinkNotification>();
  for (const n of cur.teacherNotifications) {
    if (n?.id) notifMap.set(n.id, n);
  }
  for (const n of sync.teacherNotifications ?? []) {
    if (n?.id) notifMap.set(n.id, n);
  }

  savePortalStore(
    {
      currentUid: cur.currentUid,
      accounts: mergedAccounts,
      profiles: mergedProfiles,
      eventsByUid: mergedEvents,
      tasksByUid: mergedTasks,
      feedbackMessages: Array.from(feedbackMap.values()).sort(
        (a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0)
      ),
      teacherNotifications: Array.from(notifMap.values()).sort(
        (a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0)
      ),
    },
    false
  );
}

async function postJson<T = unknown>(
  url: string,
  body: Record<string, unknown>,
  throwOnError = false
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; sync?: SyncPayload } & T;
    if (!res.ok) {
      if (throwOnError) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return null;
    }
    if (data.sync) {
      applyServerSyncPayload(data.sync);
    }
    return data;
  } catch (err) {
    if (throwOnError) throw err;
    return null;
  }
}

async function deleteJson(url: string): Promise<void> {
  try {
    await fetch(url, { method: 'DELETE' });
  } catch {
    // non-fatal background server mirror
  }
}

export async function syncPortalNow(): Promise<void> {
  try {
    const res = await fetch('/api/portal/sync');
    if (res.ok) {
      const data = (await res.json()) as SyncPayload;
      applyServerSyncPayload(data);
    }
  } catch {
    // offline/static fallback safe
  }
}

// Background real-time WebSocket + SSE sync with server.ts
let transportStarted = false;
let portalWs: WebSocket | null = null;

function startPortalRealtimeTransport(): void {
  if (transportStarted || typeof window === 'undefined') return;
  transportStarted = true;

  void syncPortalNow();

  const connectWs = () => {
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/portal`);
      portalWs = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as { type?: string; sync?: SyncPayload };
          if (msg.type === 'sync' && msg.sync) {
            applyServerSyncPayload(msg.sync);
          }
        } catch {
          // ignore malformed packet
        }
      };
      ws.onclose = () => {
        portalWs = null;
        setTimeout(connectWs, 5000);
      };
      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // ignore if ws unsupported
    }
  };
  connectWs();

  try {
    const evtSource = new EventSource('/api/portal/stream');
    evtSource.addEventListener('sync', () => {
      void syncPortalNow();
    });
  } catch {
    // ignore SSE errors
  }

  window.addEventListener('storage', (e) => {
    if (e.key === PORTAL_STORAGE_KEY) {
      cachedStore = readPortalStore();
      notifyAllListeners(true);
    }
  });
}

startPortalRealtimeTransport();

// --- Auth Mode Detection ---

function isFirebaseSessionActive(): boolean {
  const fbUser = toPortalUser(currentFirebaseUser);
  if (!fbUser) return false;
  const store = cachedStore;
  // If user explicitly signed in with a portal email account while a stale FB user existed, honor currentUid
  if (store.currentUid && store.currentUid !== fbUser.uid && store.accounts[store.currentUid]) {
    return false;
  }
  return true;
}

export function getCurrentPortalUser(): PortalUser | null {
  const store = cachedStore;
  // 1. Explicit local/portal session takes priority if active
  if (store.currentUid && store.accounts[store.currentUid]?.user) {
    const u = store.accounts[store.currentUid].user;
    return {
      ...u,
      authProvider:
        currentFirebaseUser && currentFirebaseUser.uid === u.uid ? 'google' : u.authProvider || 'portal',
    };
  }
  // 2. Fallback to active Firebase Google session
  return toPortalUser(currentFirebaseUser);
}

export function listSavedPortalAccounts(): PortalUser[] {
  const store = cachedStore;
  return Object.values(store.accounts)
    .map((entry) => entry.user)
    .filter((u): u is PortalUser => Boolean(u && u.email))
    .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
}

export function hasAccountPassword(uid: string): boolean {
  const acc = cachedStore.accounts[uid];
  if (!acc) return false;
  return Boolean(acc.password && acc.password.length > 0);
}

export async function setOrUpdateAccountPassword(
  uid: string,
  newPassword: string,
  currentPassword?: string
): Promise<void> {
  const trimmed = newPassword.trim();
  if (trimmed.length < 4) {
    throw new Error('Password must be at least 4 characters.');
  }

  const store = readPortalStore();
  const existing = store.accounts[uid];
  if (!existing) {
    throw new Error('Account not found on this device.');
  }

  // Try server first if account exists there
  try {
    await postJson('/api/portal/password', { uid, newPassword: trimmed, currentPassword }, true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('Current password is incorrect')) {
      throw err;
    }
    // If server doesn't have it yet or offline, verify locally
    if (
      existing.password &&
      existing.password !== '__server__' &&
      currentPassword !== undefined &&
      existing.password !== currentPassword
    ) {
      throw new Error('Current password is incorrect.');
    }
  }

  store.accounts[uid] = {
    ...existing,
    password: trimmed,
  };
  savePortalStore(store, false);
}

// --- Registration, Login & Password Reset (Instant, Free, Zero Popup Restrictions) ---

export async function registerAccountFreely(params: {
  displayName: string;
  email: string;
  password: string;
}): Promise<PortalUser> {
  const cleanEmail = normalizeEmail(params.email);
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid Gmail or email address.');
  }
  const cleanPassword = params.password;
  if (!cleanPassword || cleanPassword.length < 4) {
    throw new Error('Please create a password of at least 4 characters.');
  }
  const cleanName =
    clampStr(params.displayName, 120) || clampStr(cleanEmail.split('@')[0], 120) || 'Student';

  let serverUser: PortalUser | null = null;
  try {
    const res = await postJson<{ user?: PortalUser }>(
      '/api/portal/register',
      { displayName: cleanName, email: cleanEmail, password: cleanPassword },
      true
    );
    if (res?.user) {
      serverUser = { ...res.user, authProvider: 'portal' };
    }
  } catch (err) {
    // Only rethrow real validation/conflict errors (not network errors)
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('already exists') || msg.includes('valid email') || msg.includes('at least')) {
      throw err;
    }
  }

  const store = readPortalStore();
  const existingLocal = Object.values(store.accounts).find(
    (a) => normalizeEmail(a.user.email) === cleanEmail
  );
  if (existingLocal && !serverUser) {
    throw new Error('An account with this email already exists. Switch to Sign In to continue!');
  }

  const uid = serverUser?.uid || makeUidFromEmail(cleanEmail);
  const newUser: PortalUser = serverUser || {
    uid,
    email: cleanEmail,
    displayName: cleanName,
    authProvider: 'portal',
  };

  store.accounts[uid] = { user: newUser, password: cleanPassword };
  if (!store.profiles[uid]) {
    store.profiles[uid] = {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      currentStreak: 0,
      bestStreak: 0,
      totalPoints: 0,
      historyDates: [],
    };
  }
  store.currentUid = uid;
  savePortalStore(store, true);
  return newUser;
}

export async function signInFreely(params: {
  email: string;
  password: string;
  displayNameIfNew?: string;
}): Promise<PortalUser> {
  const cleanEmail = normalizeEmail(params.email);
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid Gmail or email address.');
  }
  const cleanPassword = params.password;
  if (!cleanPassword) {
    throw new Error('Please enter your password.');
  }

  let serverUser: PortalUser | null = null;
  try {
    const res = await postJson<{ user?: PortalUser }>(
      '/api/portal/login',
      {
        email: cleanEmail,
        password: cleanPassword,
        displayNameIfNew: params.displayNameIfNew || '',
      },
      true
    );
    if (res?.user) {
      serverUser = { ...res.user, authProvider: 'portal' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (
      msg.includes('Incorrect password') ||
      msg.includes('valid email') ||
      msg.includes('Please use a password') ||
      msg.includes('Please enter your password')
    ) {
      throw err;
    }
  }

  const store = readPortalStore();
  const localMatch = Object.values(store.accounts).find(
    (a) => normalizeEmail(a.user.email) === cleanEmail
  );

  if (!serverUser && localMatch) {
    if (
      localMatch.password &&
      localMatch.password !== '__server__' &&
      localMatch.password !== cleanPassword
    ) {
      throw new Error('Incorrect password. Please try again or reset your password.');
    }
  }

  if (!serverUser && !localMatch && cleanPassword.length < 4) {
    throw new Error('Please use a password of at least 4 characters for your new account.');
  }

  const uid = serverUser?.uid || localMatch?.user.uid || makeUidFromEmail(cleanEmail);
  const displayName =
    serverUser?.displayName ||
    localMatch?.user.displayName ||
    clampStr(params.displayNameIfNew, 120) ||
    clampStr(cleanEmail.split('@')[0], 120) ||
    'Student';

  const portalUser: PortalUser = serverUser || {
    uid,
    email: cleanEmail,
    displayName,
    photoURL: localMatch?.user.photoURL,
    authProvider: 'portal',
  };

  store.accounts[uid] = { user: portalUser, password: cleanPassword };
  if (!store.profiles[uid]) {
    store.profiles[uid] = {
      uid,
      email: cleanEmail,
      displayName,
      currentStreak: 0,
      bestStreak: 0,
      totalPoints: 0,
      historyDates: [],
    };
  }
  store.currentUid = uid;
  savePortalStore(store, true);
  return portalUser;
}

export async function quickSignInWithSavedAccount(uid: string): Promise<PortalUser | null> {
  const store = readPortalStore();
  const entry = store.accounts[uid];
  if (!entry?.user) return null;
  const user: PortalUser = { ...entry.user, authProvider: 'portal' };
  store.currentUid = uid;
  savePortalStore(store, true);
  return user;
}

export async function resetLocalAccountPassword(email: string, newPassword: string): Promise<void> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter your account Gmail / email address.');
  }
  if (newPassword.length < 4) {
    throw new Error('New password must be at least 4 characters.');
  }

  let resetOnServer = false;
  try {
    await postJson('/api/portal/reset-password', { email: cleanEmail, newPassword }, true);
    resetOnServer = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('No account found') || msg.includes('at least')) {
      throw err;
    }
  }

  const store = readPortalStore();
  const localEntry = Object.values(store.accounts).find(
    (a) => normalizeEmail(a.user.email) === cleanEmail
  );
  if (!localEntry && !resetOnServer) {
    throw new Error('No account found for that email. Switch to Create Account to get started!');
  }
  if (localEntry) {
    store.accounts[localEntry.user.uid] = { ...localEntry, password: newPassword };
    savePortalStore(store, false);
  }
}

// --- Google Sign-In (Firebase Auth) ---

export async function signInWithGoogle(): Promise<PortalUser> {
  if (isInAppBrowser()) {
    throw new Error(
      'Google OAuth is blocked inside Messenger / in-app browsers. Sign in above with your Gmail & Password instead — it works instantly!'
    );
  }
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    const portalUser = toPortalUser(credential.user);
    if (!portalUser) {
      throw new Error('Could not read your Google email address. Please try again.');
    }
    currentFirebaseUser = credential.user;

    // Register user in local store + server mirror for cross-mode compatibility
    const store = readPortalStore();
    store.currentUid = portalUser.uid;
    store.accounts[portalUser.uid] = {
      user: portalUser,
      password: store.accounts[portalUser.uid]?.password || '',
    };
    savePortalStore(store, false);
    notifyAllListeners(true);
    return portalUser;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        'Google popup login is not enabled for this preview domain yet. Please sign in above using your Gmail & Password — all features work immediately!'
      );
    }
    if (code === 'auth/operation-not-supported-in-this-environment') {
      throw new Error(
        'Google popup login is not supported in this mobile/embedded browser. Sign in above using your Gmail & Password instead!'
      );
    }
    throw new Error(mapFirebaseAuthError(err));
  }
}

export function subscribeAuthState(callback: (user: PortalUser | null) => void): () => void {
  authListeners.add(callback);

  const unsubFb = onAuthStateChanged(auth, (fbUser) => {
    currentFirebaseUser = fbUser;
    firebaseAuthInitialized = true;
    callback(getCurrentPortalUser());
  });

  // Ensure portal-only users don't wait if Firebase Auth takes a moment or is offline
  if (cachedStore.currentUid && cachedStore.accounts[cachedStore.currentUid]?.user) {
    setTimeout(() => {
      if (!firebaseAuthInitialized) {
        callback(getCurrentPortalUser());
      }
    }, 50);
  }

  return () => {
    authListeners.delete(callback);
    unsubFb();
  };
}

export async function signOutUser(): Promise<void> {
  const store = readPortalStore();
  store.currentUid = null;
  savePortalStore(store, true);

  if (auth.currentUser) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    }
  }
  currentFirebaseUser = null;
  notifyAllListeners(true);
}

// --- Sanitizers & Document Converters (Aligned with firebase-blueprint.json) ---

function sanitizeEvidence(ev: TaskEvidence): TaskEvidence {
  const clean: TaskEvidence = {
    id: sanitizeId(ev.id, 'evid'),
    photoUrl: clampStr(ev.photoUrl, 450000),
    completedAt:
      clampStr(ev.completedAt || new Date().toISOString(), 64) || new Date().toISOString(),
    completedTimeFormatted: clampStr(ev.completedTimeFormatted || 'Just now', 100) || 'Just now',
    pointsEarned: clampInt(ev.pointsEarned, 0, 100, 5),
  };
  const notes = clampStr(ev.notes, 1000);
  if (notes) clean.notes = notes;
  const studentName = clampStr(ev.studentName, 120);
  if (studentName) clean.studentName = studentName;
  if (typeof ev.teacherVerified === 'boolean') clean.teacherVerified = ev.teacherVerified;
  const teacherFeedback = clampStr(ev.teacherFeedback, 1000);
  if (teacherFeedback) clean.teacherFeedback = teacherFeedback;
  return clean;
}

function sanitizeEventFields(
  event: CalendarEvent,
  ownerUid: string,
  teacherEmail?: string
): Record<string, unknown> {
  const cat = VALID_CATEGORIES.includes(event.category) ? event.category : 'deep_work';
  const prio = VALID_PRIORITIES.includes(event.priority) ? event.priority : 'medium';

  const payload: Record<string, unknown> = {
    title: clampStr(event.title, 200) || 'Untitled Block',
    category: cat,
    date: normalizeDateKey(event.date),
    startTime: clampStr(event.startTime, 10) || '09:00',
    endTime: clampStr(event.endTime, 10) || '10:00',
    isCompleted: Boolean(event.isCompleted),
    priority: prio,
  };

  const tEmail = normalizeEmail(teacherEmail ?? teacherEmailCache.get(ownerUid) ?? '');
  if (tEmail) payload.teacherEmail = tEmail;

  const subject = clampStr(event.subject, 80);
  if (subject) payload.subject = subject;
  const desc = clampStr(event.description, 2000);
  if (desc) payload.description = desc;
  const loc = clampStr(event.location, 200);
  if (loc) payload.location = loc;
  const meetingUrl = clampStr(event.meetingUrl, 500);
  if (meetingUrl) payload.meetingUrl = meetingUrl;
  const focusNotes = clampStr(event.focusNotes, 2000);
  if (focusNotes) payload.focusNotes = focusNotes;
  if (event.recurrence && ['none', 'daily', 'weekdays', 'weekly'].includes(event.recurrence)) {
    payload.recurrence = event.recurrence;
  }
  const sourceTaskId = clampStr(event.sourceTaskId, 128);
  if (sourceTaskId) payload.sourceTaskId = sourceTaskId;
  if (event.pointsValue !== undefined) {
    payload.pointsValue = clampInt(event.pointsValue, 0, 100, 5);
  }
  if (event.order !== undefined) {
    payload.order = clampInt(event.order, 0, 100000, 0);
  }
  if (Array.isArray(event.subtasks)) {
    payload.subtasks = event.subtasks.slice(0, 30).map((st: Subtask) => ({
      id: sanitizeId(st.id, 'sub'),
      text: clampStr(st.text, 200) || 'Subtask',
      completed: Boolean(st.completed),
    }));
  }
  if (Array.isArray(event.reminders)) {
    payload.reminders = event.reminders.slice(0, 10).map((rem: ReminderSetting) => ({
      id: sanitizeId(rem.id, 'rem'),
      minutesBefore: clampInt(rem.minutesBefore, 0, 10080, 15),
      ...(rem.label ? { label: clampStr(rem.label, 80) } : {}),
    }));
  }
  if (event.evidence && event.evidence.photoUrl) {
    payload.evidence = sanitizeEvidence(event.evidence);
  }

  return payload;
}

function sanitizeTaskFields(
  task: UnscheduledTask,
  ownerUid: string,
  teacherEmail?: string
): Record<string, unknown> {
  const cat = VALID_CATEGORIES.includes(task.category) ? task.category : 'deep_work';
  const prio = VALID_PRIORITIES.includes(task.priority) ? task.priority : 'medium';

  const payload: Record<string, unknown> = {
    title: clampStr(task.title, 200) || 'Untitled Task',
    category: cat,
    estimatedMinutes: clampInt(task.estimatedMinutes, 1, 1440, 30),
    priority: prio,
    completed: Boolean(task.completed),
  };

  const tEmail = normalizeEmail(teacherEmail ?? teacherEmailCache.get(ownerUid) ?? '');
  if (tEmail) payload.teacherEmail = tEmail;

  const subject = clampStr(task.subject, 80);
  if (subject) payload.subject = subject;
  const dueDate = clampStr(task.dueDate, 20);
  if (dueDate) payload.dueDate = dueDate;
  const dueTime = clampStr(task.dueTime, 10);
  if (dueTime) payload.dueTime = dueTime;
  const desc = clampStr(task.description, 2000);
  if (desc) payload.description = desc;
  if (task.reminderMinutesBefore !== undefined) {
    payload.reminderMinutesBefore = clampInt(task.reminderMinutesBefore, 0, 10080, 15);
  }
  const reminderTime = clampStr(task.reminderTime, 64);
  if (reminderTime) payload.reminderTime = reminderTime;
  if (task.pointsValue !== undefined) {
    payload.pointsValue = clampInt(task.pointsValue, 0, 100, 5);
  }
  if (task.order !== undefined) {
    payload.order = clampInt(task.order, 0, 100000, 0);
  }
  if (task.evidence && task.evidence.photoUrl) {
    payload.evidence = sanitizeEvidence(task.evidence);
  }

  return payload;
}

async function resolveOwnerTeacherEmail(ownerUid: string): Promise<string> {
  if (teacherEmailCache.has(ownerUid)) {
    return teacherEmailCache.get(ownerUid) || '';
  }
  const localProfile = cachedStore.profiles[ownerUid];
  if (localProfile?.teacherEmail !== undefined) {
    const tEmail = normalizeEmail(localProfile.teacherEmail);
    teacherEmailCache.set(ownerUid, tEmail);
    return tEmail;
  }
  if (isFirebaseSessionActive()) {
    try {
      const snap = await getDoc(doc(db, 'users', ownerUid));
      if (snap.exists()) {
        const tEmail = normalizeEmail(snap.data()?.teacherEmail as string | undefined);
        teacherEmailCache.set(ownerUid, tEmail);
        return tEmail;
      }
    } catch {
      // non-fatal lookup
    }
  }
  return '';
}

function docToUserProfile(raw: Record<string, unknown>, uid: string): UserProfileDoc {
  const email = normalizeEmail(raw.email as string);
  const tEmail = normalizeEmail(raw.teacherEmail as string);
  if (tEmail || raw.teacherEmail === '') {
    teacherEmailCache.set(uid, tEmail);
  }
  return {
    uid: (raw.uid as string) || uid,
    email,
    displayName: clampStr(raw.displayName as string, 120) || email.split('@')[0] || 'Student',
    photoURL: typeof raw.photoURL === 'string' && raw.photoURL ? raw.photoURL : undefined,
    role: raw.role === 'teacher' || raw.role === 'student' ? raw.role : undefined,
    teacherEmail: tEmail || undefined,
    currentStreak: clampInt(raw.currentStreak, 0, 10000, 0),
    bestStreak: clampInt(raw.bestStreak, 0, 10000, 0),
    totalPoints: clampInt(raw.totalPoints, 0, 10000000, 0),
    lastActiveDate: typeof raw.lastActiveDate === 'string' ? raw.lastActiveDate : undefined,
    historyDates: Array.isArray(raw.historyDates)
      ? raw.historyDates.filter((d): d is string => typeof d === 'string').slice(0, 365)
      : [],
  };
}

function docToCalendarEvent(raw: Record<string, unknown>, id: string): CalendarEvent {
  return {
    id: (raw.id as string) || id,
    title: clampStr(raw.title as string, 200) || 'Untitled Block',
    subject: typeof raw.subject === 'string' ? raw.subject : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    category: VALID_CATEGORIES.includes(raw.category as EventCategory)
      ? (raw.category as EventCategory)
      : 'deep_work',
    date: normalizeDateKey(raw.date as string | undefined),
    startTime: clampStr(raw.startTime as string, 10) || '09:00',
    endTime: clampStr(raw.endTime as string, 10) || '10:00',
    isCompleted: Boolean(raw.isCompleted),
    priority: VALID_PRIORITIES.includes(raw.priority as Priority)
      ? (raw.priority as Priority)
      : 'medium',
    location: typeof raw.location === 'string' ? raw.location : undefined,
    meetingUrl: typeof raw.meetingUrl === 'string' ? raw.meetingUrl : undefined,
    focusNotes: typeof raw.focusNotes === 'string' ? raw.focusNotes : undefined,
    recurrence:
      typeof raw.recurrence === 'string'
        ? (raw.recurrence as CalendarEvent['recurrence'])
        : undefined,
    sourceTaskId: typeof raw.sourceTaskId === 'string' ? raw.sourceTaskId : undefined,
    pointsValue: typeof raw.pointsValue === 'number' ? raw.pointsValue : undefined,
    order: typeof raw.order === 'number' ? raw.order : undefined,
    subtasks: Array.isArray(raw.subtasks) ? (raw.subtasks as Subtask[]) : undefined,
    reminders: Array.isArray(raw.reminders) ? (raw.reminders as ReminderSetting[]) : undefined,
    evidence:
      raw.evidence && typeof raw.evidence === 'object'
        ? (raw.evidence as TaskEvidence)
        : undefined,
  };
}

function docToUnscheduledTask(raw: Record<string, unknown>, id: string): UnscheduledTask {
  return {
    id: (raw.id as string) || id,
    title: clampStr(raw.title as string, 200) || 'Untitled Task',
    subject: typeof raw.subject === 'string' ? raw.subject : undefined,
    category: VALID_CATEGORIES.includes(raw.category as EventCategory)
      ? (raw.category as EventCategory)
      : 'deep_work',
    estimatedMinutes: clampInt(raw.estimatedMinutes, 1, 1440, 30),
    priority: VALID_PRIORITIES.includes(raw.priority as Priority)
      ? (raw.priority as Priority)
      : 'medium',
    completed: Boolean(raw.completed),
    dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : undefined,
    dueTime: typeof raw.dueTime === 'string' ? raw.dueTime : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    reminderMinutesBefore:
      typeof raw.reminderMinutesBefore === 'number' ? raw.reminderMinutesBefore : undefined,
    reminderTime: typeof raw.reminderTime === 'string' ? raw.reminderTime : undefined,
    pointsValue: typeof raw.pointsValue === 'number' ? raw.pointsValue : undefined,
    order: typeof raw.order === 'number' ? raw.order : undefined,
    evidence:
      raw.evidence && typeof raw.evidence === 'object'
        ? (raw.evidence as TaskEvidence)
        : undefined,
  };
}

function docToFeedbackMessage(raw: Record<string, unknown>, id: string): FeedbackMessage {
  const createdTs = raw.createdAt as { toMillis?: () => number } | undefined;
  const fallbackCreatedMs =
    typeof raw.createdAtMs === 'number'
      ? raw.createdAtMs
      : typeof createdTs?.toMillis === 'function'
      ? createdTs.toMillis()
      : Date.now();

  return {
    id: (raw.id as string) || id,
    senderUid: clampStr(raw.senderUid as string, 128),
    senderName: clampStr(raw.senderName as string, 120) || 'User',
    senderEmail: normalizeEmail(raw.senderEmail as string),
    senderPhotoUrl: typeof raw.senderPhotoUrl === 'string' ? raw.senderPhotoUrl : undefined,
    recipientEmail: normalizeEmail(raw.recipientEmail as string),
    category: ['feedback', 'idea', 'bug', 'praise'].includes(raw.category as string)
      ? (raw.category as FeedbackCategory)
      : 'feedback',
    text: clampStr(raw.text as string, 1000),
    replyText: typeof raw.replyText === 'string' ? raw.replyText : undefined,
    replyByEmail: typeof raw.replyByEmail === 'string' ? raw.replyByEmail : undefined,
    replyAtMs: typeof raw.replyAtMs === 'number' ? raw.replyAtMs : undefined,
    replies: Array.isArray(raw.replies) ? (raw.replies as FeedbackReply[]) : [],
    seenByCreator: typeof raw.seenByCreator === 'boolean' ? raw.seenByCreator : undefined,
    seenBySender: typeof raw.seenBySender === 'boolean' ? raw.seenBySender : undefined,
    createdAtMs: fallbackCreatedMs,
  };
}

// --- User Profile & Role Operations ---

export async function ensureUserProfile(user: PortalUser): Promise<void> {
  const cleanEmail = normalizeEmail(user.email);
  const cleanName =
    clampStr(user.displayName, 120) || clampStr(cleanEmail.split('@')[0], 120) || 'Student';

  const store = readPortalStore();
  if (!store.profiles[user.uid]) {
    const starterProfile: UserProfileDoc = {
      uid: user.uid,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: user.photoURL ? clampStr(user.photoURL, 500) : undefined,
      currentStreak: 0,
      bestStreak: 0,
      totalPoints: 0,
      historyDates: [],
    };
    store.profiles[user.uid] = starterProfile;
    savePortalStore(store, false);
    void postJson('/api/portal/profile', starterProfile as unknown as Record<string, unknown>);
  }

  if (isFirebaseSessionActive() && auth.currentUser) {
    const path = `users/${user.uid}`;
    const ref = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const starter: Record<string, unknown> = {
          uid: user.uid,
          email: normalizeEmail(auth.currentUser.email || cleanEmail),
          displayName: cleanName,
          currentStreak: 0,
          bestStreak: 0,
          totalPoints: 0,
          historyDates: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (user.photoURL) {
          starter.photoURL = clampStr(user.photoURL, 500);
        }
        await setDoc(ref, starter);
      } else {
        const tEmail = normalizeEmail(snap.data()?.teacherEmail as string | undefined);
        teacherEmailCache.set(user.uid, tEmail);
      }
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (loggedErr) {
        console.warn('Firestore profile bootstrap warning (portal cache active):', loggedErr);
      }
    }
  }
}

export async function syncUserProfile(
  user: PortalUser,
  streakData: StudentStreakData,
  displayNameOverride?: string,
  teacherEmail?: string,
  role?: UserRole
): Promise<void> {
  const cleanEmail = normalizeEmail(user.email);
  const cleanHistory = Array.isArray(streakData.historyDates)
    ? streakData.historyDates
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
        .map((d) => clampStr(d, 20))
        .slice(-365)
    : [];

  const store = readPortalStore();
  const prevProfile = store.profiles[user.uid];
  const cleanName =
    clampStr(
      displayNameOverride ||
        prevProfile?.displayName ||
        user.displayName ||
        cleanEmail.split('@')[0],
      120
    ) || 'Student';

  const resolvedTeacherEmail =
    teacherEmail !== undefined ? normalizeEmail(teacherEmail) : prevProfile?.teacherEmail || '';
  if (resolvedTeacherEmail) {
    teacherEmailCache.set(user.uid, resolvedTeacherEmail);
  }

  const nextProfile: UserProfileDoc = {
    uid: user.uid,
    email: cleanEmail,
    displayName: cleanName,
    photoURL: user.photoURL || prevProfile?.photoURL,
    role: role !== undefined ? role : prevProfile?.role,
    teacherEmail: resolvedTeacherEmail || undefined,
    currentStreak: clampInt(streakData.currentStreak, 0, 10000, 0),
    bestStreak: clampInt(streakData.bestStreak, 0, 10000, 0),
    totalPoints: clampInt(streakData.totalPoints, 0, 10000000, 0),
    lastActiveDate: clampStr(streakData.lastActiveDate ?? prevProfile?.lastActiveDate, 20) || undefined,
    historyDates: cleanHistory,
  };

  store.profiles[user.uid] = nextProfile;
  if (store.accounts[user.uid]) {
    store.accounts[user.uid].user.displayName = cleanName;
  }
  savePortalStore(store, false);
  void postJson('/api/portal/profile', nextProfile as unknown as Record<string, unknown>);

  if (isFirebaseSessionActive() && auth.currentUser) {
    const path = `users/${user.uid}`;
    const ref = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(ref);
      const existingData = snap.exists() ? snap.data() : undefined;

      const updatePayload: Record<string, unknown> = {
        displayName: cleanName,
        currentStreak: nextProfile.currentStreak,
        bestStreak: nextProfile.bestStreak,
        totalPoints: nextProfile.totalPoints,
        historyDates: cleanHistory,
        updatedAt: serverTimestamp(),
      };

      if (nextProfile.photoURL) {
        updatePayload.photoURL = clampStr(nextProfile.photoURL, 500);
      }

      if (nextProfile.role === 'student' || nextProfile.role === 'teacher') {
        updatePayload.role = nextProfile.role;
      } else if (existingData?.role === 'student' || existingData?.role === 'teacher') {
        updatePayload.role = existingData.role;
      }

      if (teacherEmail !== undefined) {
        updatePayload.teacherEmail = normalizeEmail(teacherEmail);
      } else if (typeof existingData?.teacherEmail === 'string') {
        updatePayload.teacherEmail = normalizeEmail(existingData.teacherEmail);
      }

      if (nextProfile.lastActiveDate) {
        updatePayload.lastActiveDate = nextProfile.lastActiveDate;
      }

      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          email: normalizeEmail(auth.currentUser.email || cleanEmail),
          ...updatePayload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, updatePayload);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
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
  const normalized = normalizeEmail(teacherEmail);
  if (normalized && !normalized.includes('@')) {
    throw new Error('Please enter a valid teacher Gmail address.');
  }
  const cleanStudentEmail = normalizeEmail(user.email);
  if (normalized && normalized === cleanStudentEmail) {
    throw new Error('Please enter your teacher’s Gmail rather than your own email.');
  }

  await syncUserProfile(user, streakData, studentName, normalized);
  teacherEmailCache.set(user.uid, normalized);

  // Update local/server teacherEmail + trigger teacher notification immediately
  const store = readPortalStore();
  const notifId = sanitizeId(
    `tlink_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    'tlink'
  );
  const cleanName = clampStr(studentName || user.displayName, 120) || 'Student';
  const notifObj: TeacherLinkNotification | undefined = normalized
    ? {
        id: notifId,
        teacherEmail: normalized,
        studentUid: user.uid,
        studentName: cleanName,
        studentEmail: cleanStudentEmail,
        createdAtMs: Date.now(),
        seenByTeacher: false,
        seenByUids: [],
      }
    : undefined;

  if (notifObj) {
    store.teacherNotifications.push(notifObj);
    if (store.teacherNotifications.length > 300) {
      store.teacherNotifications = store.teacherNotifications.slice(-300);
    }
    savePortalStore(store, false);
  }

  const studentProfile = store.profiles[user.uid] || {
    uid: user.uid,
    email: cleanStudentEmail,
    displayName: cleanName,
    teacherEmail: normalized,
    ...streakData,
  };

  void postJson('/api/portal/link-teacher', {
    studentProfile,
    teacherEmail: normalized,
    ...(notifObj ? { notification: notifObj } : {}),
  });

  if (isFirebaseSessionActive() && auth.currentUser) {
    try {
      const [evSnap, taskSnap] = await Promise.all([
        getDocs(query(collection(db, 'users', user.uid, 'events'), where('ownerUid', '==', user.uid))),
        getDocs(query(collection(db, 'users', user.uid, 'tasks'), where('ownerUid', '==', user.uid))),
      ]);

      const refs = [...evSnap.docs.map((d) => d.ref), ...taskSnap.docs.map((d) => d.ref)];
      for (let i = 0; i < refs.length; i += 400) {
        const batch = writeBatch(db);
        refs.slice(i, i + 400).forEach((ref) => {
          batch.update(ref, { teacherEmail: normalized, updatedAt: serverTimestamp() });
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/events`);
    }

    if (notifObj) {
      const notifPath = `teacher_notifications/${notifId}`;
      try {
        await setDoc(doc(db, 'teacher_notifications', notifId), {
          id: notifId,
          teacherEmail: normalized,
          studentUid: user.uid,
          studentName: cleanName,
          studentEmail: cleanStudentEmail,
          createdAtMs: notifObj.createdAtMs,
          seenByTeacher: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, notifPath);
      }
    }
  }
}

export async function linkStudentEmailByTeacher(
  teacherEmail: string,
  studentEmail: string
): Promise<void> {
  const cleanTeacher = normalizeEmail(teacherEmail);
  const cleanStudent = normalizeEmail(studentEmail);
  if (!cleanStudent || !cleanStudent.includes('@')) {
    throw new Error('Please enter a valid student Gmail address.');
  }
  if (cleanStudent === cleanTeacher) {
    throw new Error('Please enter a student email different from your own.');
  }

  // Always update portal server & local cache first so teachers can link students seamlessly
  await postJson('/api/portal/link-student', { teacherEmail: cleanTeacher, studentEmail: cleanStudent }, true);

  if (isFirebaseSessionActive() && auth.currentUser) {
    const viewerIsAdmin =
      normalizeEmail(auth.currentUser.email) === CREATOR_ADMIN_EMAIL.toLowerCase();
    if (viewerIsAdmin) {
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('email', '==', cleanStudent))
        );
        if (!snap.empty) {
          await updateDoc(snap.docs[0].ref, {
            teacherEmail: cleanTeacher,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        if (error instanceof Error && !error.message.includes('Missing or insufficient permissions')) {
          throw error;
        }
        handleFirestoreError(error, OperationType.UPDATE, 'users');
      }
    }
  }
}

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfileDoc | null) => void
): () => void {
  const emitFromPortal = () => {
    const prof = cachedStore.profiles[uid] || null;
    onChange(prof);
  };

  if (isFirebaseSessionActive() && auth.currentUser && auth.currentUser.uid === uid) {
    const path = `users/${uid}`;
    let hasReceivedSnapshot = false;

    const fallbackTimer = setTimeout(() => {
      if (!hasReceivedSnapshot) {
        emitFromPortal();
      }
    }, 2000);

    const unsubFb = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        hasReceivedSnapshot = true;
        clearTimeout(fallbackTimer);
        if (!snap.exists()) {
          emitFromPortal();
          return;
        }
        const profile = docToUserProfile(snap.data() as Record<string, unknown>, snap.id);
        onChange(profile);
      },
      (error) => {
        hasReceivedSnapshot = true;
        clearTimeout(fallbackTimer);
        emitFromPortal();
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch (logged) {
          console.warn('Firestore profile snapshot error:', logged);
        }
      }
    );
    return () => {
      clearTimeout(fallbackTimer);
      unsubFb();
    };
  }

  emitFromPortal();
  const listener = () => emitFromPortal();
  storeListeners.add(listener);
  return () => storeListeners.delete(listener);
}

export function subscribeMonitoredStudents(
  currentUser: PortalUser,
  isCreatorAdmin: boolean,
  onChange: (students: UserProfileDoc[]) => void
): () => void {
  const myEmail = normalizeEmail(currentUser.email);

  const filterPortalStudents = (): UserProfileDoc[] =>
    Object.values(cachedStore.profiles)
      .filter((prof) => {
        if (!prof || prof.uid === currentUser.uid) return false;
        if (isCreatorAdmin) return true;
        return parseEmailList(prof.teacherEmail).includes(myEmail);
      })
      .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));

  if (isFirebaseSessionActive() && auth.currentUser) {
    const q = isCreatorAdmin
      ? collection(db, 'users')
      : query(collection(db, 'users'), where('teacherEmail', '==', myEmail));

    let firestoreList: UserProfileDoc[] = [];

    const emitMerged = () => {
      const merged = new Map<string, UserProfileDoc>();
      filterPortalStudents().forEach((s) => merged.set(s.uid, s));
      firestoreList.forEach((s) => merged.set(s.uid, s));
      onChange(
        Array.from(merged.values())
          .filter((p) => p.uid !== currentUser.uid)
          .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email))
      );
    };

    const unsubFb = onSnapshot(
      q,
      (snap) => {
        firestoreList = snap.docs
          .map((d) => docToUserProfile(d.data() as Record<string, unknown>, d.id))
          .filter((prof) => prof.uid !== currentUser.uid);
        emitMerged();
      },
      (error) => {
        emitMerged();
        try {
          handleFirestoreError(error, OperationType.LIST, 'users');
        } catch (logged) {
          console.warn('Firestore monitored students warning:', logged);
        }
      }
    );

    const storeFn = () => emitMerged();
    storeListeners.add(storeFn);
    return () => {
      unsubFb();
      storeListeners.delete(storeFn);
    };
  }

  onChange(filterPortalStudents());
  const fn = () => onChange(filterPortalStudents());
  storeListeners.add(fn);
  return () => storeListeners.delete(fn);
}

// --- Teacher Link Notifications ---

export function subscribeTeacherLinkNotifications(
  userEmail: string | undefined,
  currentUid: string | undefined,
  onNewLinks: (notifications: TeacherLinkNotification[]) => void
): () => void {
  const cleanEmail = normalizeEmail(userEmail);
  if (!cleanEmail || !currentUid) return () => {};

  const getPortalPending = (): TeacherLinkNotification[] =>
    cachedStore.teacherNotifications
      .filter(
        (n) =>
          normalizeEmail(n.teacherEmail) === cleanEmail &&
          n.studentUid !== currentUid &&
          n.seenByTeacher !== true &&
          !(n.seenByUids ?? []).includes(currentUid)
      )
      .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));

  if (isFirebaseSessionActive() && auth.currentUser) {
    const q = query(
      collection(db, 'teacher_notifications'),
      where('teacherEmail', '==', cleanEmail)
    );

    let fbPending: TeacherLinkNotification[] = [];
    const emitMerged = () => {
      const merged = new Map<string, TeacherLinkNotification>();
      getPortalPending().forEach((n) => merged.set(n.id, n));
      fbPending.forEach((n) => merged.set(n.id, n));
      const list = Array.from(merged.values()).sort(
        (a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0)
      );
      if (list.length > 0) onNewLinks(list);
    };

    const unsubFb = onSnapshot(
      q,
      (snap) => {
        fbPending = snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: (data.id as string) || d.id,
              teacherEmail: normalizeEmail(data.teacherEmail as string),
              studentUid: clampStr(data.studentUid as string, 128),
              studentName: clampStr(data.studentName as string, 120) || 'Student',
              studentEmail: normalizeEmail(data.studentEmail as string),
              createdAtMs: typeof data.createdAtMs === 'number' ? data.createdAtMs : Date.now(),
              seenByTeacher: Boolean(data.seenByTeacher),
            } as TeacherLinkNotification;
          })
          .filter((n) => n.seenByTeacher !== true && n.studentUid !== currentUid);
        emitMerged();
      },
      (error) => {
        emitMerged();
        try {
          handleFirestoreError(error, OperationType.LIST, 'teacher_notifications');
        } catch (logged) {
          console.warn('Firestore teacher notifications warning:', logged);
        }
      }
    );

    const storeFn = () => emitMerged();
    storeListeners.add(storeFn);
    return () => {
      unsubFb();
      storeListeners.delete(storeFn);
    };
  }

  const checkPortal = () => {
    const pending = getPortalPending();
    if (pending.length > 0) onNewLinks(pending);
  };
  checkPortal();
  storeListeners.add(checkPortal);
  return () => storeListeners.delete(checkPortal);
}

export async function markTeacherNotificationsSeen(ids: string[], uid: string): Promise<void> {
  if (!uid || ids.length === 0) return;
  const idSet = new Set(ids);

  const store = readPortalStore();
  store.teacherNotifications = store.teacherNotifications.map((n) => {
    if (!idSet.has(n.id)) return n;
    const seen = new Set(n.seenByUids ?? []);
    seen.add(uid);
    return { ...n, seenByTeacher: true, seenByUids: Array.from(seen) };
  });
  savePortalStore(store, false);
  void postJson('/api/portal/teacher-notifications/seen', { ids, uid });

  if (isFirebaseSessionActive() && auth.currentUser) {
    try {
      const batch = writeBatch(db);
      ids.forEach((rawId) => {
        const cleanId = sanitizeId(rawId, 'tlink');
        batch.update(doc(db, 'teacher_notifications', cleanId), {
          seenByTeacher: true,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, 'teacher_notifications');
      } catch (logged) {
        console.warn('Firestore mark seen warning:', logged);
      }
    }
  }
}

// --- Calendar Events ---

export function subscribeEvents(
  targetUid: string | null,
  onChange: (events: CalendarEvent[]) => void
): () => void {
  if (!targetUid) {
    onChange([]);
    return () => {};
  }

  const emitPortal = () => {
    onChange([...(cachedStore.eventsByUid[targetUid] ?? [])]);
  };

  if (isFirebaseSessionActive() && auth.currentUser) {
    const fbUser = auth.currentUser;
    const myEmail = normalizeEmail(fbUser.email);
    const isCreatorAdmin = myEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
    const baseCol = collection(db, 'users', targetUid, 'events');
    const q = isCreatorAdmin
      ? baseCol
      : targetUid === fbUser.uid
      ? query(baseCol, where('ownerUid', '==', fbUser.uid))
      : query(baseCol, where('teacherEmail', '==', myEmail));

    const unsubFb = onSnapshot(
      q,
      (snap) => {
        const fbEvents = snap.docs.map((d) =>
          docToCalendarEvent(d.data() as Record<string, unknown>, d.id)
        );
        if (fbEvents.length > 0 || (cachedStore.eventsByUid[targetUid] ?? []).length === 0) {
          onChange(fbEvents);
        } else {
          emitPortal();
        }
      },
      (error) => {
        emitPortal();
        try {
          handleFirestoreError(error, OperationType.LIST, `users/${targetUid}/events`);
        } catch (logged) {
          console.warn('Firestore events listener warning:', logged);
        }
      }
    );

    const storeFn = () => {
      if (targetUid !== fbUser.uid) {
        const currentPortal = cachedStore.eventsByUid[targetUid] ?? [];
        if (currentPortal.length > 0) emitPortal();
      }
    };
    storeListeners.add(storeFn);
    return () => {
      unsubFb();
      storeListeners.delete(storeFn);
    };
  }

  emitPortal();
  const fn = () => emitPortal();
  storeListeners.add(fn);
  return () => storeListeners.delete(fn);
}

export async function saveEvent(ownerUid: string, event: CalendarEvent): Promise<void> {
  const eventId = sanitizeId(event.id, 'evt');
  const tEmail = await resolveOwnerTeacherEmail(ownerUid);
  const fields = sanitizeEventFields(event, ownerUid, tEmail);
  const cleanEvent = docToCalendarEvent({ ...fields, id: eventId }, eventId);

  const store = readPortalStore();
  const list = [...(store.eventsByUid[ownerUid] ?? [])];
  const idx = list.findIndex((e) => e.id === eventId);
  if (idx >= 0) list[idx] = cleanEvent;
  else list.push(cleanEvent);
  store.eventsByUid[ownerUid] = list;
  savePortalStore(store, false);
  void postJson('/api/portal/event', { ownerUid, event: cleanEvent });

  if (isFirebaseSessionActive() && auth.currentUser) {
    const path = `users/${ownerUid}/events/${eventId}`;
    const ref = doc(db, 'users', ownerUid, 'events', eventId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: eventId,
          ownerUid,
          ...fields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          ...fields,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function deleteEvent(ownerUid: string, eventId: string): Promise<void> {
  const cleanId = sanitizeId(eventId, 'evt');
  const store = readPortalStore();
  store.eventsByUid[ownerUid] = (store.eventsByUid[ownerUid] ?? []).filter((e) => e.id !== cleanId);
  savePortalStore(store, false);
  void deleteJson(`/api/portal/event/${encodeURIComponent(ownerUid)}/${encodeURIComponent(cleanId)}`);

  if (isFirebaseSessionActive() && auth.currentUser) {
    const path = `users/${ownerUid}/events/${cleanId}`;
    try {
      await deleteDoc(doc(db, 'users', ownerUid, 'events', cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

export async function verifyEventEvidence(
  studentUid: string,
  eventId: string,
  evidence: TaskEvidence
): Promise<void> {
  const cleanId = sanitizeId(eventId, 'evt');
  const cleanEv = sanitizeEvidence(evidence);

  const store = readPortalStore();
  store.eventsByUid[studentUid] = (store.eventsByUid[studentUid] ?? []).map((e) =>
    e.id === cleanId ? { ...e, evidence: cleanEv } : e
  );
  savePortalStore(store, false);
  void postJson('/api/portal/event/verify', { studentUid, eventId: cleanId, evidence: cleanEv });

  if (isFirebaseSessionActive() && auth.currentUser) {
    const path = `users/${studentUid}/events/${cleanId}`;
    try {
      await updateDoc(doc(db, 'users', studentUid, 'events', cleanId), {
        evidence: cleanEv,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, path);
      } catch (logged) {
        console.warn('Firestore verify event fallback:', logged);
      }
    }
  }
}

// --- Backlog Tasks ---

export function subscribeTasks(
  targetUid: string | null,
  onChange: (tasks: UnscheduledTask[]) => void
): () => void {
  if (!targetUid) {
    onChange([]);
    return () => {};
  }

  const emitPortal = () => {
    onChange([...(cachedStore.tasksByUid[targetUid] ?? [])]);
  };

  if (isFirebaseSessionActive() && auth.currentUser) {
    const fbUser = auth.currentUser;
    const myEmail = normalizeEmail(fbUser.email);
    const isCreatorAdmin = myEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
    const baseCol = collection(db, 'users', targetUid, 'tasks');
    const q = isCreatorAdmin
      ? baseCol
      : targetUid === fbUser.uid
      ? query(baseCol, where('ownerUid', '==', fbUser.uid))
      : query(baseCol, where('teacherEmail', '==', myEmail));

    const unsubFb = onSnapshot(
      q,
      (snap) => {
        const fbTasks = snap.docs.map((d) =>
          docToUnscheduledTask(d.data() as Record<string, unknown>, d.id)
        );
        if (fbTasks.length > 0 || (cachedStore.tasksByUid[targetUid] ?? []).length === 0) {
          onChange(fbTasks);
        } else {
          emitPortal();
        }
      },
      (error) => {
        emitPortal();
        try {
          handleFirestoreError(error, OperationType.LIST, `users/${targetUid}/tasks`);
        } catch (logged) {
          console.warn('Firestore tasks listener warning:', logged);
        }
      }
    );

    const storeFn = () => {
      if (targetUid !== fbUser.uid) {
        const currentPortal = cachedStore.tasksByUid[targetUid] ?? [];
        if (currentPortal.length > 0) emitPortal();
      }
    };
    storeListeners.add(storeFn);
    return () => {
      unsubFb();
      storeListeners.delete(storeFn);
    };
  }

  emitPortal();
  const fn = () => emitPortal();
  storeListeners.add(fn);
  return () => storeListeners.delete(fn);
}

export async function saveTask(ownerUid: string, task: UnscheduledTask): Promise<void> {
  const taskId = sanitizeId(task.id, 'task');
  const tEmail = await resolveOwnerTeacherEmail(ownerUid);
  const fields = sanitizeTaskFields(task, ownerUid, tEmail);
  const cleanTask = docToUnscheduledTask({ ...fields, id: taskId }, taskId);

  const store = readPortalStore();
  const list = [...(store.tasksByUid[ownerUid] ?? [])];
  const idx = list.findIndex((t) => t.id === taskId);
  if (idx >= 0) list[idx] = cleanTask;
  else list.push(cleanTask);
  store.tasksByUid[ownerUid] = list;
  savePortalStore(store, false);
  void postJson('/api/portal/task', { ownerUid, task: cleanTask });

  if (isFirebaseSessionActive() && auth.currentUser) {
    const path = `users/${ownerUid}/tasks/${taskId}`;
    const ref = doc(db, 'users', ownerUid, 'tasks', taskId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: taskId,
          ownerUid,
          ...fields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          ...fields,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function deleteTask(ownerUid: string, taskId: string): Promise<void> {
  const cleanId = sanitizeId(taskId, 'task');
  const store = readPortalStore();
  store.tasksByUid[ownerUid] = (store.tasksByUid[ownerUid] ?? []).filter((t) => t.id !== cleanId);
  savePortalStore(store, false);
  void deleteJson(`/api/portal/task/${encodeURIComponent(ownerUid)}/${encodeURIComponent(cleanId)}`);

  if (isFirebaseSessionActive() && auth.currentUser) {
    const path = `users/${ownerUid}/tasks/${cleanId}`;
    try {
      await deleteDoc(doc(db, 'users', ownerUid, 'tasks', cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

export async function verifyTaskEvidence(
  studentUid: string,
  taskId: string,
  evidence: TaskEvidence
): Promise<void> {
  const cleanId = sanitizeId(taskId, 'task');
  const cleanEv = sanitizeEvidence(evidence);

  const store = readPortalStore();
  store.tasksByUid[studentUid] = (store.tasksByUid[studentUid] ?? []).map((t) =>
    t.id === cleanId ? { ...t, evidence: cleanEv } : t
  );
  savePortalStore(store, false);
  void postJson('/api/portal/task/verify', { studentUid, taskId: cleanId, evidence: cleanEv });

  if (isFirebaseSessionActive() && auth.currentUser) {
    const path = `users/${studentUid}/tasks/${cleanId}`;
    try {
      await updateDoc(doc(db, 'users', studentUid, 'tasks', cleanId), {
        evidence: cleanEv,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, path);
      } catch (logged) {
        console.warn('Firestore verify task fallback:', logged);
      }
    }
  }
}

export async function batchReorderAssignments(
  ownerUid: string,
  updates: { tasks: UnscheduledTask[]; events: CalendarEvent[] }
): Promise<void> {
  const store = readPortalStore();
  if (updates.tasks.length > 0) {
    const map = new Map(updates.tasks.map((t) => [t.id, t]));
    store.tasksByUid[ownerUid] = (store.tasksByUid[ownerUid] ?? []).map(
      (existing) => map.get(existing.id) ?? existing
    );
  }
  if (updates.events.length > 0) {
    const map = new Map(updates.events.map((e) => [e.id, e]));
    store.eventsByUid[ownerUid] = (store.eventsByUid[ownerUid] ?? []).map(
      (existing) => map.get(existing.id) ?? existing
    );
  }
  savePortalStore(store, false);
  void postJson('/api/portal/batch-reorder', {
    ownerUid,
    tasks: updates.tasks,
    events: updates.events,
  });

  if (isFirebaseSessionActive() && auth.currentUser) {
    const ops: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = [];

    updates.tasks.forEach((task, idx) => {
      const cleanId = sanitizeId(task.id, 'task');
      const prio = VALID_PRIORITIES.includes(task.priority) ? task.priority : 'medium';
      ops.push({
        ref: doc(db, 'users', ownerUid, 'tasks', cleanId),
        data: {
          priority: prio,
          order: clampInt(task.order ?? idx, 0, 100000, idx),
          updatedAt: serverTimestamp(),
        },
      });
    });

    updates.events.forEach((ev, idx) => {
      const cleanId = sanitizeId(ev.id, 'evt');
      const prio = VALID_PRIORITIES.includes(ev.priority) ? ev.priority : 'medium';
      ops.push({
        ref: doc(db, 'users', ownerUid, 'events', cleanId),
        data: {
          priority: prio,
          order: clampInt(ev.order ?? idx, 0, 100000, idx),
          updatedAt: serverTimestamp(),
        },
      });
    });

    try {
      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        ops.slice(i, i + 400).forEach((item) => batch.update(item.ref, item.data));
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${ownerUid}`);
    }
  }
}

// --- Two-Way Maker Inbox & User Directory ---

export function subscribePortalUsers(
  onChange: (users: UserProfileDoc[]) => void
): () => void {
  const active = getCurrentPortalUser();
  if (!active || normalizeEmail(active.email) !== CREATOR_ADMIN_EMAIL.toLowerCase()) {
    onChange([]);
    return () => {};
  }

  const getPortalUsers = (): UserProfileDoc[] =>
    Object.values(cachedStore.profiles)
      .filter((u) => u && normalizeEmail(u.email) !== CREATOR_ADMIN_EMAIL.toLowerCase())
      .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));

  if (isFirebaseSessionActive() && auth.currentUser) {
    let fbUsers: UserProfileDoc[] = [];
    const emitMerged = () => {
      const map = new Map<string, UserProfileDoc>();
      getPortalUsers().forEach((u) => map.set(u.uid, u));
      fbUsers.forEach((u) => map.set(u.uid, u));
      onChange(
        Array.from(map.values())
          .filter((u) => normalizeEmail(u.email) !== CREATOR_ADMIN_EMAIL.toLowerCase())
          .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email))
      );
    };

    const unsubFb = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        fbUsers = snap.docs.map((d) =>
          docToUserProfile(d.data() as Record<string, unknown>, d.id)
        );
        emitMerged();
      },
      (error) => {
        emitMerged();
        try {
          handleFirestoreError(error, OperationType.LIST, 'users');
        } catch (logged) {
          console.warn('Firestore users list warning:', logged);
        }
      }
    );

    const storeFn = () => emitMerged();
    storeListeners.add(storeFn);
    return () => {
      unsubFb();
      storeListeners.delete(storeFn);
    };
  }

  onChange(getPortalUsers());
  const fn = () => onChange(getPortalUsers());
  storeListeners.add(fn);
  return () => storeListeners.delete(fn);
}

export function subscribeFeedbackMessages(
  currentUser: PortalUser,
  isCreator: boolean,
  onChange: (messages: FeedbackMessage[]) => void
): () => void {
  const myEmail = normalizeEmail(currentUser.email);
  const creatorMode = isCreator || myEmail === CREATOR_ADMIN_EMAIL.toLowerCase();

  const getPortalMsgs = (): FeedbackMessage[] => {
    const all = cachedStore.feedbackMessages;
    if (creatorMode) {
      return [...all].sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
    }
    return all
      .filter(
        (m) =>
          m.senderUid === currentUser.uid ||
          normalizeEmail(m.senderEmail) === myEmail ||
          normalizeEmail(m.recipientEmail) === myEmail
      )
      .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
  };

  if (isFirebaseSessionActive() && auth.currentUser) {
    let fbList: FeedbackMessage[] = [];
    const emitAll = () => {
      const merged = new Map<string, FeedbackMessage>();
      getPortalMsgs().forEach((m) => merged.set(m.id, m));
      fbList.forEach((m) => merged.set(m.id, m));
      onChange(
        Array.from(merged.values()).sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0))
      );
    };

    const storeFn = () => emitAll();
    storeListeners.add(storeFn);

    if (creatorMode) {
      const unsubFb = onSnapshot(
        collection(db, 'feedback_messages'),
        (snap) => {
          fbList = snap.docs.map((d) =>
            docToFeedbackMessage(d.data() as Record<string, unknown>, d.id)
          );
          emitAll();
        },
        (error) => {
          emitAll();
          try {
            handleFirestoreError(error, OperationType.LIST, 'feedback_messages');
          } catch (logged) {
            console.warn('Firestore feedback list warning:', logged);
          }
        }
      );
      return () => {
        unsubFb();
        storeListeners.delete(storeFn);
      };
    }

    const sentMap = new Map<string, FeedbackMessage>();
    const recvMap = new Map<string, FeedbackMessage>();

    const updateFbList = () => {
      const m = new Map<string, FeedbackMessage>([...sentMap, ...recvMap]);
      fbList = Array.from(m.values());
      emitAll();
    };

    const unsubSent = onSnapshot(
      query(collection(db, 'feedback_messages'), where('senderUid', '==', currentUser.uid)),
      (snap) => {
        sentMap.clear();
        snap.docs.forEach((d) => {
          sentMap.set(d.id, docToFeedbackMessage(d.data() as Record<string, unknown>, d.id));
        });
        updateFbList();
      },
      (error) => {
        updateFbList();
        try {
          handleFirestoreError(error, OperationType.LIST, 'feedback_messages');
        } catch (logged) {
          console.warn('Firestore feedback sent warning:', logged);
        }
      }
    );

    const unsubRecv = onSnapshot(
      query(collection(db, 'feedback_messages'), where('recipientEmail', '==', myEmail)),
      (snap) => {
        recvMap.clear();
        snap.docs.forEach((d) => {
          recvMap.set(d.id, docToFeedbackMessage(d.data() as Record<string, unknown>, d.id));
        });
        updateFbList();
      },
      (error) => {
        updateFbList();
        try {
          handleFirestoreError(error, OperationType.LIST, 'feedback_messages');
        } catch (logged) {
          console.warn('Firestore feedback recv warning:', logged);
        }
      }
    );

    return () => {
      unsubSent();
      unsubRecv();
      storeListeners.delete(storeFn);
    };
  }

  onChange(getPortalMsgs());
  const fn = () => onChange(getPortalMsgs());
  storeListeners.add(fn);
  return () => storeListeners.delete(fn);
}

export async function sendFeedbackMessage(
  user: PortalUser,
  text: string,
  category: FeedbackCategory,
  recipientEmailOverride?: string
): Promise<void> {
  const cleanText = clampStr(text, 1000);
  if (!cleanText) return;

  const cleanEmail = normalizeEmail(user.email);
  const isFromCreator = cleanEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
  const cleanRecipient = isFromCreator
    ? normalizeEmail(recipientEmailOverride) || CREATOR_ADMIN_EMAIL
    : CREATOR_ADMIN_EMAIL;

  const msgId = sanitizeId(`fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, 'fb');
  const now = Date.now();

  const localMsg: FeedbackMessage = {
    id: msgId,
    senderUid: user.uid,
    senderName: clampStr(user.displayName || cleanEmail.split('@')[0], 120) || 'User',
    senderEmail: cleanEmail,
    senderPhotoUrl: user.photoURL ? clampStr(user.photoURL, 500) : undefined,
    recipientEmail: cleanRecipient,
    category: ['feedback', 'idea', 'bug', 'praise'].includes(category) ? category : 'feedback',
    text: cleanText,
    replies: [],
    seenByCreator: isFromCreator,
    seenBySender: !isFromCreator,
    createdAtMs: now,
  };

  const store = readPortalStore();
  store.feedbackMessages = [...store.feedbackMessages, localMsg];
  savePortalStore(store, false);

  if (portalWs && portalWs.readyState === WebSocket.OPEN) {
    try {
      portalWs.send(JSON.stringify({ type: 'chat:send', payload: localMsg }));
    } catch {
      // fallback to HTTP
    }
  }
  void postJson('/api/portal/feedback', localMsg as unknown as Record<string, unknown>);

  if (isFirebaseSessionActive() && auth.currentUser) {
    const path = `feedback_messages/${msgId}`;
    const docPayload: Record<string, unknown> = {
      id: msgId,
      senderUid: user.uid,
      senderName: localMsg.senderName,
      senderEmail: normalizeEmail(auth.currentUser.email || cleanEmail),
      recipientEmail: cleanRecipient,
      category: localMsg.category,
      text: cleanText,
      replies: [],
      seenByCreator: isFromCreator,
      seenBySender: !isFromCreator,
      createdAtMs: now,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (localMsg.senderPhotoUrl) {
      docPayload.senderPhotoUrl = localMsg.senderPhotoUrl;
    }
    try {
      await setDoc(doc(db, 'feedback_messages', msgId), docPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
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
  const cleanReply = clampStr(replyText, 1000);
  if (!cleanReply) return;

  const cleanId = sanitizeId(messageId, 'fb');
  const cleanAuthorEmail = normalizeEmail(authorEmail);
  const isCreator =
    typeof opts?.isCreator === 'boolean'
      ? opts.isCreator
      : cleanAuthorEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
  const authorName =
    clampStr(
      opts?.senderName ||
        (isCreator ? 'Nicole (Maker)' : cleanAuthorEmail.split('@')[0] || 'User'),
      120
    ) || 'User';
  const now = Date.now();
  const replyId = sanitizeId(`fbr_${now}_${Math.random().toString(36).slice(2, 7)}`, 'fbr');

  const newReply: FeedbackReply = {
    id: replyId,
    senderUid: clampStr(opts?.senderUid || getCurrentPortalUser()?.uid || '', 128),
    senderName: authorName,
    senderEmail: cleanAuthorEmail,
    isCreator,
    text: cleanReply,
    createdAtMs: now,
  };

  // Update portal store + server
  const store = readPortalStore();
  store.feedbackMessages = store.feedbackMessages.map((m) => {
    if (m.id !== cleanId) return m;
    const existingReplies = Array.isArray(m.replies) ? [...m.replies] : [];
    existingReplies.push(newReply);
    return {
      ...m,
      replies: existingReplies.slice(-100),
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
  savePortalStore(store, false);

  const replyPacket = {
    messageId: cleanId,
    replyId,
    replyText: cleanReply,
    senderEmail: cleanAuthorEmail,
    senderName: authorName,
    senderUid: newReply.senderUid,
    isCreator,
    createdAtMs: now,
  };
  if (portalWs && portalWs.readyState === WebSocket.OPEN) {
    try {
      portalWs.send(JSON.stringify({ type: 'chat:reply', payload: replyPacket }));
    } catch {
      // fallback to HTTP
    }
  }
  void postJson('/api/portal/feedback/reply', replyPacket);

  if (isFirebaseSessionActive() && auth.currentUser) {
    const path = `feedback_messages/${cleanId}`;
    const msgRef = doc(db, 'feedback_messages', cleanId);
    try {
      const snap = await getDoc(msgRef);
      if (!snap.exists()) return;
      const raw = snap.data() as Record<string, unknown>;
      const existingReplies: FeedbackReply[] = Array.isArray(raw.replies)
        ? [...(raw.replies as FeedbackReply[])]
        : typeof raw.replyText === 'string' && raw.replyText
        ? [
            {
              id: `fbr_legacy_${cleanId}`,
              senderName: 'Creator',
              senderEmail: normalizeEmail(raw.replyByEmail as string) || CREATOR_ADMIN_EMAIL,
              isCreator: true,
              text: clampStr(raw.replyText, 1000),
              createdAtMs:
                typeof raw.replyAtMs === 'number'
                  ? raw.replyAtMs
                  : typeof raw.createdAtMs === 'number'
                  ? raw.createdAtMs
                  : now - 1,
            },
          ]
        : [];

      existingReplies.push(newReply);
      const boundedReplies = existingReplies.slice(-100);

      await updateDoc(msgRef, {
        replies: boundedReplies,
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
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, path);
      } catch (logged) {
        console.warn('Firestore reply fallback:', logged);
      }
    }
  }
}

export async function markFeedbackMessagesSeen(
  messageIds: string[],
  viewerEmail: string
): Promise<void> {
  if (messageIds.length === 0) return;
  const cleanViewer = normalizeEmail(viewerEmail);
  if (!cleanViewer) return;

  const viewerIsCreator = cleanViewer === CREATOR_ADMIN_EMAIL.toLowerCase();
  const idSet = new Set(messageIds);

  const store = readPortalStore();
  store.feedbackMessages = store.feedbackMessages.map((m) => {
    if (!idSet.has(m.id)) return m;
    return viewerIsCreator ? { ...m, seenByCreator: true } : { ...m, seenBySender: true };
  });
  savePortalStore(store, false);
  void postJson('/api/portal/feedback/seen', { messageIds, viewerEmail: cleanViewer });

  if (isFirebaseSessionActive() && auth.currentUser) {
    try {
      const batch = writeBatch(db);
      let opsCount = 0;
      messageIds.forEach((rawId) => {
        const cleanId = sanitizeId(rawId, 'fb');
        const ref = doc(db, 'feedback_messages', cleanId);
        if (viewerIsCreator) {
          batch.update(ref, { seenByCreator: true, updatedAt: serverTimestamp() });
        } else {
          batch.update(ref, { seenBySender: true, updatedAt: serverTimestamp() });
        }
        opsCount += 1;
      });
      if (opsCount > 0) {
        await batch.commit();
      }
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, 'feedback_messages');
      } catch (logged) {
        console.warn('Firestore mark seen warning:', logged);
      }
    }
  }
}
