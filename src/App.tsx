/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  AppNotification,
  CalendarEvent, 
  CalendarViewType, 
  CycleSettings,
  EventCategory, 
  UnscheduledTask 
} from './types/calendar';
import { CATEGORY_LIST } from './utils/categories';
import { cuteSound } from './utils/cuteSound';
import { 
  formatDateKey, 
  minutesToTime, 
  parseDateKey, 
  timeToMinutes 
} from './utils/dateUtils';
import { DEFAULT_CYCLE_SETTINGS, getCurrentCycleInfo, getCycleMorningMessage } from './utils/cycleUtils';
import { INITIAL_EVENTS, INITIAL_TASKS } from './utils/seedData';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { MonthView } from './components/MonthView';
import { TimeAuditView } from './components/TimeAuditView';
import { EventModal } from './components/EventModal';
import { FocusModeModal } from './components/FocusModeModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { SettingsModal } from './components/SettingsModal';
import { CuteNotificationCenter } from './components/CuteNotificationCenter';
import { CuteToastContainer } from './components/CuteToastContainer';
import { CycleGlowModal } from './components/CycleGlowModal';
import { CalmSanctuaryModal } from './components/CalmSanctuaryModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { BarbieDressUpModal } from './components/BarbieDressUpModal';
import { FloatingBarbieCompanion } from './components/FloatingBarbieCompanion';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { DollOutfitState } from './types/doll';
import { CalendarThemeId, THEME_CONFIGS } from './types/theme';

const EVENTS_STORAGE_KEY = 'barbie_calendar_events_user_v1';
const TASKS_STORAGE_KEY = 'barbie_calendar_tasks_user_v1';
const NOTIFS_STORAGE_KEY = 'barbie_calendar_notifs_user_v1';
const CYCLE_STORAGE_KEY = 'barbie_calendar_cycle_v1';
const DOLL_STORAGE_KEY = 'blythe_doll_customization_v2';
const COMPANION_STORAGE_KEY = 'blythe_companion_active_v2';
const THEME_STORAGE_KEY = 'calendar_color_theme_v1';

const DEFAULT_DOLL_STATE: DollOutfitState = {
  gender: 'girl',
  skinTone: 'porcelain-fair',
  eyeColor: 'sapphire-blue',
  eyeGaze: 'front',
  hairstyle: 'blythe-signature-bangs',
  outfit: 'distressed-boyfriend-jeans',
  shoes: 'mary-jane-lace',
  accessory: 'oversized-bow',
  scene: 'dollhouse-room',
};

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-welcome',
    title: 'Welcome to Barbie Calendar! 🎀💖',
    message: 'Your glamorous calendar alerts you with sweet chimes and pink reminders for upcoming blocks!',
    timestamp: '10:00 AM',
    type: 'celebration',
    isRead: false,
  },
  {
    id: 'notif-sample-1',
    title: 'Executive Board Sync & Sprint Strategy 👑',
    message: 'Starting in 15 minutes! Google Meet link ready.',
    timestamp: '11:30 AM',
    type: 'event_reminder',
    eventId: 'evt-mon-3',
    isRead: false,
  }
];

