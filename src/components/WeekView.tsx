import React, { useRef, useEffect } from 'react';
import { CalendarEvent, CycleSettings, EventCategory } from '../types/calendar';
import { getCategoryConfig } from '../utils/categories';
import { 
  computeEventColumns, 
  formatDateKey, 
  formatFriendlyTime, 
  getDaysOfWeek, 
  isSameDay, 
  timeToMinutes 
} from '../utils/dateUtils';
import { getDayCycleStatus } from '../utils/cycleUtils';
import { 
  Check, 
  Clock, 
  ExternalLink, 
  MapPin, 
  MoreHorizontal, 
  Play, 
  Trash2,
  Bell
} from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedCategories: Set<EventCategory>;
  onSelectEvent: (event: CalendarEvent) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
  onToggleComplete: (eventId: string) => void;
  onDeleteEvent: (eventId: string) => void;
  onStartFocus: (event: CalendarEvent) => void;
  cycleSettings?: CycleSettings;
}

const START_HOUR = 7; // 7:00 AM
const END_HOUR = 22; // 10:00 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT_PX = 60; // 60px per hour = 1px per minute!

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  selectedCategories,
  onSelectEvent,
  onSlotClick,
  onToggleComplete,
  onDeleteEvent,
  onStartFocus,
  cycleSettings,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 7 days of the week starting Monday
  const weekDays = React.useMemo(() => getDaysOfWeek(currentDate), [currentDate]);

  // Current real-world time indicator
  const now = new Date();
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = (currentMinutesFromMidnight - START_HOUR * 60) * (HOUR_HEIGHT_PX / 60);

  // Auto-scroll to current hour on initial mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollY = Math.max(0, (now.getHours() - 1 - START_HOUR) * HOUR_HEIGHT_PX);
      scrollContainerRef.current.scrollTop = scrollY;
    }
  }, []);

  // Filter events by selected category
  const filteredEvents = React.useMemo(() => {
    return events.filter((ev) => selectedCategories.has(ev.category));
  }, [events, selectedCategories]);

  // Group events by date string
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    weekDays.forEach((d) => map.set(formatDateKey(d), []));
    filteredEvents.forEach((ev) => {
      const list = map.get(ev.date);
      if (list) list.push(ev);
    });
    return map;
  }, [weekDays, filteredEvents]);

  // Pre-calculate column placements for each day's overlapping events
  const layoutMapByDate = React.useMemo(() => {
    const map = new Map<string, Map<string, { colIndex: number; totalCols: number }>>();
    eventsByDate.forEach((dayEvents, dateStr) => {
      map.set(dateStr, computeEventColumns(dayEvents));
    });
    return map;
  }, [eventsByDate]);

  // Hours array [7, 8, ..., 21]
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  return (
    <div className="flex-1 flex flex-col h-full bg-pink-50/20 select-none overflow-x-auto overflow-y-hidden">
      <div className="flex-1 flex flex-col min-w-[620px] md:min-w-0 h-full relative">
        {/* 1. Week Days Sticky Header */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-pink-200/90 bg-pink-100/50 shrink-0 pr-2">
        <div className="py-2.5 px-3 border-r border-pink-200/80 text-[11px] font-bold text-pink-400 text-right">
          GMT-7
        </div>

        {weekDays.map((d, index) => {
          const isToday = isSameDay(d, now);
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = d.getDate();
          const dateStr = formatDateKey(d);
          const cycleStatus = cycleSettings ? getDayCycleStatus(dateStr, cycleSettings) : null;

          return (
            <div
              key={index}
              className={`py-2 px-2 text-center border-r border-pink-200/60 last:border-r-0 ${
                cycleStatus?.isPeriod ? 'bg-rose-100/40' : isToday ? 'bg-pink-200/40' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-600">
                  {dayName}
                </span>
                {cycleStatus?.isPeriod && (
                  <span
                    className="text-[9px] px-1 py-0.2 rounded-full font-bold bg-rose-200/90 text-rose-800 border border-rose-300 shadow-2xs"
                    title={`Period Day ${cycleStatus.cycleDay} 🩸`}
                  >
                    🩸 Day {cycleStatus.cycleDay}
                  </span>
                )}
                {cycleStatus?.isOvulation && (
                  <span
                    className="text-[9px] px-1 py-0.2 rounded-full font-bold bg-fuchsia-200 text-fuchsia-800 border border-fuchsia-300 shadow-2xs"
                    title="Ovulation Day ✨"
                  >
                    ✨
                  </span>
                )}
              </div>
              <div
                className={`inline-flex items-center justify-center w-7 h-7 mt-0.5 rounded-full text-xs font-bold ${
                  isToday
                    ? 'bg-pink-500 text-white shadow-xs'
                    : 'text-pink-950 font-semibold'
                }`}
              >
                {dayNum}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Scrollable Time Grid */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative grid grid-cols-[64px_repeat(7,1fr)]"
      >
        {/* Left Column: Time Labels */}
        <div className="relative border-r border-pink-200/80 bg-white/60">
          {hours.map((hour) => {
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayH = hour % 12 === 0 ? 12 : hour % 12;
            return (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
                className="relative border-b border-transparent"
              >
                <span className="absolute -top-2.5 right-3 text-[11px] font-mono text-pink-400 font-medium">
                  {displayH} {period}
                </span>
              </div>
            );
          })}
        </div>

        {/* 7 Day Columns */}
        {weekDays.map((day, dayIdx) => {
          const dateStr = formatDateKey(day);
          const isToday = isSameDay(day, now);
          const dayEvents = eventsByDate.get(dateStr) || [];
          const layoutMap = layoutMapByDate.get(dateStr) || new Map();

          return (
            <div
              key={dayIdx}
              className={`relative border-r border-pink-200/60 last:border-r-0 ${
                isToday ? 'bg-pink-100/20' : 'bg-white/80'
              }`}
            >
              {/* Horizontal Hour Lines & Clickable Slots */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{ height: `${HOUR_HEIGHT_PX}px` }}
                  onClick={() => {
                    const timeStr = `${String(hour).padStart(2, '0')}:00`;
                    onSlotClick(dateStr, timeStr);
                  }}
                  className="border-b border-pink-100 hover:bg-pink-100/40 cursor-pointer transition-colors group relative"
                >
                  {/* Subtle half-hour dashed line */}
                  <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-pink-100/70" />
                </div>
              ))}

              {/* Pink Current Time Line with Heart if Today */}
              {isToday && currentTimeTop >= 0 && currentTimeTop <= TOTAL_HOURS * HOUR_HEIGHT_PX && (
                <div
                  style={{ top: `${currentTimeTop}px` }}
                  className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                >
                  <span className="text-xs -ml-2 -mt-0.5 select-none text-pink-500 animate-pulse">💖</span>
                  <div className="flex-1 h-[2px] bg-pink-500 shadow-xs shadow-pink-300" />
                </div>
              )}

              {/* Render Event Blocks for this Day */}
              {dayEvents.map((ev) => {
                const startMin = timeToMinutes(ev.startTime);
                const endMin = timeToMinutes(ev.endTime);

                // Calculate vertical position (1px = 1min)
                const topPx = (startMin - START_HOUR * 60) * (HOUR_HEIGHT_PX / 60);
                const heightPx = Math.max(24, (endMin - startMin) * (HOUR_HEIGHT_PX / 60));

                // Column position for overlapping events
                const layout = layoutMap.get(ev.id) || { colIndex: 0, totalCols: 1 };
                const colWidthPercent = 100 / layout.totalCols;
                const leftPercent = layout.colIndex * colWidthPercent;

                const catConfig = getCategoryConfig(ev.category);

                return (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(ev);
                    }}
                    style={{
                      top: `${Math.max(0, topPx)}px`,
                      height: `${heightPx}px`,
                      left: `${leftPercent}%`,
                      width: `calc(${colWidthPercent}% - 4px)`,
                    }}
                    className={`absolute z-1 rounded-xl p-2 border-l-4 cursor-pointer shadow-xs transition-all overflow-hidden flex flex-col justify-between group hover:z-20 hover:shadow-md ${
                      ev.isCompleted
                        ? 'bg-pink-100/50 border-l-pink-300 text-pink-400 opacity-60'
                        : `${catConfig.bgClass} ${catConfig.borderClass}`
                    }`}
                  >
                    <div>
                      {/* Top row: Checkbox, Title, Focus button */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleComplete(ev.id);
                            }}
                            className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors ${
                              ev.isCompleted
                                ? 'bg-pink-500 border-pink-500 text-white'
                                : 'border-pink-300 bg-white hover:border-pink-500'
                            }`}
                            title={ev.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {ev.isCompleted && <Check className="w-2.5 h-2.5" />}
                          </button>
                          
                          <span
                            className={`text-xs font-bold leading-tight truncate ${
                              ev.isCompleted ? 'line-through text-pink-400' : 'text-pink-950'
                            }`}
                          >
                            {ev.title}
                          </span>
                        </div>

                        {/* Quick Start Focus Button (visible on hover) */}
                        {!ev.isCompleted && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartFocus(ev);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-pink-700 hover:text-pink-900 bg-white/90 rounded transition-opacity"
                            title="Start Focus Session"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                        )}
                      </div>

                      {/* Time display */}
                      <div className="flex items-center justify-between text-[10px] text-pink-700 font-mono mt-0.5">
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          <span>{formatFriendlyTime(ev.startTime)}</span>
                          <span>-</span>
                          <span>{formatFriendlyTime(ev.endTime)}</span>
                        </div>
                        {ev.reminders && ev.reminders.length > 0 && (
                          <span title={`${ev.reminders.length} reminder(s) set 🎀`}>
                            <Bell className="w-2.5 h-2.5 fill-pink-400 text-pink-600 shrink-0" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer tags / subtasks / location if tall enough */}
                    {heightPx > 46 && (
                      <div className="flex items-center justify-between text-[10px] text-pink-700 mt-1">
                        {ev.location && (
                          <div className="flex items-center gap-1 truncate max-w-[80%]">
                            <MapPin className="w-2.5 h-2.5 shrink-0 opacity-70" />
                            <span className="truncate">{ev.location}</span>
                          </div>
                        )}
                        {ev.subtasks && ev.subtasks.length > 0 && (
                          <span className="ml-auto text-[10px] font-mono text-pink-600 font-bold">
                            {ev.subtasks.filter((s) => s.completed).length}/{ev.subtasks.length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {/* Empty Schedule Notice */}
        {filteredEvents.length === 0 && (
          <div className="absolute top-16 left-20 right-4 z-10 pointer-events-none flex justify-center">
            <div className="pointer-events-auto bg-white/95 border border-pink-300 rounded-2xl p-4 shadow-sm text-center max-w-sm">
              <span className="text-xl">🌸</span>
              <h5 className="text-xs font-black text-pink-950 mt-1">Fresh Week Schedule</h5>
              <p className="text-[11px] text-pink-700 font-medium mt-0.5">
                Click any slot across Monday to Sunday to timebox your week! 💖
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
};
