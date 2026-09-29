import React from 'react';
import { CalendarEvent, EventCategory } from '../types/calendar';
import { CATEGORY_LIST, getCategoryConfig } from '../utils/categories';
import { 
  formatDateKey, 
  getDaysOfWeek, 
  getDurationHours, 
  timeToMinutes 
} from '../utils/dateUtils';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Lightbulb, 
  ShieldAlert, 
  TrendingUp,
  Brain,
  Coffee
} from 'lucide-react';

interface TimeAuditViewProps {
  currentDate: Date;
  events: CalendarEvent[];
}

export const TimeAuditView: React.FC<TimeAuditViewProps> = ({
  currentDate,
  events,
}) => {
  const weekDays = React.useMemo(() => getDaysOfWeek(currentDate), [currentDate]);
  const weekDateKeys = React.useMemo(() => new Set(weekDays.map(formatDateKey)), [weekDays]);

  // Filter events belonging to this week
  const weekEvents = React.useMemo(() => {
    return events.filter((ev) => weekDateKeys.has(ev.date));
  }, [events, weekDateKeys]);

  // Analytics computation
  const stats = React.useMemo(() => {
    let totalScheduledHours = 0;
    let completedEvents = 0;
    const hoursByCategory: Record<EventCategory, number> = {
      deep_work: 0,
      meetings: 0,
      planning: 0,
      health: 0,
      personal: 0,
      admin: 0,
    };

    const hoursByDay: Record<string, number> = {};
    weekDays.forEach((d) => (hoursByDay[formatDateKey(d)] = 0));

    weekEvents.forEach((ev) => {
      const dur = getDurationHours(ev.startTime, ev.endTime);
      totalScheduledHours += dur;
      hoursByCategory[ev.category] = (hoursByCategory[ev.category] || 0) + dur;
      hoursByDay[ev.date] = (hoursByDay[ev.date] || 0) + dur;
      if (ev.isCompleted) completedEvents++;
    });

    const completionRate = weekEvents.length > 0 ? (completedEvents / weekEvents.length) * 100 : 0;
    const deepWorkHours = hoursByCategory.deep_work || 0;
    const meetingsHours = hoursByCategory.meetings || 0;
    const makerRatio = (deepWorkHours + meetingsHours) > 0 
      ? (deepWorkHours / (deepWorkHours + meetingsHours)) * 100 
      : 50;

    return {
      totalScheduledHours,
      completedEvents,
      totalEvents: weekEvents.length,
      completionRate,
      hoursByCategory,
      hoursByDay,
      deepWorkHours,
      meetingsHours,
      makerRatio,
    };
  }, [weekEvents, weekDays]);

  // Smart suggestions
  const suggestions = React.useMemo(() => {
    const list: { type: 'tip' | 'alert' | 'success'; text: string }[] = [];

    if (stats.makerRatio < 60) {
      list.push({
        type: 'alert',
        text: `Maker vs Manager balance is at ${stats.makerRatio.toFixed(0)}% deep work. Try bundling syncs into dedicated meeting afternoons to protect morning flow.`,
      });
    } else {
      list.push({
        type: 'success',
        text: `Great deep work defense: ${stats.makerRatio.toFixed(0)}% of collaborative time is preserved for uninterrupted maker state.`,
      });
    }

    if ((stats.hoursByCategory.health || 0) < 4) {
      list.push({
        type: 'tip',
        text: 'Only ' + (stats.hoursByCategory.health || 0).toFixed(1) + 'h scheduled for health & recovery this week. Consider booking a 30m daily walk or workout block.',
      });
    }

    if ((stats.hoursByCategory.planning || 0) >= 2) {
      list.push({
        type: 'success',
        text: 'Regular strategy & retrospective timeboxes are booked, preventing weekly drift.',
      });
    } else {
      list.push({
        type: 'tip',
        text: 'Add a 45-minute Friday Weekly Retrospective block to celebrate wins and plan next week ahead.',
      });
    }

    return list;
  }, [stats]);

  const maxDayHours = Math.max(...Object.values(stats.hoursByDay), 8);

  return (
    <div className="flex-1 bg-pink-50/30 p-6 overflow-y-auto select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Kicker */}
        <div className="flex items-center justify-between pb-4 border-b border-pink-200">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-pink-950 flex items-center gap-2">
              <span>Barbie Time Audit & Glow-Up Cadence</span>
              <span>💖</span>
            </h2>
            <p className="text-xs text-pink-600 font-medium mt-0.5">
              Measuring intentional hours, dream goals, and focus glow 🌸
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-pink-700 bg-pink-100/80 px-3 py-1.5 rounded-xl border border-pink-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-pink-600" />
            <span>{stats.totalScheduledHours.toFixed(1)}h Total Planned ✨</span>
          </div>
        </div>

        {/* Top 3 Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Maker vs Manager Score */}
          <div className="p-5 bg-white/95 rounded-2xl border border-pink-200 shadow-xs shadow-pink-100/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-600">
                Maker vs Manager Ratio 👑
              </span>
              <Brain className="w-4 h-4 text-pink-500" />
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-extrabold font-mono text-pink-950">
                {stats.makerRatio.toFixed(0)}%
              </span>
              <span className="text-xs text-pink-600 font-medium">Deep Focus</span>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 w-full bg-pink-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${stats.makerRatio}%` }}
                className="bg-pink-500 transition-all"
              />
              <div
                style={{ width: `${100 - stats.makerRatio}%` }}
                className="bg-rose-400 transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-pink-600 mt-2 font-mono font-medium">
              <span>{stats.deepWorkHours.toFixed(1)}h Deep Focus</span>
              <span>{stats.meetingsHours.toFixed(1)}h Meet & Sync</span>
            </div>
          </div>

          {/* Card 2: Timebox Execution Rate */}
          <div className="p-5 bg-white/95 rounded-2xl border border-pink-200 shadow-xs shadow-pink-100/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-600">
                Timebox Execution 💖
              </span>
              <CheckCircle2 className="w-4 h-4 text-pink-500" />
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-extrabold font-mono text-pink-950">
                {stats.completionRate.toFixed(0)}%
              </span>
              <span className="text-xs text-pink-600 font-medium">completed</span>
            </div>

            <div className="h-2.5 w-full bg-pink-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${stats.completionRate}%` }}
                className="h-full bg-pink-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-pink-600 mt-2 font-mono font-medium">
              <span>{stats.completedEvents} done</span>
              <span>{stats.totalEvents} total scheduled</span>
            </div>
          </div>

          {/* Card 3: Deep Work Capacity */}
          <div className="p-5 bg-white/95 rounded-2xl border border-pink-200 shadow-xs shadow-pink-100/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-600">
                Deep Focus Target 🎀
              </span>
              <Flame className="w-4 h-4 text-pink-500" />
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-extrabold font-mono text-pink-950">
                {stats.deepWorkHours.toFixed(1)}h
              </span>
              <span className="text-xs text-pink-600 font-medium">/ 20h target</span>
            </div>

            <div className="h-2.5 w-full bg-pink-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(100, (stats.deepWorkHours / 20) * 100)}%` }}
                className="h-full bg-pink-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-pink-600 mt-2 font-mono font-medium">
              <span>{((stats.deepWorkHours / 20) * 100).toFixed(0)}% of goal ✨</span>
              <span>{Math.max(0, 20 - stats.deepWorkHours).toFixed(1)}h remaining</span>
            </div>
          </div>
        </div>

        {/* Middle Section: Category Progress Breakdown & Daily Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Allocation vs Targets */}
          <div className="p-5 bg-white/95 rounded-2xl border border-pink-200 shadow-xs shadow-pink-100/50">
            <h3 className="text-sm font-extrabold text-pink-950 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pink-500" />
              Hours by Category vs. Weekly Intent 🌸
            </h3>

            <div className="space-y-3">
              {CATEGORY_LIST.map((cat) => {
                const actual = stats.hoursByCategory[cat.id] || 0;
                const target = cat.weeklyTargetHours;
                const percent = target > 0 ? (actual / target) * 100 : 0;

                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-bold text-pink-950">{cat.label}</span>
                      </div>
                      <span className="font-mono text-pink-700 font-medium text-[11px]">
                        {actual.toFixed(1)}h / {target}h target
                      </span>
                    </div>

                    <div className="h-2 w-full bg-pink-100 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(100, percent)}%`,
                          backgroundColor: cat.color,
                        }}
                        className="h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Schedule Load Bar Chart */}
          <div className="p-5 bg-white/95 rounded-2xl border border-pink-200 shadow-xs shadow-pink-100/50 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-pink-950 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-pink-500" />
                Daily Time Distribution ✨
              </h3>

              <div className="h-44 flex items-end justify-between gap-3 pt-4 border-b border-pink-200 px-2">
                {weekDays.map((day) => {
                  const dateStr = formatDateKey(day);
                  const hours = stats.hoursByDay[dateStr] || 0;
                  const heightPercent = maxDayHours > 0 ? (hours / maxDayHours) * 100 : 0;
                  const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });

                  return (
                    <div key={dateStr} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] font-mono font-bold text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        {hours.toFixed(1)}h
                      </span>
                      <div className="w-full bg-pink-100/70 rounded-t-xl h-32 flex items-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-pink-500/85 hover:bg-pink-500 rounded-t-xl transition-all cursor-pointer shadow-xs shadow-pink-200"
                          title={`${dayName}: ${hours.toFixed(1)} hours scheduled`}
                        />
                      </div>
                      <span className="text-xs font-bold text-pink-900 mt-1">
                        {dayName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-pink-500 font-medium mt-3 text-center">
              Aim for a consistent 6h–7h focused timebox load with clear rest & beauty sleep on weekends 🌸
            </p>
          </div>
        </div>

        {/* Bottom: Intentional Scheduling Recommendations */}
        <div className="p-5 bg-white/95 rounded-2xl border border-pink-200 shadow-xs shadow-pink-100/50">
          <h3 className="text-sm font-extrabold text-pink-950 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-pink-500" />
            Cadence Insights & Glow-Up Tips 💖
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((sug, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-pink-200 bg-pink-50/70 flex items-start gap-2.5 text-xs text-pink-950"
              >
                {sug.type === 'alert' ? (
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                ) : sug.type === 'tip' ? (
                  <Coffee className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed font-medium">{sug.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
