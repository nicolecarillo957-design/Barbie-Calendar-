import React, { useRef, useEffect } from 'react';
import { 
  CalendarEvent, 
  CycleSettings,
  EventCategory, 
  UnscheduledTask 
} from '../types/calendar';
import { getCategoryConfig } from '../utils/categories';
import { 
  computeEventColumns, 
  formatDateKey, 
  formatFriendlyTime, 
  getDurationHours, 
  isSameDay, 
  timeToMinutes 
} from '../utils/dateUtils';
import { getCurrentCycleInfo } from '../utils/cycleUtils';
import { 
  CalendarPlus, 
  Check, 
  CheckSquare, 
  Clock, 
  ExternalLink, 
  MapPin, 
  Play, 
  Plus, 
  Trash2,
  AlertCircle,
  Sparkles,
  Heart,
  Zap,
  Activity,
  Utensils
} from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  tasks: UnscheduledTask[];
  selectedCategories: Set<EventCategory>;
  onSelectEvent: (event: CalendarEvent) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
  onToggleComplete: (eventId: string) => void;
  onToggleSubtask: (eventId: string, subtaskId: string) => void;
  onDeleteEvent: (eventId: string) => void;
  onStartFocus: (event: CalendarEvent) => void;
  onScheduleTask: (task: UnscheduledTask) => void;
  cycleSettings?: CycleSettings;
  onOpenCycle?: () => void;
}

