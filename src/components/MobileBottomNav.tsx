import React from 'react';
import { CalendarViewType } from '../types/calendar';
import { 
  Calendar as CalendarIcon, 
  Columns, 
  Sparkles, 
  Heart, 
  Plus, 
  Layers, 
  Smile,
  Bell
} from 'lucide-react';

interface MobileBottomNavProps {
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onOpenCycle: () => void;
  onOpenCalmSanctuary: () => void;
  onOpenDressUp: () => void;
  onOpenSidebar: () => void;
  onNewEvent: () => void;
  cycleDay?: number;
  isPeriod?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onViewChange,
  onOpenCycle,
  onOpenCalmSanctuary,
  onOpenDressUp,
  onOpenSidebar,
  onNewEvent,
  cycleDay,
  isPeriod,
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

      {/* 4. Dress Up Doll (Boredom Buster!) */}
      <button
        onClick={onOpenDressUp}
        className="flex flex-col items-center justify-center flex-1 py-1 text-pink-500 hover:text-pink-700 transition-colors"
        title="Bored? Dress Up Barbie!"
      >
        <span className="text-base leading-none">👗</span>
        <span className="text-[9px] mt-0.5 font-bold text-pink-600">Dress</span>
      </button>

      {/* 5. De-Stress SOS */}
      <button
        onClick={onOpenCalmSanctuary}
        className="flex flex-col items-center justify-center flex-1 py-1 text-rose-500 hover:text-rose-700 transition-colors"
      >
        <span className="text-base leading-none">🌸</span>
        <span className="text-[9px] mt-0.5 font-bold text-rose-600">Calm</span>
      </button>

      {/* 6. Cycle Glow */}
      <button
        onClick={onOpenCycle}
        className="flex flex-col items-center justify-center flex-1 py-1 text-pink-500 hover:text-pink-700 transition-colors"
      >
        <span className="text-base leading-none">{isPeriod ? '🩸' : '👑'}</span>
        <span className="text-[9px] mt-0.5 font-bold text-pink-700">
          {cycleDay ? `D${cycleDay}` : 'Cycle'}
        </span>
      </button>

      {/* 7. Sidebar & Backlog Drawer */}
      <button
        onClick={onOpenSidebar}
        className="flex flex-col items-center justify-center flex-1 py-1 text-pink-400 hover:text-pink-600 transition-colors"
        title="Open Sidebar, Categories & Backlog"
      >
        <Layers className="w-4 h-4" />
        <span className="text-[9px] mt-0.5 font-bold">Tasks</span>
      </button>
    </nav>
  );
};
