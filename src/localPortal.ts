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

export const CREATOR_ADMIN_EMAIL = 'nicolecarillo957@gmail.com';

export interface PortalUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
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
  };
}

function sanitizeEvidence(ev: TaskEvidence): TaskEvidence {
  const clean: TaskEvidence = {
    id: sanitizeId(ev.id, 'evid'),
    photoUrl: clampStr(ev.photoUrl, 450000),
    completedAt: clampStr(ev.completedAt || new Date().toISOString(), 64) || new Date().toISOString(),
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
  try {
    const snap = await getDoc(doc(db, 'users', ownerUid));
    if (snap.exists()) {
      const tEmail = normalizeEmail(snap.data()?.teacherEmail as string | undefined);
      teacherEmailCache.set(ownerUid, tEmail);
      return tEmail;
    }
  } catch {
    // non-fatal cache lookup
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

// --- Firebase Auth Helpers ---

export function getCurrentPortalUser(): PortalUser | null {
  return toPortalUser(auth.currentUser);
}

export async function signInWithGoogle(): Promise<PortalUser> {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    const portalUser = toPortalUser(credential.user);
    if (!portalUser) {
      throw new Error('Could not read your Google email address. Please try again.');
    }
    return portalUser;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/popup-closed-by-user') {
      throw new Error('Google sign-in popup was closed before completing sign-in.');
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups and retry.');
    }
    if (code === 'auth/cancelled-popup-request') {
      throw new Error('Another sign-in request was started. Please complete the active window.');
    }
    throw err instanceof Error ? err : new Error('Google sign-in failed. Please try again.');
  }
}

export function subscribeAuthState(callback: (user: PortalUser | null) => void): () => void {
  return onAuthStateChanged(auth, (fbUser) => {
    callback(toPortalUser(fbUser));
  });
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// Cloud Firestore sync happens live via onSnapshot; keep manual trigger resolved cleanly
export async function syncPortalNow(): Promise<void> {
  // Real-time Firestore onSnapshot keeps all views synced automatically.
}

// --- User Profile & Role Operations ---

export async function ensureUserProfile(user: PortalUser): Promise<void> {
  if (!auth.currentUser) return;
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const cleanEmail = normalizeEmail(auth.currentUser.email || user.email);
      const cleanName =
        clampStr(user.displayName || auth.currentUser.displayName, 120) ||
        clampStr(cleanEmail.split('@')[0], 120) ||
        'Student';
      const starter: Record<string, unknown> = {
        uid: user.uid,
        email: cleanEmail,
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
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncUserProfile(
  user: PortalUser,
  streakData: StudentStreakData,
  displayNameOverride?: string,
  teacherEmail?: string,
  role?: UserRole
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);

  const cleanHistory = Array.isArray(streakData.historyDates)
    ? streakData.historyDates
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
        .map((d) => clampStr(d, 20))
        .slice(-365)
    : [];

  try {
    const snap = await getDoc(ref);
    const existingData = snap.exists() ? snap.data() : undefined;
    const cleanEmail = normalizeEmail(auth.currentUser.email || user.email);
    const cleanName =
      clampStr(
        displayNameOverride ||
          (existingData?.displayName as string | undefined) ||
          user.displayName ||
          cleanEmail.split('@')[0],
        120
      ) || 'Student';

    const updatePayload: Record<string, unknown> = {
      displayName: cleanName,
      currentStreak: clampInt(streakData.currentStreak, 0, 10000, 0),
      bestStreak: clampInt(streakData.bestStreak, 0, 10000, 0),
      totalPoints: clampInt(streakData.totalPoints, 0, 10000000, 0),
      historyDates: cleanHistory,
      updatedAt: serverTimestamp(),
    };

    const photoURL = user.photoURL
      ? clampStr(user.photoURL, 500)
      : typeof existingData?.photoURL === 'string'
      ? clampStr(existingData.photoURL, 500)
      : '';
    if (photoURL) {
      updatePayload.photoURL = photoURL;
    }

    if (role !== undefined) {
      updatePayload.role = role;
    } else if (existingData?.role === 'student' || existingData?.role === 'teacher') {
      updatePayload.role = existingData.role;
    }

    if (teacherEmail !== undefined) {
      const normalizedTeacher = normalizeEmail(teacherEmail);
      updatePayload.teacherEmail = normalizedTeacher;
      teacherEmailCache.set(user.uid, normalizedTeacher);
    } else if (typeof existingData?.teacherEmail === 'string') {
      updatePayload.teacherEmail = normalizeEmail(existingData.teacherEmail);
    }

    const lastActive = clampStr(
      streakData.lastActiveDate ?? (existingData?.lastActiveDate as string | undefined),
      20
    );
    if (lastActive) {
      updatePayload.lastActiveDate = lastActive;
    }

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: cleanEmail,
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
  const cleanStudentEmail = normalizeEmail(auth.currentUser?.email || user.email);
  if (normalized && normalized === cleanStudentEmail) {
    throw new Error('Please enter your teacher’s Gmail rather than your own email.');
  }

  // 1. Persist teacherEmail on student profile first (guarantees /users/{uid} exists)
  await syncUserProfile(user, streakData, studentName, normalized);
  teacherEmailCache.set(user.uid, normalized);

  // 2. Propagate teacherEmail onto all existing student events & tasks in batches
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

  // 3. Create instant Teacher Link Notification document if non-empty
  if (normalized) {
    const notifId = sanitizeId(
      `tlink_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      'tlink'
    );
    const notifPath = `teacher_notifications/${notifId}`;
    const cleanName = clampStr(studentName || user.displayName, 120) || 'Student';
    try {
      await setDoc(doc(db, 'teacher_notifications', notifId), {
        id: notifId,
        teacherEmail: normalized,
        studentUid: user.uid,
        studentName: cleanName,
        studentEmail: cleanStudentEmail,
        createdAtMs: Date.now(),
        seenByTeacher: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, notifPath);
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

  const viewerIsAdmin =
    normalizeEmail(auth.currentUser?.email) === CREATOR_ADMIN_EMAIL.toLowerCase();

  if (!viewerIsAdmin) {
    throw new Error(
      `For student privacy, ask ${cleanStudent} to sign in with Google and enter your Gmail (${cleanTeacher}) in Settings -> Link Teacher. They will appear automatically right away!`
    );
  }

  try {
    const snap = await getDocs(
      query(collection(db, 'users'), where('email', '==', cleanStudent))
    );
    if (snap.empty) {
      throw new Error(
        `No profile found yet for ${cleanStudent}. Ask them to sign in once with Google first!`
      );
    }
    const targetDoc = snap.docs[0];
    await updateDoc(targetDoc.ref, {
      teacherEmail: cleanTeacher,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('Missing or insufficient permissions')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, 'users');
  }
}

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfileDoc | null) => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(docToUserProfile(snap.data() as Record<string, unknown>, snap.id));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeMonitoredStudents(
  currentUser: PortalUser,
  isCreatorAdmin: boolean,
  onChange: (students: UserProfileDoc[]) => void
): () => void {
  if (!auth.currentUser) return () => {};
  const myEmail = normalizeEmail(currentUser.email);
  const q = isCreatorAdmin
    ? collection(db, 'users')
    : query(collection(db, 'users'), where('teacherEmail', '==', myEmail));

  return onSnapshot(
    q,
    (snap) => {
      const students = snap.docs
        .map((d) => docToUserProfile(d.data() as Record<string, unknown>, d.id))
        .filter((prof) => prof.uid !== currentUser.uid)
        .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
      onChange(students);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );
}

// --- Teacher Link Notifications ---

export function subscribeTeacherLinkNotifications(
  userEmail: string | undefined,
  currentUid: string | undefined,
  onNewLinks: (notifications: TeacherLinkNotification[]) => void
): () => void {
  const cleanEmail = normalizeEmail(userEmail);
  if (!auth.currentUser || !cleanEmail || !currentUid) return () => {};

  const q = query(
    collection(db, 'teacher_notifications'),
    where('teacherEmail', '==', cleanEmail)
  );

  return onSnapshot(
    q,
    (snap) => {
      const pending = snap.docs
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
        .filter((n) => n.seenByTeacher !== true && n.studentUid !== currentUid)
        .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));

      if (pending.length > 0) {
        onNewLinks(pending);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'teacher_notifications');
    }
  );
}

export async function markTeacherNotificationsSeen(ids: string[], uid: string): Promise<void> {
  if (!auth.currentUser || !uid || ids.length === 0) return;
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
    handleFirestoreError(error, OperationType.UPDATE, 'teacher_notifications');
  }
}

// --- Calendar Events ---

export function subscribeEvents(
  targetUid: string | null,
  onChange: (events: CalendarEvent[]) => void
): () => void {
  const fbUser = auth.currentUser;
  if (!fbUser || !targetUid) {
    onChange([]);
    return () => {};
  }

  const myEmail = normalizeEmail(fbUser.email);
  const isCreatorAdmin = myEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
  const baseCol = collection(db, 'users', targetUid, 'events');
  const q = isCreatorAdmin
    ? baseCol
    : targetUid === fbUser.uid
    ? query(baseCol, where('ownerUid', '==', fbUser.uid))
    : query(baseCol, where('teacherEmail', '==', myEmail));

  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) => docToCalendarEvent(d.data() as Record<string, unknown>, d.id))
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${targetUid}/events`);
    }
  );
}

export async function saveEvent(ownerUid: string, event: CalendarEvent): Promise<void> {
  if (!auth.currentUser) return;
  const eventId = sanitizeId(event.id, 'evt');
  const path = `users/${ownerUid}/events/${eventId}`;
  const ref = doc(db, 'users', ownerUid, 'events', eventId);

  try {
    const tEmail = await resolveOwnerTeacherEmail(ownerUid);
    const fields = sanitizeEventFields(event, ownerUid, tEmail);
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

export async function deleteEvent(ownerUid: string, eventId: string): Promise<void> {
  if (!auth.currentUser) return;
  const cleanId = sanitizeId(eventId, 'evt');
  const path = `users/${ownerUid}/events/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', ownerUid, 'events', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function verifyEventEvidence(
  studentUid: string,
  eventId: string,
  evidence: TaskEvidence
): Promise<void> {
  if (!auth.currentUser) return;
  const cleanId = sanitizeId(eventId, 'evt');
  const path = `users/${studentUid}/events/${cleanId}`;
  try {
    await updateDoc(doc(db, 'users', studentUid, 'events', cleanId), {
      evidence: sanitizeEvidence(evidence),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Backlog Tasks ---

export function subscribeTasks(
  targetUid: string | null,
  onChange: (tasks: UnscheduledTask[]) => void
): () => void {
  const fbUser = auth.currentUser;
  if (!fbUser || !targetUid) {
    onChange([]);
    return () => {};
  }

  const myEmail = normalizeEmail(fbUser.email);
  const isCreatorAdmin = myEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
  const baseCol = collection(db, 'users', targetUid, 'tasks');
  const q = isCreatorAdmin
    ? baseCol
    : targetUid === fbUser.uid
    ? query(baseCol, where('ownerUid', '==', fbUser.uid))
    : query(baseCol, where('teacherEmail', '==', myEmail));

  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) => docToUnscheduledTask(d.data() as Record<string, unknown>, d.id))
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${targetUid}/tasks`);
    }
  );
}

export async function saveTask(ownerUid: string, task: UnscheduledTask): Promise<void> {
  if (!auth.currentUser) return;
  const taskId = sanitizeId(task.id, 'task');
  const path = `users/${ownerUid}/tasks/${taskId}`;
  const ref = doc(db, 'users', ownerUid, 'tasks', taskId);

  try {
    const tEmail = await resolveOwnerTeacherEmail(ownerUid);
    const fields = sanitizeTaskFields(task, ownerUid, tEmail);
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

export async function deleteTask(ownerUid: string, taskId: string): Promise<void> {
  if (!auth.currentUser) return;
  const cleanId = sanitizeId(taskId, 'task');
  const path = `users/${ownerUid}/tasks/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', ownerUid, 'tasks', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function verifyTaskEvidence(
  studentUid: string,
  taskId: string,
  evidence: TaskEvidence
): Promise<void> {
  if (!auth.currentUser) return;
  const cleanId = sanitizeId(taskId, 'task');
  const path = `users/${studentUid}/tasks/${cleanId}`;
  try {
    await updateDoc(doc(db, 'users', studentUid, 'tasks', cleanId), {
      evidence: sanitizeEvidence(evidence),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function batchReorderAssignments(
  ownerUid: string,
  updates: { tasks: UnscheduledTask[]; events: CalendarEvent[] }
): Promise<void> {
  if (!auth.currentUser) return;
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

// --- Two-Way Maker Inbox & User Directory ---

export function subscribePortalUsers(
  onChange: (users: UserProfileDoc[]) => void
): () => void {
  const fbUser = auth.currentUser;
  if (!fbUser) return () => {};
  const myEmail = normalizeEmail(fbUser.email);
  if (myEmail !== CREATOR_ADMIN_EMAIL.toLowerCase()) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const users = snap.docs
        .map((d) => docToUserProfile(d.data() as Record<string, unknown>, d.id))
        .filter((u) => u.email !== CREATOR_ADMIN_EMAIL.toLowerCase())
        .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
      onChange(users);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );
}

export function subscribeFeedbackMessages(
  currentUser: PortalUser,
  isCreator: boolean,
  onChange: (messages: FeedbackMessage[]) => void
): () => void {
  if (!auth.currentUser) return () => {};
  const myEmail = normalizeEmail(currentUser.email);
  const creatorMode = isCreator || myEmail === CREATOR_ADMIN_EMAIL.toLowerCase();

  if (creatorMode) {
    return onSnapshot(
      collection(db, 'feedback_messages'),
      (snap) => {
        const list = snap.docs
          .map((d) => docToFeedbackMessage(d.data() as Record<string, unknown>, d.id))
          .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
        onChange(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'feedback_messages');
      }
    );
  }

  // Regular user: run two rule-aligned queries (sent by me OR addressed to me by creator)
  const sentMap = new Map<string, FeedbackMessage>();
  const recvMap = new Map<string, FeedbackMessage>();

  const emitMerged = () => {
    const merged = new Map<string, FeedbackMessage>([...sentMap, ...recvMap]);
    onChange(
      Array.from(merged.values()).sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0))
    );
  };

  const unsubSent = onSnapshot(
    query(collection(db, 'feedback_messages'), where('senderUid', '==', currentUser.uid)),
    (snap) => {
      sentMap.clear();
      snap.docs.forEach((d) => {
        sentMap.set(d.id, docToFeedbackMessage(d.data() as Record<string, unknown>, d.id));
      });
      emitMerged();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'feedback_messages');
    }
  );

  const unsubRecv = onSnapshot(
    query(collection(db, 'feedback_messages'), where('recipientEmail', '==', myEmail)),
    (snap) => {
      recvMap.clear();
      snap.docs.forEach((d) => {
        recvMap.set(d.id, docToFeedbackMessage(d.data() as Record<string, unknown>, d.id));
      });
      emitMerged();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'feedback_messages');
    }
  );

  return () => {
    unsubSent();
    unsubRecv();
  };
}

export async function sendFeedbackMessage(
  user: PortalUser,
  text: string,
  category: FeedbackCategory,
  recipientEmailOverride?: string
): Promise<void> {
  if (!auth.currentUser) return;
  const cleanText = clampStr(text, 1000);
  if (!cleanText) return;

  const cleanEmail = normalizeEmail(auth.currentUser.email || user.email);
  const isFromCreator = cleanEmail === CREATOR_ADMIN_EMAIL.toLowerCase();
  const cleanRecipient = isFromCreator
    ? normalizeEmail(recipientEmailOverride) || CREATOR_ADMIN_EMAIL
    : CREATOR_ADMIN_EMAIL;

  const msgId = sanitizeId(`fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, 'fb');
  const path = `feedback_messages/${msgId}`;

  const docPayload: Record<string, unknown> = {
    id: msgId,
    senderUid: user.uid,
    senderName: clampStr(user.displayName || cleanEmail.split('@')[0], 120) || 'User',
    senderEmail: cleanEmail,
    recipientEmail: cleanRecipient,
    category: ['feedback', 'idea', 'bug', 'praise'].includes(category) ? category : 'feedback',
    text: cleanText,
    replies: [],
    seenByCreator: isFromCreator,
    seenBySender: !isFromCreator,
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (user.photoURL) {
    docPayload.senderPhotoUrl = clampStr(user.photoURL, 500);
  }

  try {
    await setDoc(doc(db, 'feedback_messages', msgId), docPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
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
  if (!auth.currentUser) return;
  const cleanReply = clampStr(replyText, 1000);
  if (!cleanReply) return;

  const cleanId = sanitizeId(messageId, 'fb');
  const path = `feedback_messages/${cleanId}`;
  const msgRef = doc(db, 'feedback_messages', cleanId);

  const cleanAuthorEmail = normalizeEmail(auth.currentUser.email || authorEmail);
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

  const newReply: FeedbackReply = {
    id: sanitizeId(`fbr_${now}_${Math.random().toString(36).slice(2, 7)}`, 'fbr'),
    senderUid: clampStr(opts?.senderUid || auth.currentUser.uid, 128),
    senderName: authorName,
    senderEmail: cleanAuthorEmail,
    isCreator,
    text: cleanReply,
    createdAtMs: now,
  };

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
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markFeedbackMessagesSeen(
  messageIds: string[],
  viewerEmail: string
): Promise<void> {
  if (!auth.currentUser || messageIds.length === 0) return;
  const cleanViewer = normalizeEmail(auth.currentUser.email || viewerEmail);
  if (!cleanViewer) return;

  const viewerIsCreator = cleanViewer === CREATOR_ADMIN_EMAIL.toLowerCase();

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
    handleFirestoreError(error, OperationType.UPDATE, 'feedback_messages');
  }
}
