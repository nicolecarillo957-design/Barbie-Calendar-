export type EventCategory = 
  | 'deep_work'
  | 'meetings'
  | 'planning'
  | 'health'
  | 'personal'
  | 'admin';

export type Priority = 'low' | 'medium' | 'high';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface ReminderSetting {
  id: string;
  minutesBefore: number; // 0 = at time, 5, 15, 30, 60, 1440, etc.
  label?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string; // ISO or human string
  type: 'event_reminder' | 'task_reminder' | 'test' | 'celebration';
  eventId?: string;
  taskId?: string;
  isRead: boolean;
  snoozedUntil?: string;
}

export interface TaskEvidence {
  id: string;
  photoUrl: string; // Base64 data URL or uploaded photo
  completedAt: string; // ISO string with exact timestamp
  completedTimeFormatted: string; // e.g. "04:32 PM, Oct 25"
  notes?: string;
  pointsEarned: number; // 5 or 10 points
  studentName?: string;
  teacherVerified?: boolean;
  teacherFeedback?: string;
}

export interface StudentStreakData {
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  lastActiveDate?: string; // YYYY-MM-DD
  historyDates: string[]; // dates on which tasks were completed with evidence
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24-hour format)
  endTime: string; // HH:mm
  isCompleted: boolean;
  priority: Priority;
  location?: string;
  meetingUrl?: string;
  subtasks?: Subtask[];
  focusNotes?: string;
  recurrence?: 'none' | 'daily' | 'weekdays' | 'weekly';
  sourceTaskId?: string;
  reminders?: ReminderSetting[];
  evidence?: TaskEvidence;
  pointsValue?: number; // 5 or 10 points (defaults to 10 for deep work/planning, 5 for others)
}

export interface UnscheduledTask {
  id: string;
  title: string;
  category: EventCategory;
  estimatedMinutes: number;
  priority: Priority;
  completed: boolean;
  dueDate?: string;
  description?: string;
  reminderMinutesBefore?: number;
  reminderTime?: string; // HH:mm or ISO
  evidence?: TaskEvidence;
  pointsValue?: number;
}

export interface CategoryConfig {
  id: EventCategory;
  label: string;
  color: string; // Hex or CSS color
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
  weeklyTargetHours: number;
  description: string;
}

export type CalendarViewType = 'day' | 'week' | 'month' | 'insights' | 'audit';

export interface FocusSessionState {
  isActive: boolean;
  isPaused: boolean;
  timeLeftSeconds: number;
  totalDurationSeconds: number;
  linkedEventId?: string;
  linkedTaskId?: string;
  sessionTitle: string;
  distractionNotes: string[];
}

export interface UserProfileDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  teacherEmail?: string;
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  lastActiveDate?: string;
  historyDates: string[];
}

export type FeedbackCategory = 'feedback' | 'idea' | 'bug' | 'praise';

export interface FeedbackMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderEmail: string;
  senderPhotoUrl?: string;
  recipientEmail: string;
  category: FeedbackCategory;
  text: string;
  replyText?: string;
  replyByEmail?: string;
  createdAtMs?: number;
}


