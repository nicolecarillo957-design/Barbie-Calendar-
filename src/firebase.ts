import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  CalendarEvent,
  FeedbackCategory,
  StudentStreakData,
  TaskEvidence,
  UnscheduledTask,
} from './types/calendar';

export const CREATOR_ADMIN_EMAIL = 'nicolecarillo957@gmail.com';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Validate Firestore connection on initial boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function sanitizeId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

function clampString(val: string | undefined, max: number): string | undefined {
  if (val === undefined) return undefined;
  return val.slice(0, max);
}

function sanitizeEvidence(ev: TaskEvidence): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    id: sanitizeId(ev.id),
    photoUrl: ev.photoUrl.slice(0, 450000),
    completedAt: ev.completedAt.slice(0, 64),
    completedTimeFormatted: ev.completedTimeFormatted.slice(0, 100),
    pointsEarned: Math.max(0, Math.min(100, Math.round(ev.pointsEarned || 5))),
  };
  if (ev.notes !== undefined) clean.notes = ev.notes.slice(0, 1000);
  if (ev.studentName !== undefined) clean.studentName = ev.studentName.slice(0, 120);
  if (ev.teacherVerified !== undefined) clean.teacherVerified = Boolean(ev.teacherVerified);
  if (ev.teacherFeedback !== undefined) clean.teacherFeedback = ev.teacherFeedback.slice(0, 1000);
  return clean;
}

