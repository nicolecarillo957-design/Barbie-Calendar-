import React from 'react';
import { CalendarEvent, EventCategory } from '../types/calendar';
import { getCategoryConfig } from '../utils/categories';
import { formatDateKey, formatFriendlyTime, isSameDay } from '../utils/dateUtils';
import { Plus } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedCategories: Set<EventCategory>;
  onSelectEvent: (event: CalendarEvent) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
  onSelectDate: (date: Date) => void;
  readOnly?: boolean;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  selectedCategories,
  onSelectEvent,
  onSlotClick,
  onSelectDate,
  readOnly = false,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate 35 or 42 grid cells
  const monthCells = React.useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start

    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startOffset);

    const cells: Date[] = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      cells.push(d);
    }
    // If the 35 cells don't cover the whole month, expand to 42
    if (cells[34].getMonth() === month && cells[34].getDate() < new Date(year, month + 1, 0).getDate()) {
      for (let i = 35; i < 42; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        cells.push(d);
      }
    }
    return cells;
  }, [year, month]);

  const filteredEvents = React.useMemo(() => {
    return events.filter((ev) => selectedCategories.has(ev.category));
  }, [events, selectedCategories]);

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [filteredEvents]);

  const now = new Date();

  return (
    <div className="flex-1 flex flex-col h-full bg-pink-50/20 select-none overflow-hidden">
      {/* Day of Week Header */}
      <div className="grid grid-cols-7 border-b border-pink-200 bg-pink-100/50 shrink-0">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
          <div key={idx} className="py-2 px-1 sm:px-3 text-center text-[10px] sm:text-xs font-bold text-pink-700 uppercase tracking-wider">
            <span className="sm:hidden">{day[0]}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className={`flex-1 overflow-y-auto grid grid-cols-7 ${monthCells.length === 42 ? 'sm:grid-rows-6' : 'sm:grid-rows-5'} divide-x divide-y divide-pink-200 border-b border-pink-200 pb-20 sm:pb-0`}>
        {monthCells.map((day, i) => {
          const dateStr = formatDateKey(day);
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, now);
          const dayEvents = eventsByDate.get(dateStr) || [];
          const maxVisible = 3;
          const visibleEvents = dayEvents.slice(0, maxVisible);
          const overflowCount = dayEvents.length - maxVisible;

          return (
            <div
              key={i}
              onClick={() => (readOnly ? onSelectDate(day) : onSlotClick(dateStr, '09:00'))}
              className={`min-h-[88px] sm:min-h-0 p-1 sm:p-1.5 flex flex-col justify-between transition-colors overflow-hidden group hover:bg-pink-100/40 cursor-pointer ${
                !isCurrentMonth
                  ? 'bg-pink-50/20 text-pink-300'
                  : 'bg-white/80 text-pink-950'
              }`}
            >
              {/* Day Header row */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(day);
                    }}
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] sm:text-xs font-bold transition-colors ${
                      isToday
                        ? 'bg-pink-500 text-white shadow-xs'
                        : isCurrentMonth
                        ? 'hover:bg-pink-100 text-pink-950'
                        : 'text-pink-300'
                    }`}
                    title="Switch to Day View"
                  >
                    {day.getDate()}
                  </button>
                </div>

                {!readOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSlotClick(dateStr, '09:00');
                    }}
                    className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 text-pink-400 hover:text-pink-600 p-0.5 rounded transition-opacity"
                    title="Add timebox"
                  >
                    <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}
              </div>

              {/* Event pills */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {visibleEvents.map((ev) => {
                  const cat = getCategoryConfig(ev.category);
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={`px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-[11px] rounded-md sm:rounded-lg font-semibold truncate flex items-center gap-1 border-l-2 shadow-2xs ${
                        ev.isCompleted
                          ? 'bg-pink-100 text-pink-400 border-pink-300 line-through'
                          : `${cat.bgClass} ${cat.borderClass}`
                      }`}
                      title={`${ev.title} (${formatFriendlyTime(ev.startTime)} - ${formatFriendlyTime(ev.endTime)})`}
                    >
                      <span className="hidden sm:inline font-mono text-[9px] opacity-75 shrink-0">
                        {ev.startTime}
                      </span>
                      <span className="truncate">{ev.title}</span>
                    </div>
                  );
                })}

                {overflowCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(day);
                    }}
                    className="text-[9px] sm:text-[10px] font-bold text-pink-600 hover:text-pink-800 pl-0.5 sm:pl-1 block transition-colors"
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
