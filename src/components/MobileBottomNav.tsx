import React from 'react';
import { CalendarViewType, UserRole } from '../types/calendar';
import {
  Plus,
  Layers,
  GraduationCap,
  CalendarDays,
  BarChart3,
  FileText,
  ClipboardList,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onOpenCalmSanctuary: () => void;
  onOpenInbox: () => void;
  onOpenSidebar: () => void;
  onNewEvent: () => void;
  pendingTaskCount?: number;
  streakDays?: number;
  onOpenTeacherMonitor?: () => void;
  userRole?: UserRole | null;
  pendingProofCount?: number;
  onOpenWeeklySummary?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onViewChange,
  onOpenCalmSanctuary,
  onOpenInbox,
  onOpenSidebar,
  onNewEvent,
  pendingTaskCount = 0,
  streakDays,
  onOpenTeacherMonitor,
  userRole = 'student',
  pendingProofCount = 0,
  onOpenWeeklySummary,
}) => {
  if (userRole === 'teacher') {
    const isCalendarView =
      currentView === 'day' || currentView === 'week' || currentView === 'month';

    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-purple-200 z-40 flex items-center justify-around px-2 shadow-lg">
        {/* 1. Student Calendar */}
        <button
          onClick={() => onViewChange('week')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isCalendarView ? 'text-purple-700' : 'text-pink-700 hover:text-purple-900'
          }`}
          title="View Student Calendar"
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-extrabold">Calendar</span>
        </button>

        {/* 2. Weekly Insights */}
        <button
          onClick={() => onViewChange('insights')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentView === 'insights' ? 'text-purple-700' : 'text-pink-700 hover:text-purple-900'
          }`}
          title="Student Weekly Insights"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-extrabold">Insights</span>
        </button>

        {/* 3. Raised Central Teacher Proof Review */}
        {onOpenTeacherMonitor && (
          <button
            onClick={onOpenTeacherMonitor}
            className="flex flex-col items-center justify-center -mt-5 mx-1 shrink-0 relative"
            title="Inspect Student Photo Proofs & Timestamps"
          >
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-purple-300/80 active:scale-95 transition-transform border-2 border-white">
              <GraduationCap className="w-6 h-6" />
              {pendingProofCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-amber-950 font-mono text-[10px] font-black flex items-center justify-center border border-white shadow-xs">
                  {pendingProofCount > 9 ? '9+' : pendingProofCount}
                </span>
              )}
            </div>
            <span className="text-[10px] text-purple-800 font-extrabold mt-0.5">Proofs</span>
          </button>
        )}

        {/* 4. Weekly Summary Report */}
        <button
          onClick={onOpenWeeklySummary || onOpenTeacherMonitor}
          className="flex flex-col items-center justify-center flex-1 py-1 text-pink-700 hover:text-purple-900 transition-colors"
          title="Weekly Summary for Parents"
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-extrabold">Summary</span>
        </button>

        {/* 5. Teacher Drawer (Students & Settings) */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center flex-1 py-1 text-pink-700 hover:text-purple-900 transition-colors"
          title="Students, Mini Calendar & Settings"
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-extrabold">Students</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-pink-200 z-40 flex items-center justify-around px-2 shadow-lg">
      {/* 1. Assignments List View */}
      <button
        onClick={() => onViewChange('assignments')}
        className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          currentView === 'assignments' ? 'text-pink-600' : 'text-pink-700 hover:text-pink-900'
        }`}
        title="View Assignments List"
      >
        <div className="relative">
          <ClipboardList className="w-5 h-5" />
          {pendingTaskCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-pink-500 text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-xs">
              {pendingTaskCount > 9 ? '9+' : pendingTaskCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 font-extrabold">Tasks</span>
      </button>

      {/* 2. Teacher Monitor & Streak */}
      {onOpenTeacherMonitor && (
        <button
          onClick={onOpenTeacherMonitor}
          className="flex flex-col items-center justify-center flex-1 py-1 text-amber-700 hover:text-amber-900 transition-colors"
          title="Teacher Monitor & Study Streak"
        >
          <div className="relative flex items-center gap-0.5">
            <GraduationCap className="w-5 h-5 text-amber-600" />
            {streakDays !== undefined && (
              <span className="text-[9px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-1 rounded-full">
                🔥{streakDays}d
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-extrabold">Monitor</span>
        </button>
      )}

      {/* 3. Central New Timebox Button */}
      <button
        onClick={onNewEvent}
        className="flex flex-col items-center justify-center -mt-5 mx-1 shrink-0"
        title="Schedule New Timebox"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-pink-300/80 active:scale-95 transition-transform border-2 border-white">
          <Plus className="w-6 h-6 stroke-[3]" />
        </div>
        <span className="text-[10px] text-pink-700 font-extrabold mt-0.5">+Box</span>
      </button>

      {/* 4. De-Stress Sanctuary */}
      <button
        onClick={onOpenCalmSanctuary}
        className="flex flex-col items-center justify-center flex-1 py-1 text-rose-600 hover:text-rose-800 transition-colors"
        title="De-Stress Sanctuary"
      >
        <span className="text-lg leading-none">🌸</span>
        <span className="text-[10px] mt-0.5 font-extrabold">Calm</span>
      </button>

      {/* 5. Full Menu & Tools Drawer */}
      <button
        onClick={onOpenSidebar}
        className="flex flex-col items-center justify-center flex-1 py-1 text-pink-700 hover:text-pink-900 transition-colors"
        title="Open Menu, Account, Themes & Settings"
      >
        <Layers className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-extrabold">Menu</span>
      </button>
    </nav>
  );
};
