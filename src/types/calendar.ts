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
  type: 'event_reminder' | 'task_reminder' | 'test' | 'celebration' | 'cycle_morning';
  eventId?: string;
  taskId?: string;
  isRead: boolean;
  snoozedUntil?: string;
  cyclePhase?: CyclePhase;
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

export type CalendarViewType = 'day' | 'week' | 'month' | 'audit';

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

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export interface CycleSettings {
  enabled: boolean;
  lastPeriodStartDate: string; // YYYY-MM-DD
  cycleLengthDays: number; // usually 28
  periodDurationDays: number; // usually 5
  dailyMorningNotificationEnabled: boolean;
  morningNotificationTime?: string; // e.g. "08:00"
}

export interface CyclePhaseInfo {
  phase: CyclePhase;
  phaseName: string;
  seasonName: string; // "Winter", "Spring", "Summer", "Autumn"
  icon: string;
  cycleDay: number;
  cycleLength: number;
  isPeriod: boolean;
  isOvulation: boolean;
  isFertile: boolean;
  daysUntilNextPeriod: number;
  nextPeriodDate: string; // YYYY-MM-DD
  energyLevel: string; // e.g. "Gentle & Restorative", "Rising & Vibrant", "Peak & Magnetic", "Inward & Focused"
  hormones: string;
  whatToDoWork: string;
  whatToDoMovement: string;
  whatToDoNutrition: string;
  whatToDoSelfCare: string;
  affirmation: string;
}

export interface DayCycleStatus {
  date: string;
  isPeriod: boolean;
  isNextPeriodPredicted: boolean;
  isOvulation: boolean;
  phase: CyclePhase;
  cycleDay: number;
}

