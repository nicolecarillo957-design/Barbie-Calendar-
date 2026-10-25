import React, { useState, useMemo } from 'react';
import { 
  CalendarEvent, 
  UnscheduledTask, 
  StudentStreakData, 
  TaskEvidence 
} from '../types/calendar';
import { 
  formatDateKey, 
  parseDateKey 
} from '../utils/dateUtils';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Camera, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Download, 
  GraduationCap, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Eye, 
  MessageSquare,
  FileCheck,
  Zap,
  Target,
  FileText
} from 'lucide-react';
import { cuteSound } from '../utils/cuteSound';
import { WeeklySummaryModal } from './WeeklySummaryModal';

interface WeeklyInsightsViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  tasks: UnscheduledTask[];
  streakData: StudentStreakData;
  studentName: string;
  onOpenTeacherMonitor?: () => void;
  onUpdateEventEvidence?: (eventId: string, updatedEvidence: TaskEvidence) => void;
  onUpdateTaskEvidence?: (taskId: string, updatedEvidence: TaskEvidence) => void;
}

interface DayCompletionData {
  dayKey: string;
  displayDay: string;
  fullDateLabel: string;
  completedCount: number;
  deepWorkCount: number;
  standardCount: number;
  pointsEarned: number;
  scheduledTotal: number;
  evidenceItems: {
    id: string;
    title: string;
    category: string;
    points: number;
    completedAt: string;
    completedTimeFormatted: string;
    photoUrl?: string;
    notes?: string;
    teacherVerified?: boolean;
    teacherFeedback?: string;
    type: 'event' | 'task';
  }[];
}