export async function signInWithGmail(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Ensures the signed-in user's profile exists in Firestore and updates display/streak metadata.
 */
export async function syncUserProfileToFirestore(
  user: User,
  streakData: StudentStreakData,
  displayNameOverride?: string,
  teacherEmail?: string
): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const cleanDisplayName = (displayNameOverride || user.displayName || user.email?.split('@')[0] || 'Student')
    .trim()
    .slice(0, 120) || 'Student';
  const normalizedTeacher = teacherEmail !== undefined ? teacherEmail.trim().toLowerCase().slice(0, 200) : undefined;

  try {
    const snap = await getDoc(ref);
    const historyDates = (streakData.historyDates || []).slice(-365).map((d) => String(d).slice(0, 20));

    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        uid: user.uid,
        email: (user.email || '').toLowerCase(),
        displayName: cleanDisplayName,
        currentStreak: Math.max(0, Math.min(10000, Math.round(streakData.currentStreak || 0))),
        bestStreak: Math.max(0, Math.min(10000, Math.round(streakData.bestStreak || 0))),
        totalPoints: Math.max(0, Math.min(10000000, Math.round(streakData.totalPoints || 0))),
        historyDates,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (user.photoURL) payload.photoURL = user.photoURL.slice(0, 500);
      if (normalizedTeacher !== undefined) payload.teacherEmail = normalizedTeacher;
      if (streakData.lastActiveDate) payload.lastActiveDate = streakData.lastActiveDate.slice(0, 20);

      await setDoc(ref, payload);
    } else {
      const existingData = snap.data();
      const updatePayload: Record<string, unknown> = {
        displayName: cleanDisplayName,
        currentStreak: Math.max(0, Math.min(10000, Math.round(streakData.currentStreak || 0))),
        bestStreak: Math.max(0, Math.min(10000, Math.round(streakData.bestStreak || 0))),
        totalPoints: Math.max(0, Math.min(10000000, Math.round(streakData.totalPoints || 0))),
        historyDates,
        updatedAt: serverTimestamp(),
      };
      if (user.photoURL) {
        updatePayload.photoURL = user.photoURL.slice(0, 500);
      } else if (existingData?.photoURL) {
        updatePayload.photoURL = existingData.photoURL;
      }
      if (normalizedTeacher !== undefined) {
        updatePayload.teacherEmail = normalizedTeacher;
      } else if (existingData?.teacherEmail !== undefined) {
        updatePayload.teacherEmail = existingData.teacherEmail;
      }
      if (streakData.lastActiveDate) {
        updatePayload.lastActiveDate = streakData.lastActiveDate.slice(0, 20);
      } else if (existingData?.lastActiveDate !== undefined) {
        updatePayload.lastActiveDate = existingData.lastActiveDate;
      }

      await updateDoc(ref, updatePayload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Updates the student's assigned teacher email on their profile AND existing events/tasks
 * so the assigned teacher immediately gains read access to monitor the student's calendar.
 */
export async function updateAssignedTeacherEmail(
  user: User,
  teacherEmail: string,
  events: CalendarEvent[],
  tasks: UnscheduledTask[],
  streakData: StudentStreakData,
  studentName: string
): Promise<void> {
  const normalized = teacherEmail.trim().toLowerCase().slice(0, 200);
  await syncUserProfileToFirestore(user, streakData, studentName, normalized);

  const path = `users/${user.uid}`;
  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const ev of events) {
      if (count >= 400) break;
      const evId = sanitizeId(ev.id);
      batch.update(doc(db, 'users', user.uid, 'events', evId), {
        teacherEmail: normalized,
        updatedAt: serverTimestamp(),
      });
      count++;
    }

    for (const t of tasks) {
      if (count >= 450) break;
      const tId = sanitizeId(t.id);
      batch.update(doc(db, 'users', user.uid, 'tasks', tId), {
        teacherEmail: normalized,
        updatedAt: serverTimestamp(),
      });
      count++;
    }

    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveEventToFirestore(
  ownerUid: string,
  event: CalendarEvent,
  teacherEmail?: string
): Promise<void> {
  const eventId = sanitizeId(event.id);
  const path = `users/${ownerUid}/events/${eventId}`;
  const ref = doc(db, 'users', ownerUid, 'events', eventId);

  try {
    const snap = await getDoc(ref);
    const base: Record<string, unknown> = {
      id: eventId,
      ownerUid,
      title: (event.title || 'Untitled').trim().slice(0, 200) || 'Untitled',
      category: event.category,
      date: event.date.slice(0, 20),
      startTime: event.startTime.slice(0, 10),
      endTime: event.endTime.slice(0, 10),
      isCompleted: Boolean(event.isCompleted),
      priority: event.priority || 'medium',
      updatedAt: serverTimestamp(),
    };

    if (teacherEmail !== undefined) base.teacherEmail = teacherEmail.trim().toLowerCase().slice(0, 200);
    if (event.description !== undefined) base.description = clampString(event.description, 2000);
    if (event.location !== undefined) base.location = clampString(event.location, 200);
    if (event.meetingUrl !== undefined) base.meetingUrl = clampString(event.meetingUrl, 500);
    if (event.focusNotes !== undefined) base.focusNotes = clampString(event.focusNotes, 2000);
    if (event.recurrence !== undefined) base.recurrence = event.recurrence;
    if (event.sourceTaskId !== undefined) base.sourceTaskId = clampString(event.sourceTaskId, 128);
    if (event.pointsValue !== undefined) {
      base.pointsValue = Math.max(0, Math.min(100, Math.round(event.pointsValue)));
    }
    if (event.subtasks !== undefined) base.subtasks = event.subtasks.slice(0, 30);
    if (event.reminders !== undefined) base.reminders = event.reminders.slice(0, 10);
    if (event.evidence !== undefined) base.evidence = sanitizeEvidence(event.evidence);

    if (!snap.exists()) {
      base.createdAt = serverTimestamp();
      await setDoc(ref, base);
    } else {
      const existingData = snap.data();
      base.createdAt = existingData.createdAt || serverTimestamp();
      if (teacherEmail === undefined && existingData.teacherEmail !== undefined) {
        base.teacherEmail = existingData.teacherEmail;
      }
      await setDoc(ref, base);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteEventFromFirestore(ownerUid: string, eventId: string): Promise<void> {
  const cleanId = sanitizeId(eventId);
  const path = `users/${ownerUid}/events/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', ownerUid, 'events', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function verifyEventEvidenceInFirestore(
  studentUid: string,
  eventId: string,
  evidence: TaskEvidence
): Promise<void> {
  const cleanId = sanitizeId(eventId);
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

export async function saveTaskToFirestore(
  ownerUid: string,
  task: UnscheduledTask,
  teacherEmail?: string
): Promise<void> {
  const taskId = sanitizeId(task.id);
  const path = `users/${ownerUid}/tasks/${taskId}`;
  const ref = doc(db, 'users', ownerUid, 'tasks', taskId);

  try {
    const snap = await getDoc(ref);
    const base: Record<string, unknown> = {
      id: taskId,
      ownerUid,
      title: (task.title || 'Untitled Task').trim().slice(0, 200) || 'Untitled Task',
      category: task.category,
      estimatedMinutes: Math.max(1, Math.min(1440, Math.round(task.estimatedMinutes || 30))),
      priority: task.priority || 'medium',
      completed: Boolean(task.completed),
      updatedAt: serverTimestamp(),
    };

    if (teacherEmail !== undefined) base.teacherEmail = teacherEmail.trim().toLowerCase().slice(0, 200);
    if (task.dueDate !== undefined) base.dueDate = clampString(task.dueDate, 20);
    if (task.description !== undefined) base.description = clampString(task.description, 2000);
    if (task.reminderMinutesBefore !== undefined) {
      base.reminderMinutesBefore = Math.max(0, Math.min(10080, Math.round(task.reminderMinutesBefore)));
    }
    if (task.reminderTime !== undefined) base.reminderTime = clampString(task.reminderTime, 64);
    if (task.pointsValue !== undefined) {
      base.pointsValue = Math.max(0, Math.min(100, Math.round(task.pointsValue)));
    }
    if (task.evidence !== undefined) base.evidence = sanitizeEvidence(task.evidence);

    if (!snap.exists()) {
      base.createdAt = serverTimestamp();
      await setDoc(ref, base);
    } else {
      const existingData = snap.data();
      base.createdAt = existingData.createdAt || serverTimestamp();
      if (teacherEmail === undefined && existingData.teacherEmail !== undefined) {
        base.teacherEmail = existingData.teacherEmail;
      }
      await setDoc(ref, base);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTaskFromFirestore(ownerUid: string, taskId: string): Promise<void> {
  const cleanId = sanitizeId(taskId);
  const path = `users/${ownerUid}/tasks/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', ownerUid, 'tasks', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function verifyTaskEvidenceInFirestore(
  studentUid: string,
  taskId: string,
  evidence: TaskEvidence
): Promise<void> {
  const cleanId = sanitizeId(taskId);
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

export async function sendFeedbackMessage(
  user: User,
  text: string,
  category: FeedbackCategory
): Promise<void> {
  const messageId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `feedback_messages/${messageId}`;
  const cleanText = text.trim().slice(0, 1000);
  if (!cleanText) return;

  const payload: Record<string, unknown> = {
    id: messageId,
    senderUid: user.uid,
    senderName: (user.displayName || user.email?.split('@')[0] || 'User').trim().slice(0, 120) || 'User',
    senderEmail: (user.email || '').toLowerCase(),
    recipientEmail: CREATOR_ADMIN_EMAIL,
    category,
    text: cleanText,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (user.photoURL) {
    payload.senderPhotoUrl = user.photoURL.slice(0, 500);
  }

  try {
    await setDoc(doc(collection(db, 'feedback_messages'), messageId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function replyToFeedbackMessage(
  messageId: string,
  replyText: string,
  adminEmail: string
): Promise<void> {
  const cleanId = sanitizeId(messageId);
  const path = `feedback_messages/${cleanId}`;
  const cleanReply = replyText.trim().slice(0, 1000);
  if (!cleanReply) return;

  try {
    await updateDoc(doc(db, 'feedback_messages', cleanId), {
      replyText: cleanReply,
      replyByEmail: adminEmail.toLowerCase().slice(0, 200),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