export default function App() {
  // 1. Calendar Date State (default to Sept 28, 2026 Monday)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    return new Date(2026, 8, 28, 10, 0, 0); // 2026-09-28
  });

  // 2. Active View ('week' | 'day' | 'month' | 'audit')
  const [currentView, setCurrentView] = useState<CalendarViewType>('week');

  // 3. Events State (with LocalStorage persistence)
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      // Clear legacy sample events so the user starts with a clean slate
      localStorage.removeItem('chronos_calendar_events_v2');
      localStorage.removeItem('chronos_calendar_events');
      localStorage.removeItem('chronos_calendar_tasks_v2');
      localStorage.removeItem('chronos_calendar_tasks');

      const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed reading events from storage', e);
    }
    return INITIAL_EVENTS; // Clean empty schedule
  });

  useEffect(() => {
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.error('Failed saving events to storage', e);
    }
  }, [events]);

  // 4. Unscheduled Tasks / Backlog State
  const [tasks, setTasks] = useState<UnscheduledTask[]>(() => {
    try {
      const stored = localStorage.getItem(TASKS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed reading tasks from storage', e);
    }
    return INITIAL_TASKS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed saving tasks to storage', e);
    }
  }, [tasks]);

  // 5. Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(NOTIFS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed reading notifications from storage', e);
    }
    return INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed saving notifications to storage', e);
    }
  }, [notifications]);

  // Active floating toasts
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const triggeredRemindersRef = useRef<Set<string>>(new Set());

  // 6. Category Filters
  const [selectedCategories, setSelectedCategories] = useState<Set<EventCategory>>(() => {
    return new Set(CATEGORY_LIST.map((c) => c.id));
  });

  const handleToggleCategory = useCallback((cat: EventCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  // 7. Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // 8. Modal Controls
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [slotDate, setSlotDate] = useState<string>('');
  const [slotTime, setSlotTime] = useState<string>('');

  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [focusEvent, setFocusEvent] = useState<CalendarEvent | null>(null);

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [isCalmModalOpen, setIsCalmModalOpen] = useState(false);
  const [isDressUpModalOpen, setIsDressUpModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // 9. Calendar Color Theme State
  const [currentTheme, setCurrentTheme] = useState<CalendarThemeId>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as CalendarThemeId | null;
      if (stored && ['pink', 'blue', 'red', 'orange', 'black', 'yellow', 'white', 'green', 'purple', 'rainbow'].includes(stored)) {
        return stored;
      }
    } catch (e) {
      console.error('Failed reading theme from storage', e);
    }
    return 'pink';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    } catch (e) {
      console.error('Failed saving theme to storage', e);
    }
  }, [currentTheme]);

  // 10. Barbie Doll Wardrobe & Companion State
  const [dollState, setDollState] = useState<DollOutfitState>(() => {
    try {
      const stored = localStorage.getItem(DOLL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed reading doll state from storage', e);
    }
    return DEFAULT_DOLL_STATE;
  });

  const [isCompanionActive, setIsCompanionActive] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(COMPANION_STORAGE_KEY);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed reading companion state from storage', e);
    }
    return true; // Default floating companion visible
  });

  useEffect(() => {
    try {
      localStorage.setItem(DOLL_STORAGE_KEY, JSON.stringify(dollState));
    } catch (e) {
      console.error('Failed saving doll state', e);
    }
  }, [dollState]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPANION_STORAGE_KEY, JSON.stringify(isCompanionActive));
    } catch (e) {
      console.error('Failed saving companion state', e);
    }
  }, [isCompanionActive]);

  // 10. Barbie Cycle & Period Settings
  const [cycleSettings, setCycleSettings] = useState<CycleSettings>(() => {
    try {
      const stored = localStorage.getItem(CYCLE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed reading cycle settings from storage', e);
    }
    return DEFAULT_CYCLE_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(cycleSettings));
    } catch (e) {
      console.error('Failed saving cycle settings to storage', e);
    }
  }, [cycleSettings]);

  const currentCycleInfo = useMemo(() => {
    return getCurrentCycleInfo(currentDate, cycleSettings);
  }, [currentDate, cycleSettings]);

  // Trigger Notification Function
  const triggerNotification = useCallback((notifData: {
    title: string;
    message: string;
    type: 'event_reminder' | 'task_reminder' | 'test' | 'celebration' | 'cycle_morning';
    eventId?: string;
    taskId?: string;
    cyclePhase?: any;
  }) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: notifData.title,
      message: notifData.message,
      type: notifData.type,
      eventId: notifData.eventId,
      taskId: notifData.taskId,
      cyclePhase: notifData.cyclePhase,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToasts((prev) => [newNotif, ...prev.slice(0, 2)]); // Keep max 3 active toasts
    cuteSound.playCuteChime();

    // Auto dismiss toast after 9 seconds
    setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== newNotif.id));
    }, 9000);
  }, []);

  // Trigger Cycle-Synced Morning Encouragement
  const handleTriggerCycleMorningNotification = useCallback(() => {
    const cycleInfo = getCurrentCycleInfo(currentDate, cycleSettings);
    const morningMsg = getCycleMorningMessage(cycleInfo);
    
    triggerNotification({
      title: morningMsg.title,
      message: morningMsg.message,
      type: 'cycle_morning',
      cyclePhase: cycleInfo.phase,
    });
    cuteSound.playSparkle();
  }, [currentDate, cycleSettings, triggerNotification]);

  // Automated Daily Cycle-Synced Morning Notification (Delivered on active day if opted-in)
  const lastMorningDeliveredDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cycleSettings.enabled || !cycleSettings.dailyMorningNotificationEnabled) return;
    const dateKey = formatDateKey(currentDate);

    if (lastMorningDeliveredDateRef.current !== dateKey) {
      lastMorningDeliveredDateRef.current = dateKey;
      
      const timer = setTimeout(() => {
        const cycleInfo = getCurrentCycleInfo(currentDate, cycleSettings);
        const morningMsg = getCycleMorningMessage(cycleInfo);
        triggerNotification({
          title: morningMsg.title,
          message: morningMsg.message,
          type: 'cycle_morning',
          cyclePhase: cycleInfo.phase,
        });
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [currentDate, cycleSettings, triggerNotification]);

  const handleDismissToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    cuteSound.playCutePop();
  }, []);

  const handleSnooze = useCallback((id: string, minutes: number) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    cuteSound.playCutePop();

    // Show temporary notice and re-trigger after delay (e.g. 10s for fast test if 5m, or standard delay)
    const delayMs = minutes * 60 * 1000;
    setTimeout(() => {
      triggerNotification({
        title: `Snoozed Reminder (${minutes}m passed) 🌸`,
        message: 'Your snoozed timebox reminder is ready! Time to check in 🎀',
        type: 'event_reminder',
      });
    }, Math.min(delayMs, 15000)); // Capped at 15s in interactive sandbox so users can test snooze easily!
  }, [triggerNotification]);

  const handleTriggerTestReminder = useCallback(() => {
    triggerNotification({
      title: 'Coffee & Deep Work Timebox 🌸',
      message: 'Sweet reminder! Take a sip of water, stretch, and let’s start your focus sprint 🎀',
      type: 'test',
    });
  }, [triggerNotification]);

  const handleClearAllNotifications = useCallback(() => {
    setNotifications([]);
    setActiveToasts([]);
    cuteSound.playCutePop();
  }, []);

  // Periodic Reminder Checker
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentDateStr = formatDateKey(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      events.forEach((ev) => {
        if (!ev.reminders || ev.reminders.length === 0 || ev.isCompleted) return;
        const evDate = ev.date;

        // Check if event is on the same day as real time or simulated active day
        if (evDate !== currentDateStr && evDate !== formatDateKey(currentDate)) return;

        const startMin = timeToMinutes(ev.startTime);

        ev.reminders.forEach((rem) => {
          const reminderMin = startMin - rem.minutesBefore;
          const key = `${ev.id}-${rem.id}-${evDate}`;

          // If within current minute window and hasn't fired yet
          if (
            Math.abs(currentMinutes - reminderMin) <= 1 &&
            !triggeredRemindersRef.current.has(key)
          ) {
            triggeredRemindersRef.current.add(key);
            triggerNotification({
              title: `${ev.title} 💖`,
              message: rem.minutesBefore === 0
                ? `Starting right now at ${ev.startTime}! ⏰`
                : `Starting in ${rem.minutesBefore} minutes (${ev.startTime}) 🎀`,
              type: 'event_reminder',
              eventId: ev.id,
            });
          }
        });
      });
    };

    const interval = setInterval(checkReminders, 12000);
    return () => clearInterval(interval);
  }, [events, currentDate, triggerNotification]);

  // Filtered events with live search
  const searchedEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(q) ||
        ev.description?.toLowerCase().includes(q) ||
        ev.location?.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  // Date Navigation Handlers
  const handlePrev = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (currentView === 'day') {
        d.setDate(d.getDate() - 1);
      } else if (currentView === 'week') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setMonth(d.getMonth() - 1);
      }
      return d;
    });
  }, [currentView]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (currentView === 'day') {
        d.setDate(d.getDate() + 1);
      } else if (currentView === 'week') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  }, [currentView]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date(2026, 8, 28, 10, 0, 0));
  }, []);

  // Event handlers
  const handleSlotClick = useCallback((dateStr: string, timeStr: string) => {
    setEventToEdit(null);
    setSlotDate(dateStr);
    setSlotTime(timeStr);
    setIsEventModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setEventToEdit(event);
    setSlotDate(event.date);
    setSlotTime(event.startTime);
    setIsEventModalOpen(true);
  }, []);

  const handleSaveEvent = useCallback((eventData: CalendarEvent) => {
    setEvents((prev) => {
      const index = prev.findIndex((e) => e.id === eventData.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = eventData;
        return updated;
      }
      return [...prev, eventData];
    });

    // If event has reminders, play sweet sparkle feedback!
    if (eventData.reminders && eventData.reminders.length > 0) {
      cuteSound.playSparkle();
    }
  }, []);

  const handleDeleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const handleDuplicateEvent = useCallback((eventToDup: CalendarEvent) => {
    const sMin = timeToMinutes(eventToDup.startTime);
    const eMin = timeToMinutes(eventToDup.endTime);
    const dur = eMin - sMin;

    const newStart = minutesToTime(Math.min(1440 - dur, sMin + 60));
    const newEnd = minutesToTime(timeToMinutes(newStart) + dur);

    const dup: CalendarEvent = {
      ...eventToDup,
      id: `evt-${Date.now()}`,
      title: `${eventToDup.title} (Copy)`,
      startTime: newStart,
      endTime: newEnd,
      isCompleted: false,
    };
    setEvents((prev) => [...prev, dup]);
  }, []);

  const handleToggleComplete = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          const willBeCompleted = !e.isCompleted;
          if (willBeCompleted) {
            confetti({
              particleCount: 50,
              spread: 55,
              origin: { y: 0.8 },
              colors: ['#f472b6', '#ec4899', '#db2777', '#a855f7'],
            });
            cuteSound.playCuteChime();
          }
          return { ...e, isCompleted: willBeCompleted };
        }
        return e;
      })
    );
  }, []);

  const handleToggleSubtask = useCallback((eventId: string, subtaskId: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId || !ev.subtasks) return ev;
        const updatedSubtasks = ev.subtasks.map((st) =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        return { ...ev, subtasks: updatedSubtasks };
      })
    );
  }, []);

  // Backlog / Task Handlers
  const handleAddTask = useCallback((taskData: Omit<UnscheduledTask, 'id' | 'completed'>) => {
    const newTask: UnscheduledTask = {
      ...taskData,
      id: `task-${Date.now()}`,
      completed: false,
    };
    setTasks((prev) => [newTask, ...prev]);
  }, []);

  const handleToggleTaskComplete = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const handleToggleTaskReminder = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const current = t.reminderMinutesBefore;
        // Cycle: none -> 15m -> 30m -> 60m -> none
        const next = !current ? 15 : current === 15 ? 30 : current === 30 ? 60 : undefined;
        if (next) {
          cuteSound.playSparkle();
          triggerNotification({
            title: `Reminder Set for "${t.title}" 🎀`,
            message: `We'll remind you ${next} minutes before scheduling ✨`,
            type: 'task_reminder',
            taskId: t.id,
          });
        } else {
          cuteSound.playCutePop();
        }
        return { ...t, reminderMinutesBefore: next };
      })
    );
  }, [triggerNotification]);

  const handleScheduleTask = useCallback((task: UnscheduledTask) => {
    const activeDateStr = formatDateKey(currentDate);
    const startStr = '10:00';
    const endStr = minutesToTime(timeToMinutes(startStr) + task.estimatedMinutes);

    setEventToEdit(null);
    setSlotDate(activeDateStr);
    setSlotTime(startStr);

    const newEvent: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: task.title,
      description: task.description,
      category: task.category,
      date: activeDateStr,
      startTime: startStr,
      endTime: endStr,
      isCompleted: false,
      priority: task.priority,
      sourceTaskId: task.id,
      reminders: task.reminderMinutesBefore
        ? [{ id: `rem-${Date.now()}`, minutesBefore: task.reminderMinutesBefore, label: `${task.reminderMinutesBefore}m before 💖` }]
        : [{ id: `rem-${Date.now()}`, minutesBefore: 15, label: '15m before 💖' }],
    };

    setEventToEdit(newEvent);
    setIsEventModalOpen(true);
  }, [currentDate]);

  // Focus Mode Trigger
  const handleStartFocus = useCallback((event?: CalendarEvent) => {
    setFocusEvent(event || null);
    setIsFocusModalOpen(true);
  }, []);

  // Settings & Reset
  const handleResetData = useCallback(() => {
    setEvents(INITIAL_EVENTS);
    setTasks(INITIAL_TASKS);
    setNotifications(INITIAL_NOTIFICATIONS);
    localStorage.removeItem(EVENTS_STORAGE_KEY);
    localStorage.removeItem(TASKS_STORAGE_KEY);
    localStorage.removeItem(NOTIFS_STORAGE_KEY);
  }, []);

  const handleImportJson = useCallback(
    (data: { events: CalendarEvent[]; tasks: UnscheduledTask[] }) => {
      setEvents(data.events);
      setTasks(data.tasks);
    },
    []
  );

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        isEventModalOpen ||
        isFocusModalOpen ||
        isSettingsOpen ||
        isNotificationCenterOpen ||
        isCycleModalOpen ||
        isCalmModalOpen
      ) {
        if (e.key === 'Escape') {
          setIsEventModalOpen(false);
          setIsFocusModalOpen(false);
          setIsShortcutsOpen(false);
          setIsSettingsOpen(false);
          setIsNotificationCenterOpen(false);
          setIsCycleModalOpen(false);
          setIsCalmModalOpen(false);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 't':
          handleToday();
          break;
        case 'w':
          setCurrentView('week');
          break;
        case 'd':
          setCurrentView('day');
          break;
        case 'm':
          setCurrentView('month');
          break;
        case 'a':
          setCurrentView('audit');
          break;
        case 'c':
          e.preventDefault();
          setIsCycleModalOpen(true);
          break;
        case 's':
        case 'o':
          e.preventDefault();
          setIsCalmModalOpen(true);
          break;
        case 'b':
          e.preventDefault();
          setIsDressUpModalOpen(true);
          break;
        case 'p':
          e.preventDefault();
          setIsThemeModalOpen(true);
          break;
        case 'n':
          e.preventDefault();
          handleSlotClick(formatDateKey(currentDate), '09:00');
          break;
        case ' ':
          e.preventDefault();
          handleStartFocus();
          break;
        case '?':
          e.preventDefault();
          setIsShortcutsOpen(true);
          break;
        case '/':
          e.preventDefault();
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentDate,
    handleToday,
    handleSlotClick,
    handleStartFocus,
    isEventModalOpen,
    isFocusModalOpen,
    isSettingsOpen,
    isNotificationCenterOpen,
    isCycleModalOpen,
    isCalmModalOpen,
    isDressUpModalOpen,
    isThemeModalOpen,
  ]);

  // Filter upcoming events with reminders for today
  const activeDateKey = formatDateKey(currentDate);
  const upcomingEventsWithReminders = useMemo(() => {
    return events.filter(
      (ev) => ev.date === activeDateKey && ev.reminders && ev.reminders.length > 0 && !ev.isCompleted
    );
  }, [events, activeDateKey]);

  const upcomingTasksWithReminders = useMemo(() => {
    return tasks.filter((t) => !t.completed && !!t.reminderMinutesBefore);
  }, [tasks]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const activeThemeConfig = THEME_CONFIGS[currentTheme] || THEME_CONFIGS.pink;

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${activeThemeConfig.appBg}`}
      data-theme={currentTheme}
    >
      {/* 1. Universal Top Navigation Bar */}
      <TopNav
        currentView={currentView}
        onViewChange={setCurrentView}
        currentDate={currentDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onNewEvent={() => handleSlotClick(formatDateKey(currentDate), '09:00')}
        onOpenFocus={() => handleStartFocus()}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onOpenCycle={() => setIsCycleModalOpen(true)}
        cycleInfo={currentCycleInfo}
        onOpenCalmSanctuary={() => setIsCalmModalOpen(true)}
        onOpenDressUp={() => setIsDressUpModalOpen(true)}
        currentTheme={currentTheme}
        onOpenThemeSelector={() => setIsThemeModalOpen(true)}
        onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        unreadNotificationCount={unreadCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isFocusActive={isFocusModalOpen}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Mini calendar, Categories, Backlog) */}
        {currentView !== 'audit' && (
          <Sidebar
            currentDate={currentDate}
            onSelectDate={(d) => {
              setCurrentDate(d);
              if (currentView === 'month') setCurrentView('day');
            }}
            events={events}
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleTaskComplete={handleToggleTaskComplete}
            onDeleteTask={handleDeleteTask}
            onScheduleTask={handleScheduleTask}
            onToggleTaskReminder={handleToggleTaskReminder}
            selectedCategories={selectedCategories}
            onToggleCategory={handleToggleCategory}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            cycleSettings={cycleSettings}
            onOpenCycle={() => setIsCycleModalOpen(true)}
            onOpenCalmSanctuary={() => setIsCalmModalOpen(true)}
            onOpenDressUp={() => setIsDressUpModalOpen(true)}
            currentTheme={currentTheme}
            onOpenThemeSelector={() => setIsThemeModalOpen(true)}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Viewport Content (with pb-16 on mobile for the mobile bottom nav bar) */}
        <main className={`flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0 transition-colors duration-200 ${activeThemeConfig.surfaceBg}`}>
          {currentView === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={searchedEvents}
              selectedCategories={selectedCategories}
              onSelectEvent={handleSelectEvent}
              onSlotClick={handleSlotClick}
              onToggleComplete={handleToggleComplete}
              onDeleteEvent={handleDeleteEvent}
              onStartFocus={handleStartFocus}
              cycleSettings={cycleSettings}
            />
          )}

          {currentView === 'day' && (
            <DayView
              currentDate={currentDate}
              events={searchedEvents}
              tasks={tasks}
              selectedCategories={selectedCategories}
              onSelectEvent={handleSelectEvent}
              onSlotClick={handleSlotClick}
              onToggleComplete={handleToggleComplete}
              onToggleSubtask={handleToggleSubtask}
              onDeleteEvent={handleDeleteEvent}
              onStartFocus={handleStartFocus}
              onScheduleTask={handleScheduleTask}
              cycleSettings={cycleSettings}
              onOpenCycle={() => setIsCycleModalOpen(true)}
            />
          )}

          {currentView === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={searchedEvents}
              selectedCategories={selectedCategories}
              onSelectEvent={handleSelectEvent}
              onSlotClick={handleSlotClick}
              onSelectDate={(d) => {
                setCurrentDate(d);
                setCurrentView('day');
              }}
              cycleSettings={cycleSettings}
            />
          )}

          {currentView === 'audit' && (
            <TimeAuditView
              currentDate={currentDate}
              events={searchedEvents}
            />
          )}
        </main>
      </div>

      {/* 3. Floating Cutesy Toast Container */}
      <CuteToastContainer
        toasts={activeToasts}
        onDismiss={handleDismissToast}
        onSnooze={handleSnooze}
      />

      {/* 4. Cute Notification Drawer */}
      <CuteNotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        upcomingEvents={upcomingEventsWithReminders}
        upcomingTasks={upcomingTasksWithReminders}
        onDismiss={(id) => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
          setActiveToasts((prev) => prev.filter((t) => t.id !== id));
          cuteSound.playCutePop();
        }}
        onClearAll={handleClearAllNotifications}
        onSnooze={handleSnooze}
        onTriggerTestReminder={handleTriggerTestReminder}
        onTriggerCycleMorningNotification={handleTriggerCycleMorningNotification}
        onSelectEvent={(ev) => {
          setIsNotificationCenterOpen(false);
          handleSelectEvent(ev);
        }}
      />

      {/* 5. Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        eventToEdit={eventToEdit}
        defaultDate={slotDate}
        defaultTime={slotTime}
        allEvents={events}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        onDuplicate={handleDuplicateEvent}
      />

      <FocusModeModal
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        activeEvent={focusEvent}
        onCompleteEvent={handleToggleComplete}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        events={events}
        tasks={tasks}
        onResetData={handleResetData}
        onImportJson={handleImportJson}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
      />

      {/* Calendar Color Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
      />

      <CycleGlowModal
        isOpen={isCycleModalOpen}
        onClose={() => setIsCycleModalOpen(false)}
        currentDate={currentDate}
        settings={cycleSettings}
        onUpdateSettings={setCycleSettings}
        onTriggerMorningMessage={handleTriggerCycleMorningNotification}
        onScheduleSelfCare={(eventData) => {
          const newEv: CalendarEvent = {
            ...eventData,
            id: `evt-${Date.now()}`,
          };
          setEvents((prev) => [...prev, newEv]);
        }}
      />

      <CalmSanctuaryModal
        isOpen={isCalmModalOpen}
        onClose={() => setIsCalmModalOpen(false)}
        currentDate={currentDate}
        onScheduleDeStressBlock={(eventData) => {
          const newEv: CalendarEvent = {
            ...eventData,
            id: `evt-destress-${Date.now()}`,
          };
          setEvents((prev) => [...prev, newEv]);
          triggerNotification({
            title: `${newEv.title} Scheduled! 🌿`,
            message: 'Your calm sanctuary reset is locked in. Be kind to yourself today 💖',
            type: 'celebration',
          });
        }}
        onAddTaskToBacklog={(title, estimatedMinutes) => {
          const newTask: UnscheduledTask = {
            id: `task-${Date.now()}`,
            title,
            category: 'health',
            estimatedMinutes,
            priority: 'medium',
            completed: false,
          };
          setTasks((prev) => [newTask, ...prev]);
        }}
      />

      {/* Barbie Dress-Up Studio Modal */}
      <BarbieDressUpModal
        isOpen={isDressUpModalOpen}
        onClose={() => setIsDressUpModalOpen(false)}
        dollState={dollState}
        onUpdateDollState={setDollState}
        isCompanionActive={isCompanionActive}
        onToggleCompanion={() => setIsCompanionActive((prev) => !prev)}
      />

      {/* Floating Barbie Doll Screen Companion */}
      <FloatingBarbieCompanion
        isVisible={isCompanionActive}
        onOpenDressUp={() => setIsDressUpModalOpen(true)}
        onDismiss={() => setIsCompanionActive(false)}
        dollState={dollState}
      />

      {/* 6. Mobile Bottom Navigation Bar (Visible on mobile/tablet) */}
      <MobileBottomNav
        currentView={currentView}
        onViewChange={(v) => {
          setCurrentView(v);
          setIsMobileSidebarOpen(false);
        }}
        onOpenCycle={() => setIsCycleModalOpen(true)}
        onOpenCalmSanctuary={() => setIsCalmModalOpen(true)}
        onOpenDressUp={() => setIsDressUpModalOpen(true)}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        onNewEvent={() => handleSlotClick(formatDateKey(currentDate), '09:00')}
        cycleDay={currentCycleInfo.cycleDay}
        isPeriod={currentCycleInfo.isPeriod}
      />
    </div>
  );
}
