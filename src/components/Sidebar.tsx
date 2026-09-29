import React, { useState } from 'react';
import { 
  CalendarEvent, 
  CycleSettings,
  EventCategory, 
  UnscheduledTask 
} from '../types/calendar';
import { 
  CATEGORY_LIST, 
  getCategoryConfig 
} from '../utils/categories';
import { 
  formatDateKey, 
  isSameDay, 
  parseDateKey 
} from '../utils/dateUtils';
import { 
  getCurrentCycleInfo, 
  getDayCycleStatus 
} from '../utils/cycleUtils';
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  Trash2, 
  CalendarPlus, 
  Layers,
  Sparkles,
  Bell,
  Heart,
  X
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
  cycleSettings?: CycleSettings;
  onOpenCycle?: () => void;
  onOpenCalmSanctuary?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  cycleSettings,
  onOpenCycle,
  onOpenCalmSanctuary,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Mini Calendar State: viewed month
  const [viewedMonth, setViewedMonth] = useState<Date>(
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  );

  // New task input state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<EventCategory>('deep_work');
  const [taskMinutes, setTaskMinutes] = useState(45);

  // Compute mini calendar grid
  const miniCalendarDays = React.useMemo(() => {
    const year = viewedMonth.getFullYear();
    const month = viewedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay(); // 0 is Sun
    const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start

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

  // Map of date strings that have events
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
          fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] shadow-2xl transition-transform duration-300 lg:static lg:w-72 lg:shadow-none lg:translate-x-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:hidden' : 'lg:flex'}
        `}
      >
        {/* Mobile Header Bar */}
        <div className="lg:hidden flex items-center justify-between p-3.5 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300">
          <span className="text-xs font-black text-pink-950 flex items-center gap-1.5">
            <span>Barbie Planner & Tasks</span>
            <span>💖</span>
          </span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-pink-700 hover:text-pink-900 hover:bg-pink-200/70 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Mini Month Calendar */}
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

        {/* Days of week header */}
        <div className="grid grid-cols-7 text-center mb-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
            <span key={idx} className="text-[10px] font-bold text-pink-400 py-1">
              {day}
            </span>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {miniCalendarDays.map((d, i) => {
            const dateStr = formatDateKey(d);
            const isSelected = isSameDay(d, currentDate);
            const isToday = isSameDay(d, new Date());
            const isCurrentMonth = d.getMonth() === viewedMonth.getMonth();
            const hasEvents = eventDateSet.has(dateStr);
            const cycleStatus = cycleSettings ? getDayCycleStatus(dateStr, cycleSettings) : null;

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
                    : cycleStatus?.isPeriod
                    ? 'bg-rose-100/90 text-rose-800 font-bold border border-rose-300'
                    : isCurrentMonth
                    ? 'text-pink-950 hover:bg-pink-100/80 font-medium'
                    : 'text-pink-300 hover:text-pink-400'
                }`}
                title={
                  cycleStatus?.isPeriod
                    ? `Period (Day ${cycleStatus.cycleDay}) 🩸`
                    : cycleStatus?.isOvulation
                    ? 'Ovulation Day ✨'
                    : undefined
                }
              >
                <span>{d.getDate()}</span>
                {hasEvents && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-pink-500" />
                )}
                {cycleStatus?.isPeriod && !isSelected && (
                  <span className="absolute -top-0.5 -right-0.5 text-[7px] leading-none">🩸</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Barbie Cycle & Phase Glow Card */}
      {cycleSettings && (
        <div className="p-3.5 border-b border-pink-200/80 bg-gradient-to-br from-pink-50 via-rose-50/60 to-pink-100/40">
          {(() => {
            const cycleInfo = getCurrentCycleInfo(currentDate, cycleSettings);
            return (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{cycleInfo.icon}</span>
                    <span className="text-xs font-black text-pink-950 uppercase tracking-tight">
                      Cycle Glow
                    </span>
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-pink-200/90 text-pink-800">
                    Day {cycleInfo.cycleDay}/{cycleInfo.cycleLength}
                  </span>
                </div>

                <div className="text-xs font-bold text-pink-900 mb-1 flex items-center gap-1">
                  <span>{cycleInfo.phaseName}</span>
                </div>

                <div className="text-[11px] text-pink-700 font-medium mb-2 leading-snug">
                  {cycleInfo.isPeriod ? (
                    <span className="text-rose-700 font-bold flex items-center gap-1">
                      <span>🩸</span>
                      <span>Period Active · Rest & Reset</span>
                    </span>
                  ) : (
                    <span>Next Period: {cycleInfo.nextPeriodDate} ({cycleInfo.daysUntilNextPeriod}d)</span>
                  )}
                </div>

                <button
                  onClick={onOpenCycle}
                  className="w-full py-1.5 px-2 bg-white/95 hover:bg-pink-100/80 border border-pink-300 rounded-xl text-xs font-bold text-pink-700 shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-pink-500" />
                  <span>Phase Guidance & Tips ✨</span>
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Barbie De-Stress & Schoolwork Overload SOS Card */}
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
            onClick={onOpenCalmSanctuary}
            className="w-full py-1.5 px-2 bg-white/95 hover:bg-rose-100/80 border border-rose-300 rounded-xl text-xs font-bold text-rose-700 shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-rose-500" />
            <span>Overload Triage & Breathing</span>
          </button>
        </div>
      )}

      {/* 2. Calendars & Categories Filter */}
      <div className="p-4 border-b border-pink-200/70">
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

      {/* 3. Unscheduled Tasks / Timebox Queue */}
      <div className="flex-1 p-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-pink-900 uppercase tracking-wider flex items-center gap-1">
              <span>Inbox & Backlog</span>
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

        {/* Task Quick Creator Form */}
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

        {/* Task List */}
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

                  {/* Action buttons on hover */}
                  {!task.completed && (
                    <div className="mt-2 pt-2 border-t border-pink-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onScheduleTask(task)}
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
                          title={task.reminderMinutesBefore ? `Reminder set (${task.reminderMinutesBefore}m before)` : 'Set cute reminder 🎀'}
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
    </aside>
  </>
);
};
