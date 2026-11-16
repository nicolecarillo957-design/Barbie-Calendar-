/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  triggerExtendedStreakCelebration,
  triggerTaskPointsCelebration,
} from './utils/celebrationConfetti';

import {
  AppNotification,
  CalendarEvent,
  CalendarViewType,
  EventCategory,
  FeedbackMessage,
  UnscheduledTask,
  TaskEvidence,
  StudentStreakData,
  UserProfileDoc,
  UserRole,
} from './types/calendar';
import { CATEGORY_LIST } from './utils/categories';
import { cuteSound } from './utils/cuteSound';
import {
  formatDateKey,
  minutesToTime,
  timeToMinutes,
} from './utils/dateUtils';
import {
  DEFAULT_STREAK_DATA,
  calculateUpdatedStreak,
} from './utils/streakUtils';
import {
  CREATOR_ADMIN_EMAIL,
  PortalUser,
  batchReorderAssignments,
  deleteEvent,
  deleteTask,
  ensureUserProfile,
  linkStudentEmailByTeacher,
  markTeacherNotificationsSeen,
  saveEvent,
  saveTask,
  signOutUser,
  subscribeAuthState,
  subscribeEvents,
  subscribeFeedbackMessages,
  subscribeMonitoredStudents,
  subscribeTasks,
  subscribeTeacherLinkNotifications,
  subscribeUserProfile,
  syncPortalNow,
  syncUserProfile,
  updateAssignedTeacherEmail,
  updateUserRole,
  verifyEventEvidence,
  verifyTaskEvidence,
} from './localPortal';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { MonthView } from './components/MonthView';
import { TimeAuditView } from './components/TimeAuditView';
import { AssignmentsView } from './components/AssignmentsView';
import { EventModal } from './components/EventModal';
import { FocusModeModal } from './components/FocusModeModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { SettingsModal } from './components/SettingsModal';
import { CuteNotificationCenter } from './components/CuteNotificationCenter';
import { CuteToastContainer } from './components/CuteToastContainer';
import { CalmSanctuaryModal } from './components/CalmSanctuaryModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { TaskInboxModal } from './components/TaskInboxModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { TaskEvidenceModal } from './components/TaskEvidenceModal';
import { TeacherMonitorModal } from './components/TeacherMonitorModal';
import { WeeklyInsightsView } from './components/WeeklyInsightsView';
import { WeeklySummaryModal } from './components/WeeklySummaryModal';
import { GmailLoginGate } from './components/GmailLoginGate';
import { RoleSelectionGate } from './components/RoleSelectionGate';
import { FeedbackChatBox } from './components/FeedbackChatBox';
import { CalendarThemeId, THEME_CONFIGS } from './types/theme';
import { Eye, GraduationCap, ArrowLeft, Copy, Check, FileText, Users, SlidersHorizontal, RefreshCw, UserPlus } from 'lucide-react';

const NOTIFS_STORAGE_KEY = 'edutrack_notifs_v1';
const THEME_STORAGE_KEY = 'calendar_color_theme_v1';

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-welcome',
    title: 'Welcome to EduTrack Calendar & Reward Portal! 🎀💖',
    message:
      'Sign in freely to start planning! Complete tasks with picture proofs to earn points and keep your study streak going.',
    timestamp: 'Just now',
    type: 'celebration',
    isRead: false,
  },
];

