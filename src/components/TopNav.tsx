import React, { useState } from 'react';
import { CalendarViewType, UserRole } from '../types/calendar';
import { CalendarThemeId, THEME_CONFIGS } from '../types/theme';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  Keyboard,
  Timer,
  Bell,
  Menu,
  Inbox,
  BarChart3,
  LogOut,
  X,
  GraduationCap,
} from 'lucide-react';

interface TopNavProps {
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewEvent: () => void;
  onOpenFocus: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onOpenCalmSanctuary?: () => void;
  onOpenInbox?: () => void;
  currentTheme?: CalendarThemeId;
  onOpenThemeSelector?: () => void;
  onToggleSidebar?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isFocusActive: boolean;
  onOpenNotifications: () => void;
  unreadNotificationCount: number;
  pendingTaskCount?: number;
  streakDays?: number;
  totalPoints?: number;
  onOpenTeacherMonitor?: () => void;
  isTeacherMode?: boolean;
  userRole?: UserRole | null;
  pendingProofCount?: number;
  onToggleTeacherMode?: () => void;
  userEmail?: string;
  userName?: string;
  userPhotoUrl?: string;
  onSignOut?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentView,
  onViewChange,
  currentDate,
  onPrev,
  onNext,
  onToday,
  onNewEvent,
  onOpenFocus,
  onOpenShortcuts,
  onOpenSettings,
  onOpenCalmSanctuary,
  onOpenInbox,
  currentTheme = 'pink',
  onOpenThemeSelector,
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  isFocusActive,
  onOpenNotifications,
  unreadNotificationCount,
  pendingTaskCount = 0,
  streakDays,
  totalPoints,
  onOpenTeacherMonitor,
  isTeacherMode,
  userRole = 'student',
  pendingProofCount = 0,
  userEmail,
  userName,
  userPhotoUrl,
  onSignOut,
}) => {
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const isTeacherAccount = userRole === 'teacher';

  const formattedDateLabel = React.useMemo(() => {
    const month = currentDate.toLocaleDateString('en-US', { month: 'short' });
    const year = currentDate.getFullYear();
    if (currentView === 'day') {
      const day = currentDate.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
      });
      return `${day} ${month}`;
    }
    return `${month} ${year}`;
  }, [currentDate, currentView]);

  return (
    <header className="border-b border-pink-200/90 bg-pink-50/90 backdrop-blur-md shrink-0 select-none z-20">
      {/* Main Top Bar Row */}
      <div className="h-14 sm:h-16 px-2.5 sm:px-5 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Zone 1: Mobile Hamburger & Brand & Date navigation */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 text-pink-700 hover:text-pink-950 hover:bg-pink-100 rounded-lg lg:hidden transition-colors shrink-0"
              title="Open Menu, Account & Tasks"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onViewChange('week');
            }}
            className="text-sm sm:text-base font-extrabold tracking-tight text-pink-600 flex items-center gap-1 group shrink-0"
            title="EduTrack Calendar & Reward Portal"
          >
            <span className="w-2 h-2 rounded-full bg-pink-500 group-hover:scale-125 transition-transform shadow-xs hidden xs:inline-block" />
            <span className="hidden xl:inline">EduTrack Calendar &amp; Reward Portal</span>
            <span className="hidden sm:inline xl:hidden">EduTrack</span>
            <span className="sm:hidden text-xs font-black">EduTrack</span>
            <span className="text-xs">💖</span>
          </a>

          {/* Date Navigator */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToday}
              className="px-2 py-1 text-[11px] sm:text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-md transition-colors shadow-2xs shrink-0"
              title="Jump to Today (Press T)"
            >
              Today
            </button>

            <div className="flex items-center text-pink-600 bg-white/90 rounded-md border border-pink-200 p-0.5 shrink-0">
              <button
                onClick={onPrev}
                className="p-0.5 sm:p-1 hover:text-pink-900 hover:bg-pink-100 rounded transition-colors"
                title="Previous period"
                aria-label="Previous"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={onNext}
                className="p-0.5 sm:p-1 hover:text-pink-900 hover:bg-pink-100 rounded transition-colors"
                title="Next period"
                aria-label="Next"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <span className="text-xs sm:text-sm font-bold text-pink-950 ml-0.5 truncate max-w-[72px] sm:max-w-none">
              {formattedDateLabel}
            </span>
          </div>
        </div>

        {/* Zone 2: Desktop View Switcher */}
        <nav className="hidden md:flex items-center gap-1 bg-pink-100/70 p-1 rounded-xl border border-pink-200/80">
          {(
            [
              { id: 'day', label: 'Day' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                currentView === item.id
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-pink-700 hover:text-pink-950 hover:bg-pink-200/40'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => onViewChange('insights')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              currentView === 'insights'
                ? 'bg-pink-500 text-white shadow-xs'
                : 'text-pink-700 hover:text-pink-950 hover:bg-pink-200/40'
            }`}
            title="Weekly Insights & Teacher Productivity Trends"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Insights</span>
          </button>
          <button
            onClick={() => onViewChange('audit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              currentView === 'audit'
                ? 'bg-pink-500 text-white shadow-xs'
                : 'text-pink-700 hover:text-pink-950 hover:bg-pink-200/40'
            }`}
          >
            Time Audit
          </button>
        </nav>

        {/* Zone 3: Search & Primary Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Desktop Search Input */}
          <div className="relative hidden xl:block w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
            <input
              type="text"
              placeholder="Search events... (/)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/90 border border-pink-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-400 focus:bg-white placeholder:text-pink-400 text-pink-950"
            />
          </div>

          {/* Shortcuts Icon */}
          <button
            onClick={onOpenShortcuts}
            className="p-1.5 sm:p-2 text-pink-600 hover:text-pink-900 hover:bg-pink-100 rounded-lg transition-colors hidden lg:block"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Settings & Password */}
          <button
            onClick={onOpenSettings}
            className="hidden sm:flex p-1.5 sm:p-2 text-pink-600 hover:text-pink-900 hover:bg-pink-100 rounded-lg transition-colors"
            title="Settings, Password & Export"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Streak & Points Badges (students show own streak; teachers show monitored student's streak if selected) */}
          {streakDays !== undefined && (!isTeacherAccount || isTeacherMode) && (
            <button
              onClick={onOpenTeacherMonitor}
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-black rounded-xl border border-amber-300 bg-amber-50/95 hover:bg-amber-100 text-amber-900 shadow-2xs flex items-center gap-1 transition-all active:scale-95"
              title={`Study Streak: ${streakDays} days (${totalPoints ?? 0} pts)!`}
            >
              <span className="text-xs sm:text-sm leading-none">🔥</span>
              <span className="font-mono font-black">{streakDays}d</span>
              {totalPoints !== undefined && (
                <span className="hidden sm:inline-flex items-center text-[10px] font-bold text-amber-700 bg-white/80 px-1.5 py-0.5 rounded-full border border-amber-200">
                  {totalPoints} pts
                </span>
              )}
            </button>
          )}

          {/* Teacher Mode & Monitoring Pill */}
          {onOpenTeacherMonitor && (
            <button
              onClick={onOpenTeacherMonitor}
              className={`${
                isTeacherAccount ? 'flex' : 'hidden sm:flex'
              } relative px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-extrabold rounded-xl border shadow-2xs items-center gap-1.5 transition-all active:scale-95 ${
                isTeacherMode || isTeacherAccount
                  ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700 shadow-sm'
                  : 'bg-white hover:bg-pink-50 text-pink-900 border-pink-300'
              }`}
              title="Teacher Monitoring: View submitted picture proofs and finish timestamps"
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">
                {isTeacherAccount ? 'Review Proofs' : 'Teacher Monitor'}
              </span>
              {pendingProofCount > 0 && (
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 font-black">
                  {pendingProofCount > 9 ? '9+' : pendingProofCount}
                </span>
              )}
            </button>
          )}

          {/* Color Theme Selector Pill */}
          {onOpenThemeSelector && (
            <button
              onClick={onOpenThemeSelector}
              className="hidden sm:flex p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-black rounded-xl border border-pink-300 bg-white hover:bg-pink-50 text-pink-900 shadow-2xs items-center gap-1.5 transition-all active:scale-95"
              title="Choose Calendar Color Theme"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                style={{
                  background: THEME_CONFIGS[currentTheme]?.swatch || '#EC4899',
                }}
              />
              <span className="hidden lg:inline capitalize font-bold text-[11px]">
                {THEME_CONFIGS[currentTheme]?.name.split(' ')[0] || 'Theme'}
              </span>
            </button>
          )}

          {/* Cute Notification Bell Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 sm:p-2 text-pink-600 hover:text-pink-700 bg-pink-100/80 hover:bg-pink-200/80 border border-pink-300 rounded-lg transition-colors flex items-center justify-center shadow-2xs"
            title="Cute Reminders 🎀"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 fill-pink-400 text-pink-600" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-600 text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-xs">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Compact User Avatar / Settings shortcut on mobile, full badge on desktop */}
          {userEmail && (
            <>
              <button
                onClick={onOpenSettings}
                className="lg:hidden p-0.5 rounded-full border-2 border-pink-300 bg-white shrink-0"
                title={`Account & Settings (${userEmail})`}
                aria-label="Account Settings"
              >
                {userPhotoUrl ? (
                  <img
                    src={userPhotoUrl}
                    alt={userName || 'User'}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-[10px] font-black flex items-center justify-center">
                    {(userName || userEmail)[0].toUpperCase()}
                  </span>
                )}
              </button>

              <div
                className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/95 border border-pink-200 shadow-2xs max-w-[190px]"
                title={`Signed in as ${userName || 'User'} (${userEmail})`}
              >
                {userPhotoUrl ? (
                  <img
                    src={userPhotoUrl}
                    alt={userName || 'User'}
                    className="w-5 h-5 rounded-full border border-pink-200 shrink-0"
                  />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                    {(userName || userEmail)[0].toUpperCase()}
                  </span>
                )}
                <span className="text-[11px] font-bold text-pink-950 truncate">
                  {userEmail}
                </span>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="p-1 text-pink-400 hover:text-rose-600 rounded-md transition-colors shrink-0"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          )}

          {/* De-Stress & Overload SOS (Student only - Tablet/Desktop) */}
          {!isTeacherAccount && onOpenCalmSanctuary && (
            <button
              onClick={onOpenCalmSanctuary}
              className="hidden md:flex px-2.5 py-1.5 text-xs font-bold rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 shadow-2xs items-center gap-1.5 transition-all"
              title="De-Stress Sanctuary (Press S)"
            >
              <span>🌸</span>
              <span className="hidden lg:inline">De-Stress SOS</span>
            </button>
          )}

          {/* Task Inbox Button (Student only - Tablet/Desktop) */}
          {!isTeacherAccount && onOpenInbox && (
            <button
              onClick={onOpenInbox}
              className="hidden md:flex relative px-2.5 py-1.5 text-xs font-extrabold rounded-xl border border-pink-300 bg-white hover:bg-pink-50 text-pink-900 shadow-2xs items-center gap-1.5 transition-all"
              title="Open Task Inbox & Backlog (Press I)"
            >
              <Inbox className="w-3.5 h-3.5 text-pink-600" />
              <span className="hidden lg:inline">Inbox</span>
              {pendingTaskCount > 0 && (
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500 text-white font-bold">
                  {pendingTaskCount > 9 ? '9+' : pendingTaskCount}
                </span>
              )}
            </button>
          )}

          {/* Focus Timer CTA (Student only) */}
          {!isTeacherAccount && (
            <button
              onClick={onOpenFocus}
              className={`hidden sm:flex px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl items-center gap-1.5 transition-all ${
                isFocusActive
                  ? 'bg-rose-100 text-rose-700 border-2 border-rose-400 animate-pulse'
                  : 'bg-pink-100 text-pink-700 hover:bg-pink-200 border border-pink-300 shadow-2xs'
              }`}
              title="Start Study Focus Timer (Press Space)"
            >
              {isFocusActive ? (
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping mr-0.5" />
              ) : (
                <Timer className="w-3.5 h-3.5 text-pink-600" />
              )}
              <span className="hidden lg:inline">Focus ✨</span>
              <span className="lg:hidden text-[11px]">Focus</span>
            </button>
          )}

          {/* Primary Action: New Event (Student only) */}
          {!isTeacherAccount && (
            <button
              onClick={onNewEvent}
              className="hidden md:flex px-3.5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-xl shadow-md shadow-pink-300/50 items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap"
              title="Schedule Timebox (Press N)"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Timebox 🎀</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Strip (< md): Exposes ALL 5 Views + Search + Focus on mobile! */}
      <div className="md:hidden px-2.5 pb-2 pt-0.5 flex flex-col gap-1.5 border-t border-pink-100/80 bg-white/75">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {(
            [
              { id: 'day', label: 'Day' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
              { id: 'insights', label: 'Insights 📊' },
              { id: 'audit', label: 'Audit 👑' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-colors shrink-0 ${
                currentView === item.id
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'bg-pink-100/70 text-pink-800 hover:bg-pink-200/60'
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={() => setShowMobileSearch((prev) => !prev)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors shrink-0 flex items-center gap-1 ${
              showMobileSearch || searchQuery
                ? 'bg-pink-500 text-white border-pink-500'
                : 'bg-white text-pink-700 border-pink-200'
            }`}
            title="Search events"
          >
            <Search className="w-3 h-3" />
            <span>Search</span>
          </button>

          {!isTeacherAccount ? (
            <button
              onClick={onOpenFocus}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors shrink-0 flex items-center gap-1 ${
                isFocusActive
                  ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                  : 'bg-white text-pink-700 border-pink-200'
              }`}
            >
              <Timer className="w-3 h-3" />
              <span>Focus</span>
            </button>
          ) : (
            onOpenTeacherMonitor && (
              <button
                onClick={onOpenTeacherMonitor}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-purple-300 bg-purple-50 text-purple-800 transition-colors shrink-0 flex items-center gap-1"
              >
                <GraduationCap className="w-3 h-3" />
                <span>Proofs{pendingProofCount > 0 ? ` (${pendingProofCount})` : ''}</span>
              </button>
            )
          )}
        </div>

        {showMobileSearch && (
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-pink-400" />
            <input
              type="text"
              placeholder="Search tasks & calendar blocks..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-pink-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-400 text-pink-950 placeholder:text-pink-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 p-0.5 text-pink-400 hover:text-pink-700"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