export const WeeklyInsightsView: React.FC<WeeklyInsightsViewProps> = ({
  currentDate,
  events,
  tasks,
  streakData,
  studentName,
  onOpenTeacherMonitor,
  onUpdateEventEvidence,
  onUpdateTaskEvidence,
}) => {
  const [metricMode, setMetricMode] = useState<'tasks' | 'points' | 'breakdown'>('tasks');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [isWeeklySummaryOpen, setIsWeeklySummaryOpen] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<{
    photoUrl: string;
    title: string;
    timestamp: string;
    studentName: string;
    notes?: string;
  } | null>(null);

  // Teacher feedback notes stored in localStorage
  const TEACHER_NOTES_KEY = `barbie_teacher_weekly_notes_${studentName.replace(/\s+/g, '_')}`;
  const [teacherNotes, setTeacherNotes] = useState<string>(() => {
    try {
      return localStorage.getItem(TEACHER_NOTES_KEY) || '';
    } catch {
      return '';
    }
  });

  const handleSaveTeacherNotes = (notes: string) => {
    setTeacherNotes(notes);
    try {
      localStorage.setItem(TEACHER_NOTES_KEY, notes);
    } catch (e) {
      console.error(e);
    }
  };

  // Generate the last 7 days window ending at currentDate (or today)
  const last7Days = useMemo(() => {
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Build aggregated data for the 7 days
  const weeklyData: DayCompletionData[] = useMemo(() => {
    return last7Days.map((dayObj) => {
      const dayKey = formatDateKey(dayObj);
      const displayDay = dayObj.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      const fullDateLabel = dayObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

      // Find events completed on this date
      // An event is completed on this date either if event.date === dayKey and event.isCompleted,
      // or if event.evidence?.completedAt starts with dayKey
      const dayEvents = events.filter((e) => {
        if (!e.isCompleted) return false;
        if (e.evidence?.completedAt) {
          return e.evidence.completedAt.startsWith(dayKey);
        }
        return e.date === dayKey;
      });

      // Find tasks completed on this date (via evidence completedAt)
      const dayTasks = tasks.filter((t) => {
        if (!t.completed) return false;
        if (t.evidence?.completedAt) {
          return t.evidence.completedAt.startsWith(dayKey);
        }
        return false;
      });

      // Scheduled total for that day
      const scheduledDayEvents = events.filter((e) => e.date === dayKey);

      const evidenceItems = [
        ...dayEvents.map((e) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          points: e.evidence?.pointsEarned || e.pointsValue || 10,
          completedAt: e.evidence?.completedAt || `${dayKey}T12:00:00Z`,
          completedTimeFormatted: e.evidence?.completedTimeFormatted || `Completed on ${dayKey}`,
          photoUrl: e.evidence?.photoUrl,
          notes: e.evidence?.notes,
          teacherVerified: e.evidence?.teacherVerified,
          teacherFeedback: e.evidence?.teacherFeedback,
          type: 'event' as const,
        })),
        ...dayTasks.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          points: t.evidence?.pointsEarned || t.pointsValue || 5,
          completedAt: t.evidence?.completedAt || `${dayKey}T12:00:00Z`,
          completedTimeFormatted: t.evidence?.completedTimeFormatted || `Completed on ${dayKey}`,
          photoUrl: t.evidence?.photoUrl,
          notes: t.evidence?.notes,
          teacherVerified: t.evidence?.teacherVerified,
          teacherFeedback: t.evidence?.teacherFeedback,
          type: 'task' as const,
        })),
      ];

      const deepWorkCount = evidenceItems.filter(
        (item) => item.category === 'deep_work' || item.category === 'planning'
      ).length;
      const standardCount = evidenceItems.length - deepWorkCount;
      const pointsEarned = evidenceItems.reduce((acc, curr) => acc + curr.points, 0);

      return {
        dayKey,
        displayDay,
        fullDateLabel,
        completedCount: evidenceItems.length,
        deepWorkCount,
        standardCount,
        pointsEarned,
        scheduledTotal: Math.max(scheduledDayEvents.length, evidenceItems.length),
        evidenceItems,
      };
    });
  }, [last7Days, events, tasks]);

  // Overall statistics for the 7-day period
  const totalCompletedInWeek = useMemo(() => {
    return weeklyData.reduce((acc, d) => acc + d.completedCount, 0);
  }, [weeklyData]);

  const totalPointsInWeek = useMemo(() => {
    return weeklyData.reduce((acc, d) => acc + d.pointsEarned, 0);
  }, [weeklyData]);

  const totalPhotoProofs = useMemo(() => {
    return weeklyData.reduce((acc, d) => {
      return acc + d.evidenceItems.filter((item) => !!item.photoUrl).length;
    }, 0);
  }, [weeklyData]);

  const verifiedProofsCount = useMemo(() => {
    return weeklyData.reduce((acc, d) => {
      return acc + d.evidenceItems.filter((item) => item.teacherVerified).length;
    }, 0);
  }, [weeklyData]);

  // Peak productivity day
  const peakDay = useMemo(() => {
    let max = weeklyData[0];
    weeklyData.forEach((d) => {
      if (d.completedCount > (max?.completedCount || 0)) {
        max = d;
      }
    });
    return max;
  }, [weeklyData]);

  // Time-of-day distribution (Morning, Afternoon, Evening)
  const timeOfDayStats = useMemo(() => {
    let morning = 0; // before 12:00
    let afternoon = 0; // 12:00 to 17:00
    let evening = 0; // after 17:00

    weeklyData.forEach((d) => {
      d.evidenceItems.forEach((item) => {
        try {
          const dateObj = new Date(item.completedAt);
          const hour = dateObj.getHours();
          if (hour < 12) morning++;
          else if (hour < 17) afternoon++;
          else evening++;
        } catch {
          afternoon++;
        }
      });
    });

    return { morning, afternoon, evening };
  }, [weeklyData]);

  // Download teacher report
  const handleExportWeeklyReport = () => {
    cuteSound.playSparkle();
    const reportData = {
      reportTitle: `Weekly Productivity Insights Report - ${studentName}`,
      generatedAt: new Date().toISOString(),
      studentName,
      streak: streakData.currentStreak,
      totalPointsAllTime: streakData.totalPoints,
      weeklySummary: {
        dateRange: `${weeklyData[0]?.displayDay} to ${weeklyData[weeklyData.length - 1]?.displayDay}`,
        totalCompletedTasks: totalCompletedInWeek,
        totalPointsEarned: totalPointsInWeek,
        photoProofsSubmitted: totalPhotoProofs,
        teacherVerifiedCount: verifiedProofsCount,
        peakProductivityDay: peakDay?.fullDateLabel || 'N/A',
      },
      dailyBreakdown: weeklyData.map((d) => ({
        date: d.dayKey,
        day: d.displayDay,
        tasksCompleted: d.completedCount,
        pointsEarned: d.pointsEarned,
        tasks: d.evidenceItems.map((item) => ({
          title: item.title,
          category: item.category,
          points: item.points,
          completedAtFormatted: item.completedTimeFormatted,
          hasPhotoEvidence: !!item.photoUrl,
          verified: !!item.teacherVerified,
          teacherFeedback: item.teacherFeedback || '',
        })),
      })),
      teacherObservations: teacherNotes,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Weekly_Insights_${studentName.replace(/\s+/g, '_')}_${formatDateKey(currentDate)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data for Recharts
  const chartData = useMemo(() => {
    return weeklyData.map((d) => ({
      day: d.displayDay,
      dayKey: d.dayKey,
      fullDateLabel: d.fullDateLabel,
      'Completed Tasks': d.completedCount,
      'Deep Work': d.deepWorkCount,
      'Standard Tasks': d.standardCount,
      'Points Earned': d.pointsEarned,
      evidenceCount: d.evidenceItems.length,
      evidenceItems: d.evidenceItems,
    }));
  }, [weeklyData]);

  // Selected day items
  const activeDayData = useMemo(() => {
    if (!selectedDayKey) return null;
    return weeklyData.find((d) => d.dayKey === selectedDayKey) || null;
  }, [selectedDayKey, weeklyData]);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-linear-to-b from-pink-50/70 via-white to-pink-50/40">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 1. Header Banner */}
        <div className="bg-linear-to-r from-pink-500 via-rose-500 to-fuchsia-600 rounded-2xl p-4 sm:p-6 text-white shadow-lg shadow-pink-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white">
                <BarChart3 className="w-5 h-5" />
              </span>
              <span className="text-xs uppercase tracking-wider font-extrabold text-pink-100">
                Teacher Monitoring & Analytics
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              Weekly Productivity Insights
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            </h1>
            <p className="text-pink-100 text-xs sm:text-sm mt-1 max-w-xl">
              Visualizing {studentName}&apos;s task completion, points accumulation, and timestamped photo evidence over the last 7 days.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Student Badge */}
            <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-3 py-2 flex items-center gap-2 text-white">
              <GraduationCap className="w-5 h-5 text-yellow-300" />
              <div>
                <p className="text-[10px] text-pink-100 uppercase font-bold tracking-wider">Student</p>
                <p className="text-xs font-black">{studentName}</p>
              </div>
            </div>

            {/* Streak Badge */}
            <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-3 py-2 flex items-center gap-2 text-white">
              <span className="text-lg">🔥</span>
              <div>
                <p className="text-[10px] text-pink-100 uppercase font-bold tracking-wider">Active Streak</p>
                <p className="text-xs font-black">{streakData.currentStreak} Days</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  cuteSound.playSparkle();
                  setIsWeeklySummaryOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-pink-900 bg-white hover:bg-pink-50 rounded-xl transition-transform active:scale-95 shadow-sm"
                title="Generate parent-ready performance report with streaks, points, and praise"
              >
                <FileText className="w-4 h-4 text-pink-600" />
                <span>Weekly Summary 📋</span>
              </button>

              <button
                onClick={handleExportWeeklyReport}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-pink-900 bg-white hover:bg-pink-50 rounded-xl transition-transform active:scale-95 shadow-sm"
                title="Download JSON Analytics Report"
              >
                <Download className="w-4 h-4 text-pink-600" />
                <span className="hidden sm:inline">Export Report</span>
              </button>

              {onOpenTeacherMonitor && (
                <button
                  onClick={onOpenTeacherMonitor}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-pink-900/40 hover:bg-pink-900/60 border border-white/30 rounded-xl transition-all"
                  title="Open Full Teacher Review Portal"
                >
                  <FileCheck className="w-4 h-4 text-pink-200" />
                  <span>Teacher Portal</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Top Metric Cards (KPIs) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: 7-Day Completed Tasks */}
          <div className="bg-white rounded-xl p-4 border border-pink-100 shadow-xs hover:border-pink-300 transition-colors">
            <div className="flex items-center justify-between text-pink-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400">7-Day Tasks Done</span>
              <div className="p-1.5 bg-pink-50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-pink-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-pink-950">{totalCompletedInWeek}</span>
              <span className="text-xs text-pink-600 font-semibold">completed</span>
            </div>
            <p className="text-[11px] text-pink-400 mt-1">
              Avg {(totalCompletedInWeek / 7).toFixed(1)} tasks/day
            </p>
          </div>

          {/* Card 2: Points Earned */}
          <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-xs hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between text-amber-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Points Earned</span>
              <div className="p-1.5 bg-amber-50 rounded-lg">
                <Award className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">+{totalPointsInWeek}</span>
              <span className="text-xs text-amber-700 font-bold">pts this week</span>
            </div>
            <p className="text-[11px] text-amber-600/80 mt-1">
              {streakData.totalPoints} total lifetime points
            </p>
          </div>

          {/* Card 3: Photo Proofs */}
          <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-xs hover:border-rose-300 transition-colors">
            <div className="flex items-center justify-between text-rose-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Photo Proofs</span>
              <div className="p-1.5 bg-rose-50 rounded-lg">
                <Camera className="w-4 h-4 text-rose-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-950">{totalPhotoProofs}</span>
              <span className="text-xs text-rose-600 font-semibold">photos stamped</span>
            </div>
            <p className="text-[11px] text-rose-500 font-medium mt-1">
              {totalCompletedInWeek > 0 
                ? `${Math.round((totalPhotoProofs / totalCompletedInWeek) * 100)}% evidence compliance` 
                : '100% compliance'}
            </p>
          </div>

          {/* Card 4: Peak Productivity */}
          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-xs hover:border-purple-300 transition-colors">
            <div className="flex items-center justify-between text-purple-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Peak Study Day</span>
              <div className="p-1.5 bg-purple-50 rounded-lg">
                <Zap className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-purple-950 truncate">
                {peakDay && peakDay.completedCount > 0 ? peakDay.displayDay : 'Consistent'}
              </span>
              <span className="text-xs text-purple-600 font-bold">
                {peakDay ? `${peakDay.completedCount} done` : ''}
              </span>
            </div>
            <p className="text-[11px] text-purple-500 font-medium mt-1">
              Highest output in 7 days
            </p>
          </div>
        </div>

        {/* 3. Recharts Bar Chart Container */}
        <div className="bg-white rounded-2xl border border-pink-200/90 p-4 sm:p-6 shadow-sm">
          {/* Chart Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-pink-600" />
                <h2 className="text-base sm:text-lg font-black text-pink-950">
                  Daily Task Completion & Productivity
                </h2>
              </div>
              <p className="text-xs text-pink-500 mt-0.5">
                Bar visualization over the 7-day period ({weeklyData[0]?.displayDay} – {weeklyData[weeklyData.length - 1]?.displayDay}). Click any bar to inspect proofs!
              </p>
            </div>

            {/* Metric Switcher Pills */}
            <div className="flex items-center bg-pink-50 p-1 rounded-xl border border-pink-200/80 self-start sm:self-auto">
              <button
                onClick={() => setMetricMode('tasks')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  metricMode === 'tasks'
                    ? 'bg-pink-500 text-white shadow-2xs'
                    : 'text-pink-700 hover:text-pink-900'
                }`}
              >
                Tasks Done
              </button>
              <button
                onClick={() => setMetricMode('breakdown')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  metricMode === 'breakdown'
                    ? 'bg-pink-500 text-white shadow-2xs'
                    : 'text-pink-700 hover:text-pink-900'
                }`}
              >
                Category Split
              </button>
              <button
                onClick={() => setMetricMode('points')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  metricMode === 'points'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                Points (⭐)
              </button>
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div className="w-full h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const clickedKey = e.activePayload[0].payload?.dayKey;
                    if (clickedKey) {
                      setSelectedDayKey(clickedKey);
                      cuteSound.playCutePop();
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fce7f3" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: '#831843', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#fbcfe8' }}
                  tickLine={{ stroke: '#fbcfe8' }}
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fill: '#9d174d', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#fbcfe8' }}
                  tickLine={{ stroke: '#fbcfe8' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white/95 backdrop-blur-md border border-pink-200 rounded-xl p-3 shadow-xl text-xs space-y-1.5 max-w-xs">
                        <div className="border-b border-pink-100 pb-1 flex items-center justify-between">
                          <span className="font-extrabold text-pink-950">{data.fullDateLabel}</span>
                          <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full font-bold">
                            {data.evidenceCount} proofs
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-pink-700 font-semibold">
                            <span>Tasks Completed:</span>
                            <span className="font-bold text-pink-950">{data['Completed Tasks']}</span>
                          </div>
                          <div className="flex justify-between items-center text-amber-700 font-semibold">
                            <span>Points Earned:</span>
                            <span className="font-bold text-amber-600">+{data['Points Earned']} pts</span>
                          </div>
                        </div>
                        {data.evidenceItems && data.evidenceItems.length > 0 && (
                          <div className="pt-1.5 border-t border-pink-100">
                            <p className="text-[10px] text-pink-400 font-bold uppercase mb-1">Finished tasks:</p>
                            <ul className="space-y-0.5">
                              {data.evidenceItems.slice(0, 3).map((item: any, idx: number) => (
                                <li key={idx} className="text-[11px] text-pink-900 truncate flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                                  {item.title}
                                </li>
                              ))}
                              {data.evidenceItems.length > 3 && (
                                <li className="text-[10px] text-pink-500 font-semibold">
                                  +{data.evidenceItems.length - 3} more
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                        <p className="text-[10px] text-pink-400 italic pt-1">
                          Click bar to inspect student submissions & photo proofs
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                />

                {metricMode === 'tasks' && (
                  <Bar 
                    dataKey="Completed Tasks" 
                    fill="#ec4899" 
                    radius={[6, 6, 0, 0]} 
                    cursor="pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.dayKey === selectedDayKey ? '#be185d' : '#ec4899'} 
                      />
                    ))}
                  </Bar>
                )}

                {metricMode === 'breakdown' && (
                  <>
                    <Bar 
                      dataKey="Deep Work" 
                      stackId="a" 
                      fill="#db2777" 
                      radius={[0, 0, 0, 0]} 
                      cursor="pointer"
                    />
                    <Bar 
                      dataKey="Standard Tasks" 
                      stackId="a" 
                      fill="#f472b6" 
                      radius={[6, 6, 0, 0]} 
                      cursor="pointer"
                    />
                  </>
                )}

                {metricMode === 'points' && (
                  <Bar 
                    dataKey="Points Earned" 
                    fill="#f59e0b" 
                    radius={[6, 6, 0, 0]} 
                    cursor="pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-pts-${index}`} 
                        fill={entry.dayKey === selectedDayKey ? '#d97706' : '#f59e0b'} 
                      />
                    ))}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick day buttons bar */}
          <div className="mt-4 pt-4 border-t border-pink-100 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-pink-800 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-pink-500" />
              Day Inspection:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {weeklyData.map((d) => {
                const isSelected = d.dayKey === selectedDayKey;
                return (
                  <button
                    key={d.dayKey}
                    onClick={() => {
                      setSelectedDayKey(isSelected ? null : d.dayKey);
                      cuteSound.playCutePop();
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-pink-50/70 text-pink-800 border-pink-200/80 hover:bg-pink-100'
                    }`}
                  >
                    {d.displayDay} ({d.completedCount})
                  </button>
                );
              })}
              {selectedDayKey && (
                <button
                  onClick={() => setSelectedDayKey(null)}
                  className="px-2 py-1 text-xs text-pink-500 hover:text-pink-800 font-semibold"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Productivity Pattern Analysis & Teacher Observations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Study Time Distribution */}
          <div className="bg-white rounded-2xl border border-pink-200/80 p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-pink-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-pink-900">
                Completion Time Patterns
              </h3>
            </div>
            <p className="text-xs text-pink-500 mb-3">
              Distribution of when assignments are finished and timestamped:
            </p>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-pink-800">Morning (Before 12 PM)</span>
                  <span className="text-pink-600">{timeOfDayStats.morning} tasks</span>
                </div>
                <div className="w-full bg-pink-100 rounded-full h-2">
                  <div 
                    className="bg-pink-400 h-2 rounded-full" 
                    style={{ width: `${totalCompletedInWeek > 0 ? (timeOfDayStats.morning / totalCompletedInWeek) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-rose-800">Afternoon (12 PM - 5 PM)</span>
                  <span className="text-rose-600">{timeOfDayStats.afternoon} tasks</span>
                </div>
                <div className="w-full bg-rose-100 rounded-full h-2">
                  <div 
                    className="bg-rose-500 h-2 rounded-full" 
                    style={{ width: `${totalCompletedInWeek > 0 ? (timeOfDayStats.afternoon / totalCompletedInWeek) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-purple-800">Evening (After 5 PM)</span>
                  <span className="text-purple-600">{timeOfDayStats.evening} tasks</span>
                </div>
                <div className="w-full bg-purple-100 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${totalCompletedInWeek > 0 ? (timeOfDayStats.evening / totalCompletedInWeek) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Observation Notes (Persistent) */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-pink-200/80 p-4 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-pink-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-pink-900">
                  Teacher Observation & Feedback Notes
                </h3>
              </div>
              <span className="text-[10px] text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full font-bold">
                Auto-Saved
              </span>
            </div>
            <textarea
              value={teacherNotes}
              onChange={(e) => handleSaveTeacherNotes(e.target.value)}
              placeholder={`Write weekly notes for ${studentName}... (e.g. "Excellent work completing Math timeboxes before 5 PM! Picture proofs are clearly stamped and verified.")`}
              className="flex-1 w-full p-3 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-400 focus:bg-white text-pink-950 placeholder:text-pink-400 min-h-[90px] resize-none"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-pink-500">
              <span>Included in exportable weekly report</span>
              <button
                onClick={() => {
                  cuteSound.playSparkle();
                  handleExportWeeklyReport();
                }}
                className="text-pink-600 hover:text-pink-800 font-bold underline"
              >
                Download PDF / JSON Report
              </button>
            </div>
          </div>
        </div>

        {/* 5. Day-by-Day Picture Evidence Inspection Feed */}
        <div className="bg-white rounded-2xl border border-pink-200/90 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-pink-950 flex items-center gap-2">
                <Camera className="w-5 h-5 text-pink-500" />
                <span>
                  {activeDayData 
                    ? `Evidence Inspection for ${activeDayData.fullDateLabel}` 
                    : 'All Submitted Picture Proofs (Last 7 Days)'}
                </span>
              </h3>
              <p className="text-xs text-pink-500 mt-0.5">
                Every picture includes an exact completion timestamp. Click photo thumbnail to enlarge.
              </p>
            </div>
            {activeDayData && (
              <button
                onClick={() => setSelectedDayKey(null)}
                className="text-xs text-pink-600 hover:text-pink-800 font-bold underline"
              >
                Show All 7 Days
              </button>
            )}
          </div>

          {/* Submissions Grid */}
          {(() => {
            const itemsToShow = activeDayData
              ? activeDayData.evidenceItems
              : weeklyData.flatMap((d) => d.evidenceItems);

            if (itemsToShow.length === 0) {
              return (
                <div className="py-12 text-center border-2 border-dashed border-pink-200 rounded-xl bg-pink-50/40">
                  <Camera className="w-10 h-10 text-pink-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-pink-800">No Task Completions Recorded</p>
                  <p className="text-xs text-pink-500 mt-1 max-w-sm mx-auto">
                    When {studentName} checks off tasks on the calendar and attaches photo evidence, they will appear here with verified timestamps.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {itemsToShow.map((item) => (
                  <div
                    key={item.id}
                    className="border border-pink-200 rounded-xl p-3 bg-pink-50/20 hover:bg-pink-50/50 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      {/* Photo Thumbnail */}
                      {item.photoUrl ? (
                        <div 
                          onClick={() => {
                            setActivePhotoModal({
                              photoUrl: item.photoUrl!,
                              title: item.title,
                              timestamp: item.completedTimeFormatted,
                              studentName,
                              notes: item.notes,
                            });
                            cuteSound.playCutePop();
                          }}
                          className="relative w-full h-36 rounded-lg overflow-hidden bg-pink-100 mb-2.5 cursor-pointer group border border-pink-200"
                        >
                          <img 
                            src={item.photoUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-5 h-5 drop-shadow-md" />
                          </div>
                          <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                            {item.completedTimeFormatted.split(' at ')[1] || 'Time Stamped'}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-24 rounded-lg bg-pink-100/60 border border-dashed border-pink-300 flex items-center justify-center text-pink-400 mb-2.5">
                          <Camera className="w-6 h-6 mr-1.5" />
                          <span className="text-xs font-bold">Self-reported check</span>
                        </div>
                      )}

                      {/* Title & Category */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="text-xs font-bold text-pink-950 line-clamp-1">{item.title}</h4>
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0">
                          +{item.points}p
                        </span>
                      </div>

                      {/* Time stamp */}
                      <p className="text-[11px] text-pink-600 font-medium flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-pink-400" />
                        <span>{item.completedTimeFormatted}</span>
                      </p>

                      {/* Student Note */}
                      {item.notes && (
                        <p className="text-[11px] text-pink-700 italic bg-white p-2 rounded-lg border border-pink-100 mt-2 line-clamp-2">
                          &ldquo;{item.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Teacher verification row */}
                    <div className="mt-3 pt-2.5 border-t border-pink-100 flex items-center justify-between text-[11px]">
                      {item.teacherVerified ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">Pending Review</span>
                      )}

                      {onOpenTeacherMonitor && (
                        <button
                          onClick={onOpenTeacherMonitor}
                          className="text-pink-600 hover:text-pink-800 font-bold underline"
                        >
                          Review in Portal
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

      </div>

      {/* Enlarged Photo Modal */}
      {activePhotoModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActivePhotoModal(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-pink-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-pink-100 flex items-center justify-between bg-pink-50/50">
              <div>
                <h3 className="text-sm font-bold text-pink-950">{activePhotoModal.title}</h3>
                <p className="text-xs text-pink-600 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{activePhotoModal.timestamp}</span>
                </p>
              </div>
              <button 
                onClick={() => setActivePhotoModal(null)}
                className="p-1 hover:bg-pink-100 rounded-lg text-pink-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-3 bg-pink-950 flex items-center justify-center max-h-[70vh]">
              <img 
                src={activePhotoModal.photoUrl} 
                alt={activePhotoModal.title}
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>

            {activePhotoModal.notes && (
              <div className="p-3 bg-pink-50 text-xs text-pink-900 border-t border-pink-100">
                <span className="font-bold text-pink-700">Student Notes: </span>
                {activePhotoModal.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly Summary for Parents Modal */}
      <WeeklySummaryModal
        isOpen={isWeeklySummaryOpen}
        onClose={() => setIsWeeklySummaryOpen(false)}
        studentName={studentName}
        streakData={streakData}
        events={events}
        tasks={tasks}
        currentDate={currentDate}
      />
    </div>
  );
};