export default function App() {
  // 0. Local Portal Authentication State (No Firebase)
  const [currentUser, setCurrentUser] = useState<PortalUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAuthState(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await ensureUserProfile(user);
        } catch (err) {
          console.error('Failed initial profile sync', err);
        }
      } else {
        setUserRole(null);
        setProfileLoaded(false);
        setEvents([]);
        setTasks([]);
        setMonitoredStudents([]);
        setMonitoredStudent(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 1. Calendar Date State (starts on today)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // 2. Active View ('week' | 'day' | 'month' | 'assignments' | 'insights' | 'audit')
  const [currentView, setCurrentView] = useState<CalendarViewType>('week');

  // 3. Local-Synced User Profile, Role, Student Monitoring & Calendar Data
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [studentName, setStudentName] = useState<string>('Student');
  const [teacherEmail, setTeacherEmail] = useState<string>('');
  const [streakData, setStreakData] = useState<StudentStreakData>(DEFAULT_STREAK_DATA);

  const [monitoredStudents, setMonitoredStudents] = useState<UserProfileDoc[]>([]);
  const [monitoredStudent, setMonitoredStudent] = useState<UserProfileDoc | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<UnscheduledTask[]>([]);

  const isCreatorAdmin =
    (currentUser?.email || '').toLowerCase() === CREATOR_ADMIN_EMAIL.toLowerCase();
  const isTeacherAccount = userRole === 'teacher';

  // Listener A: Own User Profile
  useEffect(() => {
    if (authLoading || !currentUser) return;

    const unsubscribe = subscribeUserProfile(currentUser.uid, (data) => {
      setProfileLoaded(true);
      if (!data) return;
      const roleFromDb =
        data.role === 'teacher' || data.role === 'student' ? (data.role as UserRole) : null;
      setUserRole(roleFromDb);
      setStudentName(
        data.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Student'
      );
      setTeacherEmail(data.teacherEmail || '');
      setStreakData({
        currentStreak: data.currentStreak ?? 0,
        bestStreak: data.bestStreak ?? 0,
        totalPoints: data.totalPoints ?? 0,
        lastActiveDate: data.lastActiveDate,
        historyDates: Array.isArray(data.historyDates) ? data.historyDates : [],
      });
    });

    return () => unsubscribe();
  }, [authLoading, currentUser]);

  // Listener B: Students Assigned to Current User's Email (or All Users for Creator Admin)
  useEffect(() => {
    if (authLoading || !currentUser || !currentUser.email) return;

    const unsubscribe = subscribeMonitoredStudents(currentUser, isCreatorAdmin, (list) => {
      setMonitoredStudents(list);
      setMonitoredStudent((prev) => {
        if (!prev) return null;
        const refreshed = list.find((s) => s.uid === prev.uid);
        return refreshed || null;
      });
    });

    return () => unsubscribe();
  }, [authLoading, currentUser, isCreatorAdmin]);

  // Auto-select first linked student for Teachers; reset monitoredStudent when switching back to Student
  useEffect(() => {
    if (isTeacherAccount) {
      if (!monitoredStudent && monitoredStudents.length > 0) {
        setMonitoredStudent(monitoredStudents[0]);
      }
    }
  }, [isTeacherAccount, monitoredStudents, monitoredStudent]);

  // For teachers: ONLY show a monitored student's calendar (never personal teacher tasks/events)
  const activeTargetUid = isTeacherAccount
    ? monitoredStudent?.uid || null
    : monitoredStudent
    ? monitoredStudent.uid
    : currentUser?.uid || null;
  const isMonitoringOtherStudent = Boolean(
    monitoredStudent && currentUser && monitoredStudent.uid !== currentUser.uid
  );
  const isCalendarReadOnly = isTeacherAccount || isMonitoringOtherStudent;

  // Listener C: Events for Active Calendar (Own or Selected Student)
  useEffect(() => {
    if (authLoading || !currentUser) return;
    if (!activeTargetUid) {
      setEvents([]);
      return;
    }

    const unsubscribe = subscribeEvents(activeTargetUid, (loaded) => {
      setEvents(loaded);
    });

    return () => unsubscribe();
  }, [authLoading, currentUser, activeTargetUid]);

  // Listener D: Tasks for Active Calendar (Own or Selected Student)
  useEffect(() => {
    if (authLoading || !currentUser) return;
    if (!activeTargetUid) {
      setTasks([]);
      return;
    }

    const unsubscribe = subscribeTasks(activeTargetUid, (loaded) => {
      setTasks(loaded);
    });

    return () => unsubscribe();
  }, [authLoading, currentUser, activeTargetUid]);

  // 4. Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(NOTIFS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
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

  // 5. Category Filters
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

  // 6. Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // 7. Modal Controls
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
  const [isCalmModalOpen, setIsCalmModalOpen] = useState(false);
  const [isTaskInboxOpen, setIsTaskInboxOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isTeacherMonitorOpen, setIsTeacherMonitorOpen] = useState(false);
  const [isTeacherSummaryOpen, setIsTeacherSummaryOpen] = useState(false);
  const [isFeedbackChatOpen, setIsFeedbackChatOpen] = useState(false);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);
  const [copiedTeacherGmailBanner, setCopiedTeacherGmailBanner] = useState(false);
  const [teacherBannerStudentEmail, setTeacherBannerStudentEmail] = useState('');
  const [teacherBannerLinkMsg, setTeacherBannerLinkMsg] = useState('');
  const [teacherBannerLinkErr, setTeacherBannerLinkErr] = useState('');
  const [teacherRefreshing, setTeacherRefreshing] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [evidenceTarget, setEvidenceTarget] = useState<{
    type: 'event' | 'task';
    id: string;
    title: string;
    category?: string;
    pointsValue?: number;
    existingEvidence?: TaskEvidence;
  } | null>(null);

  // 8. Calendar Color Theme State
  const [currentTheme, setCurrentTheme] = useState<CalendarThemeId>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as CalendarThemeId | null;
      if (
        stored &&
        [
          'pink',
          'blue',
          'red',
          'orange',
          'black',
          'yellow',
          'white',
          'green',
          'purple',
          'rainbow',
        ].includes(stored)
      ) {
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

  // Trigger Notification Function
  const triggerNotification = useCallback(
    (notifData: {
      title: string;
      message: string;
      type: 'event_reminder' | 'task_reminder' | 'test' | 'celebration';
      eventId?: string;
      taskId?: string;
    }) => {
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: notifData.title,
        message: notifData.message,
        type: notifData.type,
        eventId: notifData.eventId,
        taskId: notifData.taskId,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isRead: false,
      };

      setNotifications((prev) => [newNotif, ...prev]);
      setActiveToasts((prev) => [newNotif, ...prev.slice(0, 2)]);
      cuteSound.playCuteChime();

      setTimeout(() => {
        setActiveToasts((prev) => prev.filter((t) => t.id !== newNotif.id));
      }, 9000);
    },
    []
  );

  // Instant Teacher Notification Listener (triggers immediately whenever a student links your Gmail)
  const notifiedLinkIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading || !currentUser?.email || !currentUser?.uid) return;

    const unsubscribe = subscribeTeacherLinkNotifications(
      currentUser.email,
      currentUser.uid,
      (pending) => {
        const fresh = pending.filter((n) => !notifiedLinkIdsRef.current.has(n.id));
        if (fresh.length === 0) return;
        fresh.forEach((n) => {
          notifiedLinkIdsRef.current.add(n.id);
          triggerNotification({
            title: `New Student Linked: ${n.studentName} 👩‍🏫💖`,
            message: `${n.studentName} (${n.studentEmail}) linked your teacher Gmail! You can now monitor their calendar, tasks, and picture proofs.`,
            type: 'celebration',
          });
        });
        void markTeacherNotificationsSeen(
          fresh.map((n) => n.id),
          currentUser.uid
        );
      }
    );

    return () => unsubscribe();
  }, [authLoading, currentUser?.email, currentUser?.uid, triggerNotification]);

  // Instant Two-Way Feedback & Creator Inbox Notification Listener
  const notifiedFeedbackEventKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading || !currentUser?.email) {
      setUnreadFeedbackCount(0);
      return;
    }

    const unsubscribe = subscribeFeedbackMessages(
      currentUser,
      isCreatorAdmin,
      (list: FeedbackMessage[]) => {
        if (isCreatorAdmin) {
          const unreadMsgs = list.filter(
            (m) =>
              (m.senderEmail || '').trim().toLowerCase() !== CREATOR_ADMIN_EMAIL.toLowerCase() &&
              (m.seenByCreator === false ||
                (m.seenByCreator === undefined && !m.replyText && !(m.replies && m.replies.length > 0)))
          );
          setUnreadFeedbackCount(unreadMsgs.length);

          unreadMsgs.forEach((m) => {
            const replies = Array.isArray(m.replies) ? m.replies : [];
            const latestReply = replies[replies.length - 1];
            const latestUserText =
              latestReply && !latestReply.isCreator ? latestReply.text : m.text;
            const notifyKey = `creator_${m.id}_${replies.length}`;
            if (!notifiedFeedbackEventKeysRef.current.has(notifyKey)) {
              notifiedFeedbackEventKeysRef.current.add(notifyKey);
              triggerNotification({
                title: `New Chat from ${m.senderName} 💬💖`,
                message: `From ${m.senderEmail}: "${latestUserText.slice(0, 110)}${
                  latestUserText.length > 110 ? '...' : ''
                }"`,
                type: 'celebration',
              });
            }
          });
        } else {
          const unreadReplies = list.filter((m) => m.seenBySender === false);
          setUnreadFeedbackCount(unreadReplies.length);

          unreadReplies.forEach((m) => {
            const replyCount = Array.isArray(m.replies) ? m.replies.length : m.replyText ? 1 : 0;
            const notifyKey = `user_${m.id}_${replyCount}`;
            if (!notifiedFeedbackEventKeysRef.current.has(notifyKey)) {
              notifiedFeedbackEventKeysRef.current.add(notifyKey);
              const latestText =
                (Array.isArray(m.replies) && m.replies.length > 0
                  ? m.replies[m.replies.length - 1].text
                  : m.replyText || m.text) || '';
              triggerNotification({
                title: `Message from Maker (${CREATOR_ADMIN_EMAIL}) 💖`,
                message: latestText.slice(0, 130) + (latestText.length > 130 ? '...' : ''),
                type: 'celebration',
              });
            }
          });
        }
      }
    );

    return () => unsubscribe();
  }, [authLoading, currentUser, isCreatorAdmin, triggerNotification]);

  const notifyReadOnlyMonitoring = useCallback(() => {
    triggerNotification({
      title: 'Teacher View-Only Monitoring 👩‍🏫',
      message: isTeacherAccount
        ? `Teachers monitor student calendars view-only. Tap "Review Proofs" to verify ${
            monitoredStudent?.displayName || 'the student'
          }'s submitted photos and leave feedback.`
        : `You are viewing ${
            monitoredStudent?.displayName || 'a student'
          }'s calendar. Click "Back to My Calendar" to edit your own schedule, or open Teacher Monitor to verify photo proofs.`,
      type: 'celebration',
    });
  }, [isTeacherAccount, monitoredStudent, triggerNotification]);

  const handleDismissToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    cuteSound.playCutePop();
  }, []);

  const handleSnooze = useCallback(
    (id: string, minutes: number) => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== id));
      cuteSound.playCutePop();

      const delayMs = minutes * 60 * 1000;
      setTimeout(() => {
        triggerNotification({
          title: `Snoozed Reminder (${minutes}m passed) 🌸`,
          message: 'Your snoozed timebox reminder is ready! Time to check in 🎀',
          type: 'event_reminder',
        });
      }, Math.min(delayMs, 15000));
    },
    [triggerNotification]
  );

  const handleTriggerTestReminder = useCallback(() => {
    triggerNotification({
      title: 'Study Focus Reminder 🌸',
      message:
        'Sweet reminder! Take a sip of water, stretch, and let’s start your focus sprint 🎀',
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

        if (evDate !== currentDateStr && evDate !== formatDateKey(currentDate)) return;

        const startMin = timeToMinutes(ev.startTime);

        ev.reminders.forEach((rem) => {
          const reminderMin = startMin - rem.minutesBefore;
          const key = `${ev.id}-${rem.id}-${evDate}`;

          if (
            Math.abs(currentMinutes - reminderMin) <= 1 &&
            !triggeredRemindersRef.current.has(key)
          ) {
            triggeredRemindersRef.current.add(key);
            triggerNotification({
              title: `${ev.title} 💖`,
              message:
                rem.minutesBefore === 0
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
    setCurrentDate(new Date());
  }, []);

  // Event handlers
  const handleSlotClick = useCallback(
    (dateStr: string, timeStr: string) => {
      if (isCalendarReadOnly) {
        notifyReadOnlyMonitoring();
        return;
      }
      setEventToEdit(null);
      setSlotDate(dateStr);
      setSlotTime(timeStr);
      setIsEventModalOpen(true);
    },
    [isCalendarReadOnly, notifyReadOnlyMonitoring]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (isCalendarReadOnly) {
        setIsTeacherMonitorOpen(true);
        return;
      }
      setEventToEdit(event);
      setSlotDate(event.date);
      setSlotTime(event.startTime);
      setIsEventModalOpen(true);
    },
    [isCalendarReadOnly]
  );

  const handleSaveEvent = useCallback(
    async (eventData: CalendarEvent) => {
      if (!currentUser || isCalendarReadOnly) return;
      await saveEvent(currentUser.uid, eventData);

      if (eventData.reminders && eventData.reminders.length > 0) {
        cuteSound.playSparkle();
      }
    },
    [currentUser, isCalendarReadOnly]
  );

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      if (!currentUser || isCalendarReadOnly) {
        if (isCalendarReadOnly) notifyReadOnlyMonitoring();
        return;
      }
      await deleteEvent(currentUser.uid, eventId);
    },
    [currentUser, isCalendarReadOnly, notifyReadOnlyMonitoring]
  );

  const handleDuplicateEvent = useCallback(
    async (eventToDup: CalendarEvent) => {
      if (!currentUser || isCalendarReadOnly) return;
      const sMin = timeToMinutes(eventToDup.startTime);
      const eMin = timeToMinutes(eventToDup.endTime);
      const dur = eMin - sMin;

      const newStart = minutesToTime(Math.min(1440 - dur, sMin + 60));
      const newEnd = minutesToTime(timeToMinutes(newStart) + dur);

      const dup: CalendarEvent = {
        ...eventToDup,
        id: `evt_${Date.now()}`,
        title: `${eventToDup.title} (Copy)`,
        startTime: newStart,
        endTime: newEnd,
        isCompleted: false,
        evidence: undefined,
      };
      await saveEvent(currentUser.uid, dup);
    },
    [currentUser, isCalendarReadOnly]
  );

  const handleToggleComplete = useCallback(
    async (eventId: string) => {
      if (!currentUser) return;
      if (isCalendarReadOnly) {
        setIsTeacherMonitorOpen(true);
        return;
      }
      const target = events.find((e) => e.id === eventId);
      if (!target) return;

      if (target.isCompleted) {
        await saveEvent(currentUser.uid, { ...target, isCompleted: false });
        cuteSound.playCutePop();
      } else {
        setEvidenceTarget({
          type: 'event',
          id: target.id,
          title: target.title,
          category: target.category,
          pointsValue:
            target.pointsValue ||
            (target.category === 'deep_work' || target.category === 'planning'
              ? 10
              : 5),
          existingEvidence: target.evidence,
        });
        setIsEvidenceModalOpen(true);
        cuteSound.playSparkle();
      }
    },
    [currentUser, isCalendarReadOnly, events]
  );

  const handleConfirmCompletionWithEvidence = useCallback(
    async (evidence: TaskEvidence) => {
      if (!evidenceTarget || !currentUser || isCalendarReadOnly) return;

      const points = evidence.pointsEarned;
      const completedDate = formatDateKey(currentDate);

      if (evidenceTarget.type === 'event') {
        const target = events.find((e) => e.id === evidenceTarget.id);
        if (target) {
          await saveEvent(currentUser.uid, {
            ...target,
            isCompleted: true,
            evidence,
            pointsValue: points,
          });
        }
      } else {
        const target = tasks.find((t) => t.id === evidenceTarget.id);
        if (target) {
          await saveTask(currentUser.uid, {
            ...target,
            completed: true,
            evidence,
            pointsValue: points,
          });
        }
      }

      const updatedStreak = calculateUpdatedStreak(streakData, completedDate, points);
      await syncUserProfile(
        currentUser,
        updatedStreak,
        studentName,
        teacherEmail || undefined
      );

      const hitSevenDayMilestone =
        updatedStreak.currentStreak >= 7 &&
        updatedStreak.currentStreak > streakData.currentStreak &&
        updatedStreak.currentStreak % 7 === 0;

      triggerTaskPointsCelebration(
        points,
        updatedStreak.currentStreak,
        streakData.currentStreak
      );

      triggerNotification({
        title: hitSevenDayMilestone
          ? `${updatedStreak.currentStreak}-Day Streak Milestone! +${points} Points! 🔥🎉`
          : `Task Verified! +${points} Points & Streak Burning! 🔥`,
        message: hitSevenDayMilestone
          ? `Incredible ${updatedStreak.currentStreak}-day study streak unlocked! Picture proof stamped at ${
              evidence.completedTimeFormatted.split(' at ')[1] || 'now'
            }. 💖`
          : `Picture proof stamped at ${
              evidence.completedTimeFormatted.split(' at ')[1] || 'now'
            }. Teacher can review anytime! 💖`,
        type: 'celebration',
      });

      setEvidenceTarget(null);
    },
    [
      evidenceTarget,
      currentUser,
      isCalendarReadOnly,
      currentDate,
      events,
      tasks,
      teacherEmail,
      streakData,
      studentName,
      triggerNotification,
    ]
  );

  const handleCelebrateStreak = useCallback(() => {
    triggerExtendedStreakCelebration();
    triggerNotification({
      title: `${streakData.currentStreak}-Day Study Streak Milestone! 🔥🎉`,
      message:
        'Amazing consistency! Celebrate your 7-day study milestone and keep completing tasks with picture proof!',
      type: 'celebration',
    });
  }, [streakData.currentStreak, triggerNotification]);

  const handleUpdateEventEvidence = useCallback(
    async (eventId: string, updatedEvidence: TaskEvidence) => {
      if (!activeTargetUid) return;
      await verifyEventEvidence(activeTargetUid, eventId, updatedEvidence);
    },
    [activeTargetUid]
  );

  const handleUpdateTaskEvidence = useCallback(
    async (taskId: string, updatedEvidence: TaskEvidence) => {
      if (!activeTargetUid) return;
      await verifyTaskEvidence(activeTargetUid, taskId, updatedEvidence);
    },
    [activeTargetUid]
  );

  const handleToggleSubtask = useCallback(
    async (eventId: string, subtaskId: string) => {
      if (!currentUser || isCalendarReadOnly) {
        if (isCalendarReadOnly) notifyReadOnlyMonitoring();
        return;
      }
      const ev = events.find((item) => item.id === eventId);
      if (!ev || !ev.subtasks) return;
      const updatedSubtasks = ev.subtasks.map((st) =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );
      await saveEvent(currentUser.uid, { ...ev, subtasks: updatedSubtasks });
    },
    [currentUser, isCalendarReadOnly, notifyReadOnlyMonitoring, events]
  );

  // Backlog / Task Handlers
  const handleAddTask = useCallback(
    async (taskData: Omit<UnscheduledTask, 'id' | 'completed'>) => {
      if (!currentUser || isCalendarReadOnly) {
        if (isCalendarReadOnly) notifyReadOnlyMonitoring();
        return;
      }
      const newTask: UnscheduledTask = {
        ...taskData,
        id: `task_${Date.now()}`,
        completed: false,
      };
      await saveTask(currentUser.uid, newTask);
    },
    [currentUser, isCalendarReadOnly, notifyReadOnlyMonitoring]
  );

  const handleUpdateTask = useCallback(
    async (updatedTask: UnscheduledTask) => {
      if (!currentUser || isCalendarReadOnly) {
        if (isCalendarReadOnly) notifyReadOnlyMonitoring();
        return;
      }
      await saveTask(currentUser.uid, updatedTask);
    },
    [currentUser, isCalendarReadOnly, notifyReadOnlyMonitoring]
  );

  const handleToggleTaskComplete = useCallback(
    async (taskId: string) => {
      if (!currentUser) return;
      if (isCalendarReadOnly) {
        notifyReadOnlyMonitoring();
        return;
      }
      const target = tasks.find((t) => t.id === taskId);
      if (!target) return;

      if (target.completed) {
        await saveTask(currentUser.uid, { ...target, completed: false });
        cuteSound.playCutePop();
      } else {
        setEvidenceTarget({
          type: 'task',
          id: target.id,
          title: target.title,
          category: target.category,
          pointsValue: target.pointsValue || 5,
          existingEvidence: target.evidence,
        });
        setIsEvidenceModalOpen(true);
        cuteSound.playSparkle();
      }
    },
    [currentUser, isCalendarReadOnly, notifyReadOnlyMonitoring, tasks]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      if (!currentUser || isCalendarReadOnly) {
        if (isCalendarReadOnly) notifyReadOnlyMonitoring();
        return;
      }
      await deleteTask(currentUser.uid, taskId);
    },
    [currentUser, isCalendarReadOnly, notifyReadOnlyMonitoring]
  );

  const handleToggleTaskReminder = useCallback(
    async (taskId: string) => {
      if (!currentUser || isCalendarReadOnly) return;
      const target = tasks.find((t) => t.id === taskId);
      if (!target) return;
      const current = target.reminderMinutesBefore;
      const next = !current ? 15 : current === 15 ? 30 : current === 30 ? 60 : undefined;

      await saveTask(currentUser.uid, { ...target, reminderMinutesBefore: next });

      if (next) {
        cuteSound.playSparkle();
        triggerNotification({
          title: `Reminder Set for "${target.title}" 🎀`,
          message: `We'll remind you ${next} minutes before scheduling ✨`,
          type: 'task_reminder',
          taskId: target.id,
        });
      } else {
        cuteSound.playCutePop();
      }
    },
    [currentUser, isCalendarReadOnly, tasks, triggerNotification]
  );

  const handleScheduleTask = useCallback(
    (task: UnscheduledTask) => {
      if (isCalendarReadOnly) {
        notifyReadOnlyMonitoring();
        return;
      }
      const activeDateStr = formatDateKey(currentDate);
      const startStr = '10:00';
      const endStr = minutesToTime(timeToMinutes(startStr) + task.estimatedMinutes);

      setSlotDate(activeDateStr);
      setSlotTime(startStr);

      const newEvent: CalendarEvent = {
        id: `evt_${Date.now()}`,
        title: task.title,
        subject: task.subject,
        description: task.description,
        category: task.category,
        date: task.dueDate || activeDateStr,
        startTime: startStr,
        endTime: endStr,
        isCompleted: false,
        priority: task.priority,
        pointsValue: task.pointsValue,
        sourceTaskId: task.id,
        reminders: task.reminderMinutesBefore
          ? [
              {
                id: `rem_${Date.now()}`,
                minutesBefore: task.reminderMinutesBefore,
                label: `${task.reminderMinutesBefore}m before 💖`,
              },
            ]
          : [
              {
                id: `rem_${Date.now()}`,
                minutesBefore: 15,
                label: '15m before 💖',
              },
            ],
      };

      setEventToEdit(newEvent);
      setIsEventModalOpen(true);
    },
    [currentDate, isCalendarReadOnly, notifyReadOnlyMonitoring]
  );

  // Focus Mode Trigger (Student only)
  const handleStartFocus = useCallback(
    (event?: CalendarEvent) => {
      if (isTeacherAccount) return;
      setFocusEvent(event || null);
      setIsFocusModalOpen(true);
    },
    [isTeacherAccount]
  );

  const handleBatchReorderAssignments = useCallback(
    async (updates: { tasks: UnscheduledTask[]; events: CalendarEvent[] }) => {
      if (!currentUser || isCalendarReadOnly) return;
      await batchReorderAssignments(currentUser.uid, updates);
    },
    [currentUser, isCalendarReadOnly]
  );

  // Student/Teacher Profile, Role & Teacher Link Updates
  const handleSelectUserRole = useCallback(
    async (role: UserRole) => {
      if (!currentUser) return;
      setUserRole(role);
      if (role === 'student') {
        setMonitoredStudent(null);
      } else if (monitoredStudents.length > 0 && !monitoredStudent) {
        setMonitoredStudent(monitoredStudents[0]);
      }
      await updateUserRole(currentUser, role, streakData, studentName);
    },
    [currentUser, monitoredStudents, monitoredStudent, streakData, studentName]
  );

  const handleUpdateStudentName = useCallback(
    async (newName: string) => {
      if (!currentUser) return;
      setStudentName(newName);
      await syncUserProfile(
        currentUser,
        streakData,
        newName,
        teacherEmail || undefined
      );
    },
    [currentUser, streakData, teacherEmail]
  );

  const handleUpdateTeacherEmail = useCallback(
    async (newTeacherEmail: string) => {
      if (!currentUser) return;
      const cleaned = newTeacherEmail.trim().toLowerCase();
      setTeacherEmail(cleaned);
      await updateAssignedTeacherEmail(
        currentUser,
        cleaned,
        events,
        tasks,
        streakData,
        studentName
      );
      if (cleaned) {
        triggerNotification({
          title: 'Teacher Gmail Linked! 👩‍🏫✨',
          message: `We notified ${cleaned} right away so they can monitor your calendar and reward progress.`,
          type: 'celebration',
        });
      }
    },
    [currentUser, events, tasks, streakData, studentName, triggerNotification]
  );

  // Settings Reset & Import
  const handleResetData = useCallback(async () => {
    if (!currentUser || isCalendarReadOnly) return;
    await Promise.all([
      ...events.map((ev) => deleteEvent(currentUser.uid, ev.id)),
      ...tasks.map((t) => deleteTask(currentUser.uid, t.id)),
    ]);
    setNotifications(INITIAL_NOTIFICATIONS);
    localStorage.removeItem(NOTIFS_STORAGE_KEY);
  }, [currentUser, isCalendarReadOnly, events, tasks]);

  const handleImportJson = useCallback(
    async (data: { events: CalendarEvent[]; tasks: UnscheduledTask[] }) => {
      if (!currentUser || isCalendarReadOnly) return;
      await Promise.all([
        ...data.events.map((ev) => saveEvent(currentUser.uid, ev)),
        ...data.tasks.map((t) => saveTask(currentUser.uid, t)),
      ]);
    },
    [currentUser, isCalendarReadOnly]
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
        isCalmModalOpen ||
        isTaskInboxOpen ||
        isTeacherMonitorOpen ||
        isFeedbackChatOpen
      ) {
        if (e.key === 'Escape') {
          setIsEventModalOpen(false);
          setIsFocusModalOpen(false);
          setIsShortcutsOpen(false);
          setIsSettingsOpen(false);
          setIsNotificationCenterOpen(false);
          setIsCalmModalOpen(false);
          setIsTaskInboxOpen(false);
          setIsTeacherMonitorOpen(false);
          setIsFeedbackChatOpen(false);
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
        case 'v':
          setCurrentView('insights');
          break;
        case 's':
        case 'o':
          if (!isTeacherAccount) {
            e.preventDefault();
            setIsCalmModalOpen(true);
          }
          break;
        case 'i':
          if (!isTeacherAccount) {
            e.preventDefault();
            setIsTaskInboxOpen(true);
          }
          break;
        case 'p':
          e.preventDefault();
          setIsThemeModalOpen(true);
          break;
        case 'n':
          if (!isCalendarReadOnly) {
            e.preventDefault();
            handleSlotClick(formatDateKey(currentDate), '09:00');
          }
          break;
        case ' ':
          if (!isTeacherAccount) {
            e.preventDefault();
            handleStartFocus();
          }
          break;
        case '?':
          e.preventDefault();
          setIsShortcutsOpen(true);
          break;
        case '/': {
          e.preventDefault();
          const searchInput = document.querySelector(
            'input[type="text"]'
          ) as HTMLInputElement;
          if (searchInput) searchInput.focus();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentDate,
    handleToday,
    handleSlotClick,
    handleStartFocus,
    isTeacherAccount,
    isCalendarReadOnly,
    isEventModalOpen,
    isFocusModalOpen,
    isSettingsOpen,
    isNotificationCenterOpen,
    isCalmModalOpen,
    isTaskInboxOpen,
    isThemeModalOpen,
    isTeacherMonitorOpen,
  ]);

  const activeDateKey = formatDateKey(currentDate);
  const upcomingEventsWithReminders = useMemo(() => {
    return events.filter(
      (ev) =>
        ev.date === activeDateKey &&
        ev.reminders &&
        ev.reminders.length > 0 &&
        !ev.isCompleted
    );
  }, [events, activeDateKey]);

  const upcomingTasksWithReminders = useMemo(() => {
    return tasks.filter((t) => !t.completed && !!t.reminderMinutesBefore);
  }, [tasks]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const pendingProofCount = useMemo(() => {
    const evPending = events.filter((e) => e.evidence && !e.evidence.teacherVerified).length;
    const taskPending = tasks.filter((t) => t.evidence && !t.evidence.teacherVerified).length;
    return evPending + taskPending;
  }, [events, tasks]);

  const activeThemeConfig = THEME_CONFIGS[currentTheme] || THEME_CONFIGS.pink;

  // Derived active display identity (own vs monitored student)
  const displayedStudentName = monitoredStudent
    ? monitoredStudent.displayName
    : isTeacherAccount
    ? 'No Student Selected'
    : studentName;
  const displayedStudentEmail = monitoredStudent
    ? monitoredStudent.email
    : isTeacherAccount
    ? ''
    : currentUser?.email || '';
  const displayedStudentPhoto = monitoredStudent
    ? monitoredStudent.photoURL
    : isTeacherAccount
    ? undefined
    : currentUser?.photoURL || undefined;
  const displayedStreakData: StudentStreakData = monitoredStudent
    ? {
        currentStreak: monitoredStudent.currentStreak,
        bestStreak: monitoredStudent.bestStreak,
        totalPoints: monitoredStudent.totalPoints,
        lastActiveDate: monitoredStudent.lastActiveDate,
        historyDates: monitoredStudent.historyDates || [],
      }
    : isTeacherAccount
    ? DEFAULT_STREAK_DATA
    : streakData;

  if (authLoading || (currentUser && !profileLoaded)) {
    return (
      <div className="min-h-[100dvh] w-full bg-gradient-to-br from-pink-100 via-rose-50 to-fuchsia-100 flex flex-col items-center justify-center p-4 font-sans text-pink-950">
        <div className="w-14 h-14 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-lg animate-bounce mb-3 text-2xl">
          📅
        </div>
        <h1 className="text-lg font-black text-center">EduTrack Calendar &amp; Reward Portal</h1>
        <p className="text-xs text-pink-700 font-medium mt-1">
          Connecting your calendar &amp; rewards...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <GmailLoginGate />;
  }

  if (!userRole) {
    return (
      <RoleSelectionGate
        user={currentUser}
        displayName={studentName || currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
        onSelectRole={handleSelectUserRole}
        onSignOut={signOutUser}
      />
    );
  }

  return (
    <div
      className={`flex flex-col h-[100dvh] w-full overflow-hidden font-sans transition-colors duration-200 ${activeThemeConfig.appBg}`}
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
        onOpenMessages={() => setIsFeedbackChatOpen((prev) => !prev)}
        unreadMessageCount={unreadFeedbackCount}
        onOpenCalmSanctuary={() => setIsCalmModalOpen(true)}
        onOpenInbox={() => setIsTaskInboxOpen(true)}
        pendingTaskCount={tasks.filter((t) => !t.completed).length}
        currentTheme={currentTheme}
        onOpenThemeSelector={() => setIsThemeModalOpen(true)}
        onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        unreadNotificationCount={unreadCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isFocusActive={isFocusModalOpen}
        streakDays={displayedStreakData.currentStreak}
        totalPoints={displayedStreakData.totalPoints}
        onOpenTeacherMonitor={() => setIsTeacherMonitorOpen(true)}
        isTeacherMode={isMonitoringOtherStudent}
        userRole={userRole}
        pendingProofCount={pendingProofCount}
        userEmail={currentUser.email || undefined}
        userName={studentName}
        userPhotoUrl={currentUser.photoURL || undefined}
        onSignOut={signOutUser}
      />

      {/* Teacher Monitoring Classroom Bar (Teachers only: 1-tap student switcher & proof review) */}
      {isTeacherAccount && monitoredStudents.length > 0 && (
        <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-pink-600 text-white flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-md z-20">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Monitoring:</span>
            </span>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {monitoredStudents.map((stu) => {
                const isSelected = monitoredStudent?.uid === stu.uid;
                return (
                  <button
                    key={stu.uid}
                    type="button"
                    onClick={() => setMonitoredStudent(stu)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shrink-0 ${
                      isSelected
                        ? 'bg-white text-purple-900 shadow-xs'
                        : 'bg-white/15 hover:bg-white/25 text-white'
                    }`}
                  >
                    {stu.photoURL && (
                      <img
                        src={stu.photoURL}
                        alt={stu.displayName}
                        className="w-4 h-4 rounded-full border border-white/60 shrink-0"
                      />
                    )}
                    <span className="truncate max-w-[100px]">{stu.displayName}</span>
                    <span
                      className={`text-[10px] font-mono truncate max-w-[130px] hidden sm:inline ${
                        isSelected ? 'text-purple-700' : 'text-pink-100'
                      }`}
                    >
                      ({stu.email})
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-amber-700' : 'text-amber-200'
                      }`}
                    >
                      🔥{stu.currentStreak}d
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsTeacherMonitorOpen(true)}
              className="px-2.5 sm:px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center gap-1 transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Proofs{pendingProofCount > 0 ? ` (${pendingProofCount})` : ''}</span>
            </button>
            <button
              onClick={() => setIsTeacherSummaryOpen(true)}
              className="hidden sm:flex px-2.5 sm:px-3 py-1 bg-white text-purple-900 hover:bg-pink-50 rounded-lg text-xs font-extrabold items-center gap-1 transition-colors shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Weekly Summary</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner for Student Role temporarily inspecting another linked student */}
      {!isTeacherAccount && isMonitoringOtherStudent && monitoredStudent && (
        <div className="px-4 py-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-md z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-xl bg-white/20 shrink-0">
              <Eye className="w-4 h-4 text-white" />
            </span>
            {monitoredStudent.photoURL && (
              <img
                src={monitoredStudent.photoURL}
                alt={monitoredStudent.displayName}
                className="w-6 h-6 rounded-full border border-white shrink-0"
              />
            )}
            <div className="text-xs min-w-0">
              <span className="font-black">Monitoring Student Calendar: </span>
              <span className="font-extrabold underline decoration-pink-200">
                {monitoredStudent.displayName}
              </span>
              <span className="ml-1.5 font-mono text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
                {monitoredStudent.email}
              </span>
              <span className="ml-2 text-[11px] font-bold">
                🔥 {monitoredStudent.currentStreak}d streak · 🏆 {monitoredStudent.totalPoints} pts
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTeacherMonitorOpen(true)}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Review Photo Proofs</span>
            </button>
            <button
              onClick={() => setMonitoredStudent(null)}
              className="px-3 py-1 bg-white text-purple-900 hover:bg-pink-50 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to My Calendar</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Mini calendar, Categories, Backlog/Students, & Full Mobile Menu Drawer) */}
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
          onOpenCalmSanctuary={() => setIsCalmModalOpen(true)}
          currentTheme={currentTheme}
          onOpenThemeSelector={() => setIsThemeModalOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          streakData={displayedStreakData}
          onOpenTeacherMonitor={() => setIsTeacherMonitorOpen(true)}
          studentName={displayedStudentName}
          userEmail={currentUser.email || undefined}
          userPhotoUrl={currentUser.photoURL || undefined}
          teacherEmail={teacherEmail}
          currentView={currentView}
          onSelectView={setCurrentView}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSignOut={signOutUser}
          hideOnDesktop={currentView === 'audit'}
          userRole={userRole}
          monitoredStudents={monitoredStudents}
          monitoredStudent={monitoredStudent}
          onSelectStudentToMonitor={(stu) => setMonitoredStudent(stu)}
          pendingProofCount={pendingProofCount}
          onCelebrateStreak={handleCelebrateStreak}
        />

        {/* Viewport Content (with pb-16 on mobile for the mobile bottom nav bar) */}
        <main
          className={`flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0 transition-colors duration-200 ${activeThemeConfig.surfaceBg}`}
        >
          {isTeacherAccount && !monitoredStudent ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
              <div className="w-full max-w-lg bg-white/95 rounded-3xl border-2 border-purple-200 shadow-xl p-6 sm:p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                    Teacher Monitoring Portal
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-pink-950 mt-2">
                    Waiting for Students to Link Your Gmail 👩‍🏫
                  </h2>
                  <p className="text-xs text-pink-700 font-medium mt-1.5 leading-relaxed">
                    Teachers strictly monitor student calendars in view-only mode. Share your Gmail address below with your students and ask them to enter it under <strong>Settings &rarr; Link Teacher</strong>.
                  </p>
                </div>

                {currentUser.email && (
                  <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-200 flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-mono font-bold text-purple-950 truncate">
                      {currentUser.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(currentUser.email || '');
                        setCopiedTeacherGmailBanner(true);
                        setTimeout(() => setCopiedTeacherGmailBanner(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      {copiedTeacherGmailBanner ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedTeacherGmailBanner ? 'Copied!' : 'Copy Gmail'}</span>
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={teacherRefreshing}
                    onClick={async () => {
                      setTeacherRefreshing(true);
                      try {
                        await syncPortalNow();
                        cuteSound.playCutePop();
                      } finally {
                        setTeacherRefreshing(false);
                      }
                    }}
                    className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${teacherRefreshing ? 'animate-spin' : ''}`} />
                    <span>{teacherRefreshing ? 'Refreshing...' : 'Refresh Students'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTeacherMonitorOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Open Teacher Dashboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-4 py-2 bg-white hover:bg-pink-50 border border-pink-300 text-pink-900 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Settings / Switch Role</span>
                  </button>
                </div>

                {/* Quick Link Student by Email on Teacher Waiting Card */}
                {currentUser.email && (
                  <div className="pt-3 border-t border-purple-100 text-left space-y-1.5">
                    <label className="text-[11px] font-black text-purple-950 block">
                      Or add a student directly by their email:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="email"
                        value={teacherBannerStudentEmail}
                        onChange={(e) => {
                          setTeacherBannerStudentEmail(e.target.value);
                          setTeacherBannerLinkErr('');
                          setTeacherBannerLinkMsg('');
                        }}
                        placeholder="student@gmail.com"
                        className="flex-1 text-xs px-3 py-2 bg-purple-50/50 border border-purple-200 rounded-xl text-pink-950 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          setTeacherBannerLinkErr('');
                          setTeacherBannerLinkMsg('');
                          try {
                            await linkStudentEmailByTeacher(
                              currentUser.email!,
                              teacherBannerStudentEmail
                            );
                            setTeacherBannerStudentEmail('');
                            setTeacherBannerLinkMsg('Student linked!');
                            cuteSound.playSparkle();
                          } catch (err) {
                            setTeacherBannerLinkErr(
                              err instanceof Error ? err.message : 'Could not link student.'
                            );
                          }
                        }}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Student</span>
                      </button>
                    </div>
                    {teacherBannerLinkErr && (
                      <p className="text-[11px] font-bold text-rose-600">{teacherBannerLinkErr}</p>
                    )}
                    {teacherBannerLinkMsg && (
                      <p className="text-[11px] font-bold text-emerald-700">{teacherBannerLinkMsg}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
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
              readOnly={isCalendarReadOnly}
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
              readOnly={isCalendarReadOnly}
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
              readOnly={isCalendarReadOnly}
            />
          )}

          {currentView === 'assignments' && (
            <AssignmentsView
              events={searchedEvents}
              tasks={tasks}
              studentName={displayedStudentName}
              totalPoints={displayedStreakData.totalPoints}
              readOnly={isCalendarReadOnly}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onToggleTaskComplete={handleToggleTaskComplete}
              onScheduleTask={handleScheduleTask}
              onSaveEvent={handleSaveEvent}
              onDeleteEvent={handleDeleteEvent}
              onToggleEventComplete={handleToggleComplete}
              onBatchReorder={handleBatchReorderAssignments}
              onOpenTeacherMonitor={() => setIsTeacherMonitorOpen(true)}
            />
          )}

          {currentView === 'insights' && (
            <WeeklyInsightsView
              currentDate={currentDate}
              events={searchedEvents}
              tasks={tasks}
              streakData={displayedStreakData}
              studentName={displayedStudentName}
              onOpenTeacherMonitor={() => setIsTeacherMonitorOpen(true)}
              onUpdateEventEvidence={handleUpdateEventEvidence}
              onUpdateTaskEvidence={handleUpdateTaskEvidence}
            />
          )}

          {currentView === 'audit' && (
            <TimeAuditView currentDate={currentDate} events={searchedEvents} />
          )}
            </>
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
        onSelectEvent={(ev) => {
          setIsNotificationCenterOpen(false);
          handleSelectEvent(ev);
        }}
      />

      {/* 5. Modals */}
      {!isTeacherAccount && (
        <>
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

          <CalmSanctuaryModal
            isOpen={isCalmModalOpen}
            onClose={() => setIsCalmModalOpen(false)}
            currentDate={currentDate}
            onScheduleDeStressBlock={async (eventData) => {
              if (!currentUser || isCalendarReadOnly) return;
              const newEv: CalendarEvent = {
                ...eventData,
                id: `evt_destress_${Date.now()}`,
              };
              await saveEvent(currentUser.uid, newEv);
              triggerNotification({
                title: `${newEv.title} Scheduled! 🌿`,
                message:
                  'Your calm sanctuary reset is locked in. Be kind to yourself today 💖',
                type: 'celebration',
              });
            }}
            onAddTaskToBacklog={async (title, estimatedMinutes) => {
              if (!currentUser || isCalendarReadOnly) return;
              const newTask: UnscheduledTask = {
                id: `task_${Date.now()}`,
                title,
                category: 'health',
                estimatedMinutes,
                priority: 'medium',
                completed: false,
              };
              await saveTask(currentUser.uid, newTask);
            }}
          />

          <TaskInboxModal
            isOpen={isTaskInboxOpen}
            onClose={() => setIsTaskInboxOpen(false)}
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleTaskComplete={handleToggleTaskComplete}
            onDeleteTask={handleDeleteTask}
            onScheduleTask={handleScheduleTask}
            onToggleTaskReminder={handleToggleTaskReminder}
          />

          <TaskEvidenceModal
            isOpen={isEvidenceModalOpen}
            onClose={() => {
              setIsEvidenceModalOpen(false);
              setEvidenceTarget(null);
            }}
            targetItem={evidenceTarget}
            studentName={studentName}
            onConfirmCompletionWithEvidence={handleConfirmCompletionWithEvidence}
          />
        </>
      )}

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
        studentName={studentName}
        onUpdateStudentName={handleUpdateStudentName}
        onOpenTeacherMonitor={() => setIsTeacherMonitorOpen(true)}
        userEmail={currentUser.email || undefined}
        teacherEmail={teacherEmail}
        onUpdateTeacherEmail={handleUpdateTeacherEmail}
        userRole={userRole}
        onChangeUserRole={handleSelectUserRole}
        onSignOut={signOutUser}
      />

      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
      />

      {/* 6. Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        onViewChange={(v) => {
          setCurrentView(v);
          setIsMobileSidebarOpen(false);
        }}
        onOpenCalmSanctuary={() => setIsCalmModalOpen(true)}
        onOpenInbox={() => setIsTaskInboxOpen(true)}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        onNewEvent={() => handleSlotClick(formatDateKey(currentDate), '09:00')}
        pendingTaskCount={tasks.filter((t) => !t.completed).length}
        streakDays={displayedStreakData.currentStreak}
        onOpenTeacherMonitor={() => setIsTeacherMonitorOpen(true)}
        userRole={userRole}
        pendingProofCount={pendingProofCount}
        onOpenWeeklySummary={() => setIsTeacherSummaryOpen(true)}
      />

      {/* 8. Teacher Monitoring & Evidence Review Dashboard Modal */}
      <TeacherMonitorModal
        isOpen={isTeacherMonitorOpen}
        onClose={() => setIsTeacherMonitorOpen(false)}
        events={events}
        tasks={tasks}
        streakData={displayedStreakData}
        studentName={displayedStudentName}
        studentEmail={displayedStudentEmail}
        studentPhotoUrl={displayedStudentPhoto}
        monitoredStudents={monitoredStudents}
        activeStudentUid={activeTargetUid || undefined}
        currentUserUid={currentUser.uid}
        currentUserEmail={currentUser.email || undefined}
        teacherEmailLink={teacherEmail}
        userRole={userRole}
        onLinkTeacherEmail={handleUpdateTeacherEmail}
        onLinkStudentEmail={
          currentUser.email
            ? (stuEmail) => linkStudentEmailByTeacher(currentUser.email, stuEmail)
            : undefined
        }
        onRefreshStudents={syncPortalNow}
        onSelectStudentToMonitor={(stu) => setMonitoredStudent(stu)}
        onUpdateEventEvidence={handleUpdateEventEvidence}
        onUpdateTaskEvidence={handleUpdateTaskEvidence}
        onSwitchToStudentView={() => setIsTeacherMonitorOpen(false)}
        onOpenWeeklyInsights={() => setCurrentView('insights')}
      />

      {/* Direct Teacher Weekly Summary Modal shortcut */}
      <WeeklySummaryModal
        isOpen={isTeacherSummaryOpen}
        onClose={() => setIsTeacherSummaryOpen(false)}
        studentName={displayedStudentName}
        streakData={displayedStreakData}
        events={events}
        tasks={tasks}
        currentDate={currentDate}
      />

      {/* 9. Direct User Message & Feedback Inbox -> Creator Admin (nicolecarillo957@gmail.com) */}
      <FeedbackChatBox
        currentUser={currentUser}
        isOpen={isFeedbackChatOpen}
        onOpenChange={setIsFeedbackChatOpen}
      />
    </div>
  );
}