const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT_PX = 72; // Generous height for day view

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  tasks,
  selectedCategories,
  onSelectEvent,
  onSlotClick,
  onToggleComplete,
  onToggleSubtask,
  onDeleteEvent,
  onStartFocus,
  onScheduleTask,
  cycleSettings,
  onOpenCycle,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dateStr = formatDateKey(currentDate);

  // Filter day events
  const dayEvents = React.useMemo(() => {
    return events
      .filter((ev) => ev.date === dateStr && selectedCategories.has(ev.category))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [events, dateStr, selectedCategories]);

  // Compute column overlaps for day view
  const layoutMap = React.useMemo(() => {
    return computeEventColumns(dayEvents);
  }, [dayEvents]);

  // Daily totals by category
  const dailySummary = React.useMemo(() => {
    let deepWorkHours = 0;
    let meetingsHours = 0;
    let otherHours = 0;
    let completedCount = 0;

    dayEvents.forEach((ev) => {
      const dur = getDurationHours(ev.startTime, ev.endTime);
      if (ev.category === 'deep_work') deepWorkHours += dur;
      else if (ev.category === 'meetings') meetingsHours += dur;
      else otherHours += dur;

      if (ev.isCompleted) completedCount++;
    });

    return {
      totalHours: deepWorkHours + meetingsHours + otherHours,
      deepWorkHours,
      meetingsHours,
      otherHours,
      completedCount,
      totalCount: dayEvents.length,
    };
  }, [dayEvents]);

  // Auto-scroll to current hour or first event
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const targetHour = isSameDay(currentDate, now)
        ? Math.max(0, now.getHours() - 1 - START_HOUR)
        : Math.max(0, (dayEvents[0] ? parseInt(dayEvents[0].startTime.split(':')[0]) - 1 : 8) - START_HOUR);
      scrollRef.current.scrollTop = targetHour * HOUR_HEIGHT_PX;
    }
  }, [currentDate]);

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  // Now indicator
  const now = new Date();
  const isToday = isSameDay(currentDate, now);
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = (currentMinutesFromMidnight - START_HOUR * 60) * (HOUR_HEIGHT_PX / 60);

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-pink-50/20 select-none">
      {/* Main Hourly Timeline */}
      <div className="flex-1 flex flex-col h-full border-r border-pink-200/90">
        {/* Daily Metric Kicker Bar */}
        <div className="h-12 px-6 border-b border-pink-200/90 bg-pink-100/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="font-extrabold text-pink-950 flex items-center gap-1.5">
              <span>{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span>💖</span>
            </span>
            <span aria-hidden="true" className="text-pink-300">·</span>
            <span className="text-pink-600 font-mono font-bold">
              {dailySummary.totalHours.toFixed(1)}h planned
            </span>
            <span aria-hidden="true" className="text-pink-300">·</span>
            <span className="text-pink-700 font-mono font-bold">
              {dailySummary.deepWorkHours.toFixed(1)}h Deep Focus
            </span>
            <span aria-hidden="true" className="text-pink-300">·</span>
            <span className="text-rose-600 font-mono font-bold">
              {dailySummary.meetingsHours.toFixed(1)}h Meet & Chat
            </span>
            {cycleSettings && (
              <>
                <span aria-hidden="true" className="text-pink-300">·</span>
                {(() => {
                  const cInfo = getCurrentCycleInfo(currentDate, cycleSettings);
                  return (
                    <button
                      onClick={onOpenCycle}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/95 border border-pink-300 text-pink-900 hover:bg-pink-100 font-bold transition-all shadow-2xs hover:scale-105"
                      title="Click to view cycle guidance and tips"
                    >
                      <span>{cInfo.icon}</span>
                      <span>Day {cInfo.cycleDay} · {cInfo.phaseName.split(' ')[0]}</span>
                      <span className="text-[10px] text-pink-600 underline font-semibold">Guidance ✨</span>
                    </button>
                  );
                })()}
              </>
            )}
          </div>

          <div className="text-xs font-mono font-bold text-pink-700">
            {dailySummary.completedCount}/{dailySummary.totalCount} completed ✨
          </div>
        </div>

        {/* Scrollable Timeline */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto relative grid grid-cols-[80px_1fr]">
          {/* Time axis */}
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
                  <span className="absolute -top-2.5 right-4 text-xs font-mono font-medium text-pink-400">
                    {displayH} {period}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid column */}
          <div className="relative bg-white/80">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
                onClick={() => {
                  const timeStr = `${String(hour).padStart(2, '0')}:00`;
                  onSlotClick(dateStr, timeStr);
                }}
                className="border-b border-pink-100 hover:bg-pink-100/30 cursor-pointer transition-colors relative"
              >
                <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-pink-100/70" />
              </div>
            ))}

            {/* Current Time Marker */}
            {isToday && currentTimeTop >= 0 && currentTimeTop <= TOTAL_HOURS * HOUR_HEIGHT_PX && (
              <div
                style={{ top: `${currentTimeTop}px` }}
                className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
              >
                <span className="text-sm -ml-2 select-none text-pink-500 animate-pulse">💖</span>
                <div className="flex-1 h-[2px] bg-pink-500 shadow-xs shadow-pink-300" />
              </div>
            )}

            {/* Day Events */}
            {dayEvents.map((ev) => {
              const startMin = timeToMinutes(ev.startTime);
              const endMin = timeToMinutes(ev.endTime);
              const topPx = (startMin - START_HOUR * 60) * (HOUR_HEIGHT_PX / 60);
              const heightPx = Math.max(34, (endMin - startMin) * (HOUR_HEIGHT_PX / 60));

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
                    width: `calc(${colWidthPercent}% - 8px)`,
                  }}
                  className={`absolute z-10 rounded-2xl p-3.5 border-l-4 cursor-pointer shadow-xs transition-all overflow-hidden flex flex-col justify-between group hover:shadow-md hover:z-30 ${
                    ev.isCompleted
                      ? 'bg-pink-100/50 border-l-pink-300 text-pink-400 opacity-60'
                      : `${catConfig.bgClass} ${catConfig.borderClass}`
                  }`}
                >
                  <div className="overflow-hidden">
                    {/* Header: Complete Button, Title, Focus CTA */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleComplete(ev.id);
                          }}
                          className={`w-4 h-4 rounded-md border shrink-0 flex items-center justify-center transition-colors ${
                            ev.isCompleted
                              ? 'bg-pink-500 border-pink-500 text-white'
                              : 'border-pink-300 bg-white hover:border-pink-500'
                          }`}
                        >
                          {ev.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>

                        <h3
                          className={`text-sm font-bold truncate ${
                            ev.isCompleted ? 'line-through text-pink-400' : 'text-pink-950'
                          }`}
                        >
                          {ev.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!ev.isCompleted && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartFocus(ev);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-pink-700 bg-white/95 hover:bg-pink-100 rounded-lg flex items-center gap-1 shadow-2xs transition-colors"
                            title="Launch Focus Mode"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Focus ✨</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEvent(ev.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                          title="Delete timebox"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center gap-3 text-xs text-pink-700 font-mono mt-1">
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3 opacity-70" />
                        {formatFriendlyTime(ev.startTime)} - {formatFriendlyTime(ev.endTime)}
                      </span>

                      {ev.location && (
                        <span className="flex items-center gap-1 font-sans text-pink-800 truncate">
                          <MapPin className="w-3 h-3 opacity-70 shrink-0 text-pink-600" />
                          <span className="truncate">{ev.location}</span>
                        </span>
                      )}

                      {ev.meetingUrl && (
                        <a
                          href={ev.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-pink-600 hover:underline font-sans font-bold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Join 🌸
                        </a>
                      )}
                    </div>

                    {/* Description preview */}
                    {ev.description && heightPx > 70 && (
                      <p className="text-xs text-pink-900/80 line-clamp-2 mt-1.5 font-normal">
                        {ev.description}
                      </p>
                    )}

                    {/* Subtask checklist if event is tall enough */}
                    {ev.subtasks && ev.subtasks.length > 0 && heightPx > 110 && (
                      <div className="mt-2.5 pt-2 border-t border-pink-200/60 space-y-1">
                        <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block mb-1">
                          Checklist ({ev.subtasks.filter((s) => s.completed).length}/{ev.subtasks.length}) 🎀
                        </span>
                        {ev.subtasks.slice(0, 3).map((st) => (
                          <div
                            key={st.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSubtask(ev.id, st.id);
                            }}
                            className="flex items-center gap-2 text-xs text-pink-900 hover:text-pink-950 cursor-pointer font-medium"
                          >
                            <input
                              type="checkbox"
                              checked={st.completed}
                              onChange={() => {}} // handled by parent div click
                              className="rounded border-pink-300 text-pink-600 pointer-events-none"
                            />
                            <span className={st.completed ? 'line-through text-pink-400' : ''}>
                              {st.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Dock: Day Timebox Planning & Tasks */}
      <div className="w-80 border-l border-pink-200/90 bg-pink-50/60 flex flex-col shrink-0 p-4 overflow-y-auto">
        <h3 className="text-xs font-extrabold text-pink-950 uppercase tracking-wider mb-3 flex items-center gap-1">
          <span>Schedule for Today</span>
          <span>💖</span>
        </h3>

        {/* Maker vs Manager Balance Gauge */}
        <div className="p-3.5 bg-white/95 rounded-2xl border border-pink-200 mb-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-pink-950">Time Allocation ✨</span>
            <span className="font-mono font-bold text-pink-600">{dailySummary.totalHours.toFixed(1)}h total</span>
          </div>

          <div className="h-2.5 w-full bg-pink-100 rounded-full overflow-hidden flex">
            <div
              style={{
                width: dailySummary.totalHours ? `${(dailySummary.deepWorkHours / dailySummary.totalHours) * 100}%` : '0%',
              }}
              className="bg-pink-500 transition-all"
              title="Deep Work"
            />
            <div
              style={{
                width: dailySummary.totalHours ? `${(dailySummary.meetingsHours / dailySummary.totalHours) * 100}%` : '0%',
              }}
              className="bg-rose-400 transition-all"
              title="Meetings"
            />
            <div
              style={{
                width: dailySummary.totalHours ? `${(dailySummary.otherHours / dailySummary.totalHours) * 100}%` : '0%',
              }}
              className="bg-purple-300 transition-all"
              title="Other"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-pink-700 mt-2 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              Focus: {dailySummary.deepWorkHours.toFixed(1)}h
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Chat: {dailySummary.meetingsHours.toFixed(1)}h
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-300" />
              Other: {dailySummary.otherHours.toFixed(1)}h
            </span>
          </div>
        </div>

        {/* Phase Cadence & Recommendations Card */}
        {cycleSettings && (
          <div className="p-3.5 bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100/70 rounded-2xl border border-pink-200 mb-4 shadow-2xs">
            {(() => {
              const cInfo = getCurrentCycleInfo(currentDate, cycleSettings);
              return (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-pink-950 uppercase tracking-tight flex items-center gap-1">
                      <span>{cInfo.icon}</span>
                      <span>{cInfo.phaseName}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-pink-200/90 text-pink-800">
                      Day {cInfo.cycleDay}
                    </span>
                  </div>

                  <div className="text-[11px] text-pink-700 font-bold mb-2">
                    {cInfo.isPeriod ? (
                      <span className="text-rose-700 flex items-center gap-1">
                        <span>🩸</span>
                        <span>Period Day {cInfo.cycleDay} · Prioritize Rest</span>
                      </span>
                    ) : (
                      <span>Next Period: {cInfo.nextPeriodDate} ({cInfo.daysUntilNextPeriod}d)</span>
                    )}
                  </div>

                  {/* Bulleted recommendations summary */}
                  <div className="space-y-1.5 text-xs text-pink-900 bg-white/80 p-2.5 rounded-xl border border-pink-200 mb-2.5 font-medium leading-relaxed">
                    <p className="line-clamp-2">
                      <strong className="text-pink-950 font-bold">💼 Focus:</strong> {cInfo.whatToDoWork}
                    </p>
                    <p className="line-clamp-2">
                      <strong className="text-pink-950 font-bold">🏃‍♀️ Movement:</strong> {cInfo.whatToDoMovement}
                    </p>
                    <p className="line-clamp-2">
                      <strong className="text-pink-950 font-bold">🥑 Nourish:</strong> {cInfo.whatToDoNutrition}
                    </p>
                  </div>

                  <button
                    onClick={onOpenCycle}
                    className="w-full py-1.5 px-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Open Cycle Wheel & Advice 💖</span>
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Quick Add block to today button */}
        <button
          onClick={() => onSlotClick(dateStr, '09:00')}
          className="w-full py-2.5 px-3 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors mb-4"
        >
          <Plus className="w-3.5 h-3.5" />
          Timebox a Block for Today 🎀
        </button>

        {/* Unscheduled Backlog ready to place */}
        <div className="flex-1">
          <span className="text-xs font-bold text-pink-900 uppercase tracking-wider block mb-2">
            Pull from Backlog 🌸
          </span>

          <div className="space-y-2">
            {tasks.filter((t) => !t.completed).slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="p-2.5 bg-white/95 rounded-xl border border-pink-200 hover:border-pink-300 transition-all shadow-2xs"
              >
                <p className="text-xs font-semibold text-pink-950 mb-1">{task.title}</p>
                <div className="flex items-center justify-between text-[11px] text-pink-600">
                  <span className="font-mono font-medium">{task.estimatedMinutes}m est.</span>
                  <button
                    onClick={() => onScheduleTask(task)}
                    className="text-pink-600 hover:text-pink-800 font-bold flex items-center gap-1"
                  >
                    <CalendarPlus className="w-3 h-3" />
                    Place on Today 💖
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
