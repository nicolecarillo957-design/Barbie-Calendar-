import {
  CalendarEvent,
  FeedbackCategory,
  FeedbackMessage,
  StudentStreakData,
  TaskEvidence,
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
}

const DEFAULT_STORE: PortalStoreState = {
  currentUid: null,
  accounts: {},
  profiles: {},
  eventsByUid: {},
  tasksByUid: {},
  feedbackMessages: [],
};

type StoreListener = () => void;
const listeners = new Set<StoreListener>();

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

function subscribeStore(cb: StoreListener): () => void {
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
  store.profiles[uid] = buildStarterProfile(newUser);
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

  // Also allow seamless instant sign-in even if the user hasn't used the Register tab first!
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
  store.profiles[uid] = buildStarterProfile(newUser);
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
  const store = loadStore();
  const entry = Object.values(store.accounts).find(
    (a) => a.user.email.toLowerCase() === cleanEmail
  );
  if (!entry) {
    throw new Error('No saved account found for that email on this device. Create a new account freely!');
  }
  store.accounts[entry.user.uid] = { ...entry, password: newPassword };
  saveStore(store);
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
  if (store.profiles[user.uid]) return;
  store.profiles[user.uid] = buildStarterProfile(user);
  saveStore(store);
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
    (displayNameOverride || existing?.displayName || user.displayName || user.email.split('@')[0] || 'Student')
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

  store.profiles[user.uid] = nextProfile;
  if (store.accounts[user.uid]) {
    store.accounts[user.uid].user.displayName = cleanName;
  }
  saveStore(store);
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
  await syncUserProfile(user, streakData, studentName, normalized);
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
    const myEmail = currentUser.email.toLowerCase();
    const students = Object.values(store.profiles).filter((prof) => {
      if (prof.uid === currentUser.uid) return false;
      if (isCreatorAdmin) return true;
      return (prof.teacherEmail || '').toLowerCase() === myEmail;
    });
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
}

export async function deleteEvent(ownerUid: string, eventId: string): Promise<void> {
  const store = loadStore();
  const list = (store.eventsByUid[ownerUid] ?? []).filter((e) => e.id !== eventId);
  store.eventsByUid[ownerUid] = list;
  saveStore(store);
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
}

export async function deleteTask(ownerUid: string, taskId: string): Promise<void> {
  const store = loadStore();
  const list = (store.tasksByUid[ownerUid] ?? []).filter((t) => t.id !== taskId);
  store.tasksByUid[ownerUid] = list;
  saveStore(store);
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
}

export function subscribeFeedbackMessages(
  currentUser: PortalUser,
  isCreator: boolean,
  onChange: (messages: FeedbackMessage[]) => void
): () => void {
  const emit = () => {
    const store = loadStore();
    const list = store.feedbackMessages
      .filter((m) => isCreator || m.senderUid === currentUser.uid)
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
  const store = loadStore();
  const msg: FeedbackMessage = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    senderUid: user.uid,
    senderName: user.displayName || user.email.split('@')[0] || 'User',
    senderEmail: user.email.toLowerCase(),
    senderPhotoUrl: user.photoURL,
    recipientEmail: CREATOR_ADMIN_EMAIL,
    category,
    text: cleanText,
    createdAtMs: Date.now(),
  };
  store.feedbackMessages = [...store.feedbackMessages, msg];
  saveStore(store);
}

export async function replyToFeedbackMessage(
  messageId: string,
  replyText: string,
  adminEmail: string
): Promise<void> {
  const cleanReply = replyText.trim().slice(0, 1000);
  if (!cleanReply) return;
  const store = loadStore();
  store.feedbackMessages = store.feedbackMessages.map((m) =>
    m.id === messageId
      ? { ...m, replyText: cleanReply, replyByEmail: adminEmail.toLowerCase() }
      : m
  );
  saveStore(store);
}
