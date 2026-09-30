import React from 'react';
import { CalendarViewType } from '../types/calendar';
import { 
  Calendar as CalendarIcon, 
  Columns, 
  Plus, 
  Layers, 
  Inbox
} from 'lucide-react';

interface MobileBottomNavProps {
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onOpenCycle?: () => void;
  onOpenCalmSanctuary: () => void;
  onOpenInbox: () => void;
  onOpenSidebar: () => void;
  onNewEvent: () => void;
  cycleDay?: number;
  isPeriod?: boolean;
  isCycleEnabled?: boolean;
  pendingTaskCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onViewChange,
  onOpenCycle,
  onOpenCalmSanctuary,
  onOpenInbox,
  onOpenSidebar,
  onNewEvent,
  cycleDay,
  isPeriod,
  isCycleEnabled = true,
  pendingTaskCount = 0,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-pink-200 z-40 flex items-center justify-around px-1 shadow-lg safe-bottom">
      {/* 1. Day View */}
      <button
        onClick={() => onViewChange('day')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          currentView === 'day' ? 'text-pink-600 font-extrabold' : 'text-pink-400 hover:text-pink-600'
        }`}
      >
        <CalendarIcon className={`w-4 h-4 ${currentView === 'day' ? 'stroke-[2.5]' : ''}`} />
        <span className="text-[9px] mt-0.5 font-bold">Day</span>
      </button>

      {/* 2. Week View */}
      <button
        onClick={() => onViewChange('week')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          currentView === 'week' ? 'text-pink-600 font-extrabold' : 'text-pink-400 hover:text-pink-600'
        }`}
      >
        <Columns className={`w-4 h-4 ${currentView === 'week' ? 'stroke-[2.5]' : ''}`} />
        <span className="text-[9px] mt-0.5 font-bold">Week</span>
      </button>

      {/* 3. Central New Timebox Button */}
      <button
        onClick={onNewEvent}
        className="flex flex-col items-center justify-center -mt-5 mx-0.5"
        title="Schedule New Timebox"
      >
        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-pink-300/80 active:scale-95 transition-transform border-2 border-white">
          <Plus className="w-5 h-5 stroke-[3]" />
        </div>
        <span className="text-[9px] text-pink-600 font-extrabold mt-0.5">+Box</span>
      </button>

      {/* 4. Dedicated Inbox / Tasks Button (Always visible on mobile!) */}
      <button
        onClick={onOpenInbox}
        className="relative flex flex-col items-center justify-center flex-1 py-1 text-pink-600 hover:text-pink-800 transition-colors"
        title="Open Task Inbox & Backlog"
      >
        <Inbox className="w-4 h-4" />
        {pendingTaskCount > 0 && (
          <span className="absolute top-0 right-3 w-3.5 h-3.5 rounded-full bg-pink-500 text-white font-mono text-[8px] font-bold flex items-center justify-center shadow-xs">
            {pendingTaskCount > 9 ? '9+' : pendingTaskCount}
          </span>
        )}
        <span className="text-[9px] mt-0.5 font-bold text-pink-600">Inbox</span>
      </button>

      {/* 5. De-Stress SOS */}
      <button
        onClick={onOpenCalmSanctuary}
        className="flex flex-col items-center justify-center flex-1 py-1 text-rose-500 hover:text-rose-700 transition-colors"
        title="De-Stress Sanctuary"
      >
        <span className="text-base leading-none">🌸</span>
        <span className="text-[9px] mt-0.5 font-bold text-rose-600">Calm</span>
      </button>

      {/* 6. Cycle Glow (Optional for boys / non-menstruating users) */}
      {isCycleEnabled && onOpenCycle && (
        <button
          onClick={onOpenCycle}
          className="flex flex-col items-center justify-center flex-1 py-1 text-pink-500 hover:text-pink-700 transition-colors"
          title="Menstruation & Cycle Glow"
        >
          <span className="text-base leading-none">{isPeriod ? '🩸' : '👑'}</span>
          <span className="text-[9px] mt-0.5 font-bold text-pink-700">
            {cycleDay ? `D${cycleDay}` : 'Cycle'}
          </span>
        </button>
      )}

      {/* 7. Sidebar / Menu Drawer */}
      <button
        onClick={onOpenSidebar}
        className="flex flex-col items-center justify-center flex-1 py-1 text-pink-400 hover:text-pink-600 transition-colors"
        title="Open Full Sidebar Drawer"
      >
        <Layers className="w-4 h-4" />
        <span className="text-[9px] mt-0.5 font-bold">More</span>
      </button>
    </nav>
  );
};
