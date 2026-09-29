import React from 'react';
import { 
  CalendarViewType, 
  CyclePhaseInfo
} from '../types/calendar';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Plus, 
  Search, 
  SlidersHorizontal,
  Keyboard,
  Timer,
  Bell
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
  onOpenCycle?: () => void;
  cycleInfo?: CyclePhaseInfo;
  onOpenCalmSanctuary?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isFocusActive: boolean;
  onOpenNotifications: () => void;
  unreadNotificationCount: number;
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
  onOpenCycle,
  cycleInfo,
  onOpenCalmSanctuary,
  searchQuery,
  onSearchChange,
  isFocusActive,
  onOpenNotifications,
  unreadNotificationCount,
}) => {
  // Format current date label depending on view
  const formattedDateLabel = React.useMemo(() => {
    const month = currentDate.toLocaleDateString('en-US', { month: 'long' });
    const year = currentDate.getFullYear();
    if (currentView === 'day') {
      const day = currentDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      return `${day} ${month} ${year}`;
    }
    return `${month} ${year}`;
  }, [currentDate, currentView]);

  return (
    <header className="h-16 px-5 border-b border-pink-200/90 bg-pink-50/80 backdrop-blur-md flex items-center justify-between shrink-0 select-none z-20">
      {/* Zone 1: Brand wordmark & Date navigation */}
      <div className="flex items-center gap-6">
        <a 
          href="/" 
          onClick={(e) => { e.preventDefault(); onViewChange('week'); }}
          className="text-xl font-extrabold tracking-tight text-pink-600 flex items-center gap-2 group"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 group-hover:scale-125 transition-transform shadow-xs" />
          <span>Barbie Calendar</span>
          <span className="text-sm">💖</span>
        </a>

        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToday}
            className="px-2.5 py-1 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-md transition-colors shadow-2xs"
            title="Jump to Today (Press T)"
          >
            Today
          </button>
          
          <div className="flex items-center text-pink-600 bg-white/80 rounded-md border border-pink-200 p-0.5">
            <button
              onClick={onPrev}
              className="p-1 hover:text-pink-900 hover:bg-pink-100 rounded transition-colors"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNext}
              className="p-1 hover:text-pink-900 hover:bg-pink-100 rounded transition-colors"
              title="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm font-bold text-pink-950 ml-1 whitespace-nowrap min-w-[130px]">
            {formattedDateLabel}
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links (Clean text with hover states & active indicators) */}
      <nav className="hidden md:flex items-center gap-1 bg-pink-100/70 p-1 rounded-xl border border-pink-200/80">
        <button
          onClick={() => onViewChange('day')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            currentView === 'day'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'text-pink-700 hover:text-pink-950 hover:bg-pink-200/40'
          }`}
        >
          Day
        </button>
        <button
          onClick={() => onViewChange('week')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            currentView === 'week'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'text-pink-700 hover:text-pink-950 hover:bg-pink-200/40'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => onViewChange('month')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            currentView === 'month'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'text-pink-700 hover:text-pink-950 hover:bg-pink-200/40'
          }`}
        >
          Month
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
      <div className="flex items-center gap-2.5">
        {/* Search Input */}
        <div className="relative hidden lg:block w-48 xl:w-56">
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
          className="p-2 text-pink-600 hover:text-pink-900 hover:bg-pink-100 rounded-lg transition-colors hidden sm:block"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Settings & Export */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-pink-600 hover:text-pink-900 hover:bg-pink-100 rounded-lg transition-colors"
          title="Preferences & Export"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Pink Cutesy Notification Bell Button */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 text-pink-600 hover:text-pink-700 bg-pink-100/70 hover:bg-pink-200/80 border border-pink-300 rounded-lg transition-colors flex items-center justify-center group shadow-2xs"
          title="Cute Reminders 🎀"
        >
          <Bell className="w-4 h-4 fill-pink-400 text-pink-600 group-hover:scale-110 transition-transform" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-600 text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-xs animate-pulse">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </button>

        {/* Barbie Cycle & Phase Pill Button */}
        {cycleInfo && onOpenCycle && (
          <button
            onClick={onOpenCycle}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border shadow-2xs flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${
              cycleInfo.isPeriod
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-pink-100 text-pink-800 border-pink-300'
            }`}
            title={`Cycle Day ${cycleInfo.cycleDay}: ${cycleInfo.phaseName} · Next Period in ${cycleInfo.daysUntilNextPeriod} days`}
          >
            <span>{cycleInfo.icon}</span>
            <span className="hidden sm:inline">Day {cycleInfo.cycleDay}</span>
            <span className="text-[10px] font-mono px-1 py-0.5 rounded-md bg-white/80 text-pink-900 font-extrabold uppercase hidden md:inline">
              {cycleInfo.phase}
            </span>
          </button>
        )}

        {/* De-Stress & Overload SOS */}
        {onOpenCalmSanctuary && (
          <button
            onClick={onOpenCalmSanctuary}
            className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 shadow-2xs flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            title="De-Stress Sanctuary: Schoolwork Overload, Box Breathing & Anxiety SOS (Press S)"
          >
            <span>🌸</span>
            <span className="hidden sm:inline">De-Stress SOS</span>
          </button>
        )}

        {/* Focus Timer CTA */}
        <button
          onClick={onOpenFocus}
          className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
            isFocusActive
              ? 'bg-rose-100 text-rose-700 border-2 border-rose-400 animate-pulse'
              : 'bg-pink-100 text-pink-700 hover:bg-pink-200 border border-pink-300 shadow-2xs'
          }`}
          title="Start Barbie Focus Timer (Press Space)"
        >
          {isFocusActive ? (
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping mr-0.5" />
          ) : (
            <Timer className="w-3.5 h-3.5 text-pink-600" />
          )}
          <span>Barbie Focus ✨</span>
        </button>

        {/* Primary Action: New Event */}
        <button
          onClick={onNewEvent}
          className="px-3.5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-xl shadow-md shadow-pink-300/50 flex items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap"
          title="Schedule Timebox (Press N)"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Timebox 🎀</span>
        </button>
      </div>
    </header>
  );
};
