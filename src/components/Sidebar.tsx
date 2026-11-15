import React, { useState } from 'react';
import {
  CalendarEvent,
  EventCategory,
  UnscheduledTask,
  StudentStreakData,
  CalendarViewType,
  UserProfileDoc,
  UserRole,
} from '../types/calendar';
import { CalendarThemeId, THEME_CONFIGS } from '../types/theme';
import { CATEGORY_LIST, getCategoryConfig } from '../utils/categories';
import { formatDateKey, isSameDay } from '../utils/dateUtils';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  CalendarPlus,
  Sparkles,
  Bell,
  X,
  GraduationCap,
  BarChart3,
  SlidersHorizontal,
  LogOut,
  Lock,
  Users,
  Eye,
  PartyPopper,
} from 'lucide-react';

interface SidebarProps {
  currentDate: Date;
  onSelectDate: (d: Date) => void;
  events: CalendarEvent[];
  tasks: UnscheduledTask[];
  onAddTask: (task: Omit<UnscheduledTask, 'id' | 'completed'>) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onScheduleTask: (task: UnscheduledTask) => void;
  onToggleTaskReminder?: (taskId: string) => void;
  selectedCategories: Set<EventCategory>;
  onToggleCategory: (cat: EventCategory) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCalmSanctuary?: () => void;
  currentTheme?: CalendarThemeId;
  onOpenThemeSelector?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  streakData?: StudentStreakData;
  onOpenTeacherMonitor?: () => void;
  studentName?: string;
  userEmail?: string;
  userPhotoUrl?: string;
  teacherEmail?: string;
  currentView?: CalendarViewType;
  onSelectView?: (view: CalendarViewType) => void;
  onOpenSettings?: () => void;
  onSignOut?: () => void;
  hideOnDesktop?: boolean;
  userRole?: UserRole | null;
  monitoredStudents?: UserProfileDoc[];
  monitoredStudent?: UserProfileDoc | null;
  onSelectStudentToMonitor?: (stu: UserProfileDoc | null) => void;
  pendingProofCount?: number;
  onCelebrateStreak?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDate,
  onSelectDate,
  events,
  tasks,
  onAddTask,
  onToggleTaskComplete,
  onDeleteTask,
  onScheduleTask,
  onToggleTaskReminder,
  selectedCategories,
  onToggleCategory,
  isCollapsed,
  onOpenCalmSanctuary,
  currentTheme = 'pink',
  onOpenThemeSelector,
  isMobileOpen = false,
  onCloseMobile,
  streakData,
  onOpenTeacherMonitor,
  studentName = 'Student',
  userEmail,
  userPhotoUrl,
  teacherEmail,
  currentView,
  onSelectView,
  onOpenSettings,
  onSignOut,
  hideOnDesktop = false,
  userRole = 'student',
  monitoredStudents = [],
  monitoredStudent = null,
  onSelectStudentToMonitor,
  pendingProofCount = 0,
  onCelebrateStreak,
}) => {
  const isTeacherAccount = userRole === 'teacher';
  // Default mobile drawer tab to 'all' so every tool/account control is immediately visible!
  const [mobileTab, setMobileTab] = useState<'all' | 'inbox' | 'calendar'>('all');

  const [viewedMonth, setViewedMonth] = useState<Date>(
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  );

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<EventCategory>('deep_work');
  const [taskMinutes, setTaskMinutes] = useState(45);

  const miniCalendarDays = React.useMemo(() => {
    const year = viewedMonth.getFullYear();
    const month = viewedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startOffset);

    const days: Date[] = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }
    return days;
  }, [viewedMonth]);

  const eventDateSet = React.useMemo(() => {
    const set = new Set<string>();
    events.forEach((ev) => set.add(ev.date));
    return set;
  }, [events]);

  const handlePrevMonth = () => {
    setViewedMonth(new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewedMonth(new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + 1, 1));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    onAddTask({
      title: taskTitle.trim(),
      category: taskCategory,
      estimatedMinutes: taskMinutes,
      priority: 'medium',
    });

    setTaskTitle('');
    setIsAddingTask(false);
  };

  if (isCollapsed) return null;

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-pink-950/40 backdrop-blur-2xs lg:hidden"
        />
      )}

      <aside
        className={`
          bg-white lg:bg-pink-50/60 border-r border-pink-200/90 flex flex-col shrink-0 select-none overflow-y-auto
          fixed inset-y-0 left-0 z-50 w-80 max-w-[88vw] shadow-2xl transition-transform duration-300 lg:static lg:w-72 lg:shadow-none lg:translate-x-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${hideOnDesktop ? 'lg:hidden' : isCollapsed ? 'lg:hidden' : 'lg:flex'}
        `}
      >
        {/* Mobile Header Bar */}
        <div className="lg:hidden p-3 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-pink-950 flex items-center gap-1.5">
              <span>EduTrack Menu &amp; Tools</span>
              <span>💖</span>
            </span>
            <button
              onClick={onCloseMobile}
              className="p-1.5 text-pink-700 hover:text-pink-900 hover:bg-pink-200/70 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Signed-in Account Strip + Sign Out */}
          {userEmail && (
            <div className="p-2.5 bg-white/95 rounded-xl border border-pink-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {userPhotoUrl ? (
                  <img
                    src={userPhotoUrl}
                    alt={studentName}
                    className="w-7 h-7 rounded-full border border-pink-200 shrink-0"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-pink-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {(studentName || userEmail)[0].toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-black text-pink-950 truncate">{studentName}</p>
                  <p className="text-[10px] font-mono text-pink-600 truncate">{userEmail}</p>
                </div>
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    if (onCloseMobile) onCloseMobile();
                    onSignOut();
                  }}
                  className="px-2 py-1 text-[10px] font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 shrink-0"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}

          {/* Quick tab switcher */}
          <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-xl border border-pink-300">
            <button
              onClick={() => setMobileTab('all')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                mobileTab === 'all'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-pink-700 hover:bg-pink-100'
              }`}
            >
              <span>✨ All Tools</span>
            </button>
            <button
              onClick={() => setMobileTab('inbox')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                mobileTab === 'inbox'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-pink-700 hover:bg-pink-100'
              }`}
            >
              <span>{isTeacherAccount ? '👩‍🏫 Students' : '🌸 Inbox'}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-white/25 text-current">
                {isTeacherAccount ? monitoredStudents.length : tasks.filter((t) => !t.completed).length}
              </span>
            </button>
            <button
              onClick={() => setMobileTab('calendar')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                mobileTab === 'calendar'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-pink-700 hover:bg-pink-100'
              }`}
            >
              <span>📅 Mini Cal</span>
            </button>
          </div>
        </div>

        {/* Mobile Quick View & Settings Section */}
        <div className={`lg:hidden p-3 border-b border-pink-200/80 space-y-2.5 ${mobileTab === 'inbox' ? 'hidden' : 'block'}`}>
          {onSelectView && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-pink-500 mb-1.5">
                Jump to Calendar View
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'day', label: 'Day' },
                    { id: 'week', label: 'Week' },
                    { id: 'month', label: 'Month' },
                    { id: 'assignments', label: 'Assignments 📝' },
                    { id: 'insights', label: 'Insights 📊' },
                    { id: 'audit', label: 'Time Audit 👑' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectView(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-extrabold border transition-colors ${
                      currentView === item.id
                        ? 'bg-pink-500 text-white border-pink-600 shadow-2xs'
                        : 'bg-pink-50 text-pink-900 border-pink-200 hover:bg-pink-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
                onOpenSettings();
              }}
              className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-extrabold text-emerald-900 flex items-center justify-center gap-2 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
              <span>Settings, Password &amp; Export 🔐</span>
            </button>
          )}
        </div>

        {/* 1. Mini Month Calendar & Top Cards */}
        <div className={mobileTab === 'inbox' ? 'hidden lg:block' : 'block'}>
          <div className="p-4 border-b border-pink-200/70 bg-white/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-pink-950 tracking-wide uppercase flex items-center gap-1">
                <span>{viewedMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                <span className="text-pink-500">✨</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 text-pink-600 hover:text-pink-900 hover:bg-pink-100 rounded transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 text-pink-600 hover:text-pink-900 hover:bg-pink-100 rounded transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center mb-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <span key={idx} className="text-[10px] font-bold text-pink-400 py-1">
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center">
              {miniCalendarDays.map((d, i) => {
                const dateStr = formatDateKey(d);
                const isSelected = isSameDay(d, currentDate);
                const isToday = isSameDay(d, new Date());
                const isCurrentMonth = d.getMonth() === viewedMonth.getMonth();
                const hasEvents = eventDateSet.has(dateStr);

                return (
                  <button
                    key={i}
                    onClick={() => {
                      onSelectDate(d);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`relative h-7 w-7 mx-auto flex items-center justify-center text-xs rounded-full transition-colors ${
                      isSelected
                        ? 'bg-pink-500 text-white font-bold shadow-xs'
                        : isToday
                        ? 'border-2 border-pink-500 text-pink-600 font-bold bg-pink-100/60'
                        : isCurrentMonth
                        ? 'text-pink-950 hover:bg-pink-100/80 font-medium'
                        : 'text-pink-300 hover:text-pink-400'
                    }`}
                  >
                    <span>{d.getDate()}</span>
                    {hasEvents && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-pink-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Teacher Monitoring Classroom Card OR Student Study Streak Card */}
          {isTeacherAccount ? (
            <div className="p-3 border-b border-purple-200/80 bg-gradient-to-br from-purple-50/80 via-pink-50 to-fuchsia-50/70">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-700 shrink-0" />
                  <span className="text-xs font-black text-purple-950 uppercase tracking-tight">
                    Teacher Monitor Mode
                  </span>
                </div>
                <span className="text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                  {monitoredStudents.length} Student{monitoredStudents.length === 1 ? '' : 's'}
                </span>
              </div>

              {monitoredStudent ? (
                <div className="p-2 rounded-xl bg-white/95 border border-purple-200 mb-2 text-[11px]">
                  <div className="font-black text-purple-950 truncate flex items-center gap-1">
                    <Eye className="w-3 h-3 text-purple-600 shrink-0" />
                    <span className="truncate">{monitoredStudent.displayName}</span>
                  </div>
                  <div className="text-[10px] text-purple-700 font-mono truncate">
                    {monitoredStudent.email}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-amber-800">
                    <span>🔥 {monitoredStudent.currentStreak}d streak</span>
                    <span>·</span>
                    <span>🏆 {monitoredStudent.totalPoints} pts</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-purple-800 font-medium leading-snug mb-2">
                  View-only student calendar monitoring. Share <span className="font-mono font-bold">{userEmail}</span> with students.
                </p>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    if (onCloseMobile) onCloseMobile();
                    if (onOpenTeacherMonitor) onOpenTeacherMonitor();
                  }}
                  className="py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-extrabold shadow-2xs flex items-center justify-center gap-1 transition-colors"
                >
                  <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                  <span>Proofs{pendingProofCount > 0 ? ` (${pendingProofCount})` : ''}</span>
                </button>
                {onSelectView && (
                  <button
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                      onSelectView('insights');
                    }}
                    className="py-1.5 px-2 bg-white hover:bg-purple-50 text-purple-900 border border-purple-300 rounded-xl text-[11px] font-extrabold shadow-2xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                    <span>Insights 📊</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {streakData && (
                <div className="p-3 border-b border-pink-200/80 bg-gradient-to-br from-amber-50/70 via-pink-50 to-orange-50/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">🔥</span>
                      <span className="text-xs font-black text-amber-950 uppercase tracking-tight">
                        Study Streak: {streakData.currentStreak} Days
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      {streakData.totalPoints} pts 🏆
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-900/80 font-medium leading-snug mb-2">
                    Finish calendar tasks with picture proof to earn 5–10 points and keep your streak!
                  </p>

                  {streakData.currentStreak >= 7 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onCloseMobile) onCloseMobile();
                        if (onCelebrateStreak) onCelebrateStreak();
                      }}
                      className="w-full mb-2 py-2 px-3 bg-gradient-to-r from-amber-400 via-pink-500 to-fuchsia-500 hover:from-amber-500 hover:via-pink-600 hover:to-fuchsia-600 text-white rounded-xl text-xs font-black shadow-md shadow-pink-300/60 flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-amber-200"
                      title="Celebrate your 7-day study streak milestone!"
                    >
                      <PartyPopper className="w-4 h-4 shrink-0 animate-bounce" />
                      <span>Celebrate Streak 🎉</span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        if (onCloseMobile) onCloseMobile();
                        if (onOpenTeacherMonitor) onOpenTeacherMonitor();
                      }}
                      className="py-1.5 px-2 bg-white/95 hover:bg-amber-100/60 border border-amber-300 rounded-xl text-[11px] font-extrabold text-amber-900 shadow-2xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Teacher 👩‍🏫</span>
                    </button>
                    {onSelectView && (
                      <button
                        onClick={() => {
                          if (onCloseMobile) onCloseMobile();
                          onSelectView('insights');
                        }}
                        className="py-1.5 px-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-[11px] font-extrabold shadow-2xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                        <span>Insights 📊</span>
                      </button>
                    )}
                  </div>

                  {userEmail && (
                    <div className="mt-2 pt-2 border-t border-amber-200/70 text-[10px] text-amber-900 space-y-0.5">
                      <div className="truncate font-bold">
                        Signed in: <span className="font-mono font-normal">{userEmail}</span>
                      </div>
                      <div className="truncate font-bold">
                        Teacher:{' '}
                        {teacherEmail ? (
                          <span className="font-mono font-normal text-emerald-700">{teacherEmail}</span>
                        ) : (
                          <span className="font-normal text-amber-700">Not linked yet</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* De-Stress & Schoolwork Overload SOS Card (Student only) */}
              {onOpenCalmSanctuary && (
                <div className="p-3.5 border-b border-pink-200/80 bg-gradient-to-br from-rose-50/70 via-pink-50 to-rose-100/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🌸</span>
                      <span className="text-xs font-black text-rose-950 uppercase tracking-tight">
                        De-Stress Sanctuary
                      </span>
                    </div>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-200 text-rose-800">
                      SOS
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 font-medium mb-2 leading-snug">
                    Feeling stressed or overloaded with schoolwork? Take a breath.
                  </p>
                  <button
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                      onOpenCalmSanctuary();
                    }}
                    className="w-full py-1.5 px-2 bg-white/95 hover:bg-rose-100/80 border border-rose-300 rounded-xl text-xs font-bold text-rose-700 shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-rose-500" />
                    <span>Overload Triage &amp; Breathing</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Calendar Color Theme Quick Selector Card */}
          {onOpenThemeSelector && (
            <div className="p-3.5 border-b border-pink-200/80 bg-gradient-to-br from-pink-50/60 to-rose-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">🎨</span>
                  <span className="text-xs font-black text-pink-950 uppercase tracking-tight">
                    Calendar Theme
                  </span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white border border-pink-300 text-pink-800 capitalize">
                  {THEME_CONFIGS[currentTheme || 'pink']?.name.split(' ')[0]}
                </span>
              </div>
              <p className="text-[11px] text-pink-800 font-medium mb-2 leading-snug">
                Choose from 10 vibrant calendar color themes!
              </p>
              <button
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                  onOpenThemeSelector();
                }}
                className="w-full py-1.5 px-2 bg-white/95 hover:bg-white border border-pink-300 rounded-xl text-xs font-bold text-pink-800 shadow-2xs flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                  style={{ background: THEME_CONFIGS[currentTheme || 'pink']?.swatch || '#EC4899' }}
                />
                <span>Change Calendar Color 🎨</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Categories Filter */}
        <div className={`p-4 border-b border-pink-200/70 ${mobileTab === 'inbox' ? 'hidden lg:block' : 'block'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-pink-900 uppercase tracking-wider flex items-center gap-1">
              <span>Time Categories</span>
              <span className="text-[10px]">🎀</span>
            </span>
            <span className="text-[11px] text-pink-500 font-medium">
              {selectedCategories.size} of {CATEGORY_LIST.length}
            </span>
          </div>

          <div className="space-y-1">
            {CATEGORY_LIST.map((cat) => {
              const isChecked = selectedCategories.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => onToggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-pink-100/70 text-left transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors border ${
                        isChecked ? 'border-transparent text-white' : 'border-pink-300 bg-white'
                      }`}
                      style={{ backgroundColor: isChecked ? cat.color : 'white' }}
                    >
                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium text-pink-950 group-hover:text-pink-900">
                      {cat.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-pink-500 font-mono">
                    {cat.weeklyTargetHours}h/wk
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Teacher Student Directory OR Student Inbox & Backlog */}
        {isTeacherAccount ? (
          <div className={`flex-1 p-4 flex flex-col min-h-0 pb-24 lg:pb-4 ${mobileTab === 'calendar' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-700" />
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                  Linked Students
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold font-mono">
                {monitoredStudents.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {monitoredStudents.length === 0 ? (
                <div className="text-center py-6 px-2 text-purple-500 bg-purple-50/50 rounded-2xl border border-purple-200">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <p className="text-xs font-bold text-purple-950">No students linked yet</p>
                  <p className="text-[11px] text-purple-700 mt-1 leading-relaxed">
                    Have students add <span className="font-mono font-bold">{userEmail}</span> in their Settings to monitor their calendar.
                  </p>
                </div>
              ) : (
                monitoredStudents.map((stu) => {
                  const isActive = monitoredStudent?.uid === stu.uid;
                  return (
                    <button
                      key={stu.uid}
                      type="button"
                      onClick={() => {
                        if (onSelectStudentToMonitor) onSelectStudentToMonitor(stu);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
                        isActive
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-white/95 text-pink-950 border-pink-200 hover:border-purple-300 hover:bg-purple-50/40'
                      }`}
                    >
                      {stu.photoURL ? (
                        <img
                          src={stu.photoURL}
                          alt={stu.displayName}
                          className="w-8 h-8 rounded-full border border-white/50 shrink-0"
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 text-xs font-black flex items-center justify-center shrink-0">
                          {(stu.displayName || stu.email)[0]?.toUpperCase()}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold truncate">{stu.displayName}</p>
                        <p className={`text-[10px] font-mono truncate ${isActive ? 'text-purple-100' : 'text-pink-600'}`}>
                          {stu.email}
                        </p>
                        <div className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-amber-200' : 'text-amber-700'}`}>
                          🔥 {stu.currentStreak}d · 🏆 {stu.totalPoints} pts
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className={`flex-1 p-4 flex flex-col min-h-0 pb-24 lg:pb-4 ${mobileTab === 'calendar' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-pink-900 uppercase tracking-wider flex items-center gap-1">
                  <span>Inbox &amp; Backlog</span>
                  <span className="text-[10px]">🌸</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-200/80 text-pink-800 font-bold font-mono">
                  {tasks.filter((t) => !t.completed).length}
                </span>
              </div>
              <button
                onClick={() => setIsAddingTask(!isAddingTask)}
                className="p-1 text-pink-600 hover:bg-pink-200/80 rounded-lg transition-colors"
                title="Add task to inbox"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {isAddingTask && (
              <form onSubmit={handleCreateTask} className="mb-3 p-3 bg-pink-100/70 rounded-xl border border-pink-200">
                <input
                  type="text"
                  placeholder="What needs to be scheduled? ✨"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  autoFocus
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-pink-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-400 mb-2 text-pink-950 placeholder:text-pink-400"
                />
                <div className="flex items-center gap-1.5 mb-2">
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as EventCategory)}
                    className="text-[11px] bg-white border border-pink-200 rounded-lg px-2 py-1 text-pink-900 flex-1 focus:outline-none"
                  >
                    {CATEGORY_LIST.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={taskMinutes}
                    onChange={(e) => setTaskMinutes(Number(e.target.value))}
                    className="text-[11px] bg-white border border-pink-200 rounded-lg px-2 py-1 text-pink-900 w-20 focus:outline-none font-mono"
                  >
                    <option value={15}>15m</option>
                    <option value={30}>30m</option>
                    <option value={45}>45m</option>
                    <option value={60}>1h</option>
                    <option value={90}>1.5h</option>
                    <option value={120}>2h</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-2 py-1 text-[11px] text-pink-600 hover:text-pink-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!taskTitle.trim()}
                    className="px-3 py-1 text-[11px] bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-lg disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    Save 💖
                  </button>
                </div>
              </form>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {tasks.length === 0 ? (
                <div className="text-center py-6 text-pink-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-pink-300" />
                  <p className="text-xs font-bold text-pink-800">No pending tasks 💖</p>
                  <p className="text-[11px] text-pink-500 mt-0.5">Click + to capture an item</p>
                </div>
              ) : (
                tasks.map((task) => {
                  const catConfig = getCategoryConfig(task.category);
                  return (
                    <div
                      key={task.id}
                      className={`group relative p-2.5 rounded-xl border transition-all ${
                        task.completed
                          ? 'bg-pink-50/50 border-pink-200/50 opacity-60'
                          : 'bg-white/95 border-pink-200 hover:border-pink-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => onToggleTaskComplete(task.id)}
                          className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                            task.completed
                              ? 'bg-pink-400 border-pink-400 text-white'
                              : 'border-pink-300 hover:border-pink-500 bg-white'
                          }`}
                        >
                          {task.completed && <Check className="w-2.5 h-2.5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-semibold leading-snug line-clamp-2 ${
                              task.completed ? 'line-through text-pink-400' : 'text-pink-950'
                            }`}
                          >
                            {task.title}
                          </p>

                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-pink-600">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: catConfig.color }}
                            />
                            <span className="truncate">{catConfig.label}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono flex items-center gap-0.5 shrink-0">
                              <Clock className="w-2.5 h-2.5" />
                              {task.estimatedMinutes}m
                            </span>
                          </div>
                        </div>
                      </div>

                      {!task.completed && (
                        <div className="mt-2 pt-2 border-t border-pink-100 flex items-center justify-between lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              onScheduleTask(task);
                              if (onCloseMobile) onCloseMobile();
                            }}
                            className="text-[11px] font-bold text-pink-600 hover:text-pink-800 flex items-center gap-1"
                            title="Timebox onto calendar"
                          >
                            <CalendarPlus className="w-3 h-3" />
                            Timebox 🎀
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onToggleTaskReminder && onToggleTaskReminder(task.id)}
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors ${
                                task.reminderMinutesBefore
                                  ? 'bg-pink-100 text-pink-700 border border-pink-200'
                                  : 'text-slate-400 hover:text-pink-600 hover:bg-pink-50'
                              }`}
                            >
                              <Bell className={`w-3 h-3 ${task.reminderMinutesBefore ? 'fill-pink-400 text-pink-600' : ''}`} />
                              <span>{task.reminderMinutesBefore ? `${task.reminderMinutesBefore}m` : 'Remind 🎀'}</span>
                            </button>

                            <button
                              onClick={() => onDeleteTask(task.id)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
