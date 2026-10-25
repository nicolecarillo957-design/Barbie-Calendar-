import React, { useState } from 'react';
import { CalendarEvent, StudentStreakData, TaskEvidence, UnscheduledTask } from '../types/calendar';
import { cuteSound } from '../utils/cuteSound';
import { 
  GraduationCap, 
  X, 
  CheckCircle2, 
  Clock, 
  Award, 
  Flame, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  Camera, 
  MessageSquare, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Download,
  BarChart3,
  FileText
} from 'lucide-react';
import { WeeklySummaryModal } from './WeeklySummaryModal';

interface TeacherMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  tasks: UnscheduledTask[];
  streakData: StudentStreakData;
  studentName: string;
  onUpdateEventEvidence?: (eventId: string, updatedEvidence: TaskEvidence) => void;
  onUpdateTaskEvidence?: (taskId: string, updatedEvidence: TaskEvidence) => void;
  onSwitchToStudentView?: () => void;
  onOpenWeeklyInsights?: () => void;
}

export const TeacherMonitorModal: React.FC<TeacherMonitorModalProps> = ({
  isOpen,
  onClose,
  events,
  tasks,
  streakData,
  studentName,
  onUpdateEventEvidence,
  onUpdateTaskEvidence,
  onSwitchToStudentView,
  onOpenWeeklyInsights,
}) => {
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<TaskEvidence | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'unverified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherFeedbackInput, setTeacherFeedbackInput] = useState<{ [id: string]: string }>({});
  const [isWeeklySummaryOpen, setIsWeeklySummaryOpen] = useState(false);

  if (!isOpen) return null;

  // Gather all completed items with evidence
  const eventSubmissions = events
    .filter((e) => e.evidence)
    .map((e) => ({
      type: 'event' as const,
      id: e.id,
      title: e.title,
      category: e.category,
      scheduledDate: e.date,
      scheduledTime: `${e.startTime} - ${e.endTime}`,
      evidence: e.evidence!,
    }));

  const taskSubmissions = tasks
    .filter((t) => t.evidence)
    .map((t) => ({
      type: 'task' as const,
      id: t.id,
      title: t.title,
      category: t.category,
      scheduledDate: t.dueDate || 'Unscheduled Backlog',
      scheduledTime: `${t.estimatedMinutes}m estimate`,
      evidence: t.evidence!,
    }));

  const allSubmissions = [...eventSubmissions, ...taskSubmissions].sort((a, b) => {
    return new Date(b.evidence.completedAt).getTime() - new Date(a.evidence.completedAt).getTime();
  });

  const filteredSubmissions = allSubmissions.filter((item) => {
    if (filterType === 'verified' && !item.evidence.teacherVerified) return false;
    if (filterType === 'unverified' && item.evidence.teacherVerified) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.evidence.notes && item.evidence.notes.toLowerCase().includes(q)) ||
        (item.evidence.completedTimeFormatted && item.evidence.completedTimeFormatted.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleVerifySubmission = (item: typeof allSubmissions[0]) => {
    const feedback = teacherFeedbackInput[item.evidence.id] || item.evidence.teacherFeedback || 'Great work! Verified. 🌟';
    const updated: TaskEvidence = {
      ...item.evidence,
      teacherVerified: true,
      teacherFeedback: feedback,
    };

    if (item.type === 'event' && onUpdateEventEvidence) {
      onUpdateEventEvidence(item.id, updated);
    } else if (item.type === 'task' && onUpdateTaskEvidence) {
      onUpdateTaskEvidence(item.id, updated);
    }

    cuteSound.playSparkle();
  };

  const handleExportReport = () => {
    const lines = [
      `STUDENT MONITORING & TASK EVIDENCE REPORT`,
      `Student Name: ${studentName || 'Student'}`,
      `Generated On: ${new Date().toLocaleString()}`,
      `Current Streak: ${streakData.currentStreak} days 🔥`,
      `Total Points Earned: ${streakData.totalPoints} pts 🏆`,
      `Total Photo Proofs: ${allSubmissions.length}`,
      `--------------------------------------------------`,
      ...allSubmissions.map((sub, i) => {
        return `[#${i + 1}] ${sub.title} (${sub.type.toUpperCase()})\n- Scheduled: ${sub.scheduledDate} ${sub.scheduledTime}\n- Finished At: ${sub.evidence.completedTimeFormatted}\n- Points Earned: ${sub.evidence.pointsEarned} pts\n- Teacher Verified: ${sub.evidence.teacherVerified ? 'YES' : 'PENDING'}\n- Student Notes: ${sub.evidence.notes || 'None'}\n`;
      }),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher_audit_report_${studentName || 'student'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    cuteSound.playSparkle();
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border-2 border-pink-300 overflow-hidden my-auto max-h-[95vh] flex flex-col text-pink-950 animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-white text-pink-700 flex items-center justify-center shadow-xs border border-pink-300 text-xl shrink-0">
              👩‍🏫
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-pink-950 tracking-tight">
                  Teacher Monitoring & Student Streak Dashboard
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500 text-white shadow-2xs font-mono">
                  Live Audit
                </span>
              </div>
              <p className="text-xs text-pink-700 font-medium">
                Verify student tasks, view completion picture proofs with exact timestamps, and award streaks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                cuteSound.playSparkle();
                setIsWeeklySummaryOpen(true);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-xs font-extrabold shadow-2xs flex items-center gap-1.5 transition-all active:scale-95 border border-pink-400"
              title="Generate parent-ready performance report with streaks, points, and praise"
            >
              <FileText className="w-3.5 h-3.5 text-pink-100" />
              <span>Weekly Summary</span>
            </button>

            {onOpenWeeklyInsights && (
              <button
                onClick={() => {
                  onClose();
                  onOpenWeeklyInsights();
                }}
                className="hidden sm:flex px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold shadow-2xs items-center gap-1.5 transition-colors"
                title="View Recharts 7-Day Productivity Trends"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Weekly Insights</span>
              </button>
            )}

            <button
              onClick={handleExportReport}
              className="hidden sm:flex px-3 py-1.5 bg-white hover:bg-pink-50 border border-pink-300 rounded-xl text-xs font-bold text-pink-800 shadow-2xs items-center gap-1.5 transition-colors"
              title="Download text report of all submissions"
            >
              <Download className="w-3.5 h-3.5 text-pink-600" />
              <span>Export Report</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-pink-700 hover:text-pink-900 hover:bg-pink-200/70 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Summary Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-pink-50 via-rose-50/70 to-pink-100/50 border-b border-pink-200 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Student Name */}
            <div className="p-3 bg-white/90 rounded-2xl border border-pink-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-pink-500 block">
                Student
              </span>
              <span className="text-sm sm:text-base font-black text-pink-950 truncate block">
                {studentName || 'Student'}
              </span>
              <span className="text-[10px] text-pink-600 font-medium">Monitoring active</span>
            </div>

            {/* Streak */}
            <div className="p-3 bg-white/90 rounded-2xl border border-pink-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-pink-500 block">
                  Study Streak
                </span>
                <span className="text-lg sm:text-xl font-black text-pink-950 font-mono flex items-center gap-1">
                  {streakData.currentStreak}
                  <span className="text-xs font-bold text-pink-600">days</span>
                </span>
                <span className="text-[10px] text-pink-600 font-medium">Best: {streakData.bestStreak}d</span>
              </div>
              <Flame className="w-7 h-7 text-amber-500 fill-amber-400 animate-pulse shrink-0" />
            </div>

            {/* Total Points */}
            <div className="p-3 bg-white/90 rounded-2xl border border-pink-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-pink-500 block">
                  Total Points
                </span>
                <span className="text-lg sm:text-xl font-black text-pink-950 font-mono">
                  {streakData.totalPoints}
                  <span className="text-xs font-bold text-pink-600 ml-1">pts</span>
                </span>
                <span className="text-[10px] text-pink-600 font-medium">5-10 per task</span>
              </div>
              <Award className="w-7 h-7 text-pink-500 shrink-0" />
            </div>

            {/* Submissions Verified */}
            <div className="p-3 bg-white/90 rounded-2xl border border-pink-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-pink-500 block">
                  Evidence Proofs
                </span>
                <span className="text-lg sm:text-xl font-black text-pink-950 font-mono">
                  {allSubmissions.filter((s) => s.evidence.teacherVerified).length}/{allSubmissions.length}
                </span>
                <span className="text-[10px] text-pink-600 font-medium">Verified by teacher</span>
              </div>
              <Camera className="w-7 h-7 text-rose-500 shrink-0" />
            </div>
          </div>

          {/* Parent Report Summary Action Strip */}
          <div className="mt-3 pt-3 border-t border-pink-200/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs text-pink-800 font-medium">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Generate an official progress summary with streaks and points to share with parents:</span>
            </div>
            <button
              onClick={() => {
                cuteSound.playSparkle();
                setIsWeeklySummaryOpen(true);
              }}
              className="px-3.5 py-1.5 bg-white hover:bg-pink-100/70 border border-pink-300 text-pink-900 rounded-xl text-xs font-extrabold shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-pink-600" />
              <span>Weekly Summary for Parents 📋</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-white border-b border-pink-100 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1 bg-pink-100/70 p-1 rounded-xl border border-pink-200">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                filterType === 'all'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-pink-700 hover:bg-pink-200/60'
              }`}
            >
              All ({allSubmissions.length})
            </button>
            <button
              onClick={() => setFilterType('unverified')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                filterType === 'unverified'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-pink-700 hover:bg-pink-200/60'
              }`}
            >
              Pending ({allSubmissions.filter((s) => !s.evidence.teacherVerified).length})
            </button>
            <button
              onClick={() => setFilterType('verified')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                filterType === 'verified'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-pink-700 hover:bg-pink-200/60'
              }`}
            >
              Verified ({allSubmissions.filter((s) => s.evidence.teacherVerified).length})
            </button>
          </div>

          <div className="relative flex-1 sm:w-64 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
            <input
              type="text"
              placeholder="Search tasks, notes, or timestamps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400"
            />
          </div>
        </div>

        {/* Submissions List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {filteredSubmissions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-pink-100 flex items-center justify-center text-2xl shadow-2xs">
                📸
              </div>
              <h4 className="text-sm font-bold text-pink-950">
                No task submissions found
              </h4>
              <p className="text-xs text-pink-600 max-w-md mx-auto">
                When students complete a timebox or task on their calendar, they are prompted to attach picture evidence. It will show up here along with the recorded finish time!
              </p>
            </div>
          ) : (
            filteredSubmissions.map((item) => {
              const isVerified = item.evidence.teacherVerified;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isVerified
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-white border-pink-200 shadow-sm hover:border-pink-300'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    
                    {/* Picture Evidence Thumbnail */}
                    <div className="relative group cursor-pointer" onClick={() => setSelectedPhotoModal(item.evidence)}>
                      <div className="rounded-xl overflow-hidden border-2 border-pink-200 bg-slate-100 aspect-video relative flex items-center justify-center">
                        <img
                          src={item.evidence.photoUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-pink-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[11px] font-extrabold text-white bg-pink-600/90 px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                            <span>Inspect Full Photo</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-pink-600 font-bold block mt-1 text-center">
                        Click picture to enlarge
                      </span>
                    </div>

                    {/* Task & Timestamp Information */}
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-pink-950">
                          {item.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-pink-500 to-rose-500 text-white font-mono shadow-2xs">
                          +{item.evidence.pointsEarned} pts
                        </span>
                        {isVerified ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Awaiting Review
                          </span>
                        )}
                      </div>

                      {/* Exact Completion Timestamp from student's picture */}
                      <div className="p-2.5 rounded-xl bg-pink-50/80 border border-pink-200/80 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-pink-950">
                          <Clock className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                          <span>Exact Completion Timestamp:</span>
                          <span className="font-mono text-pink-700 bg-white px-2 py-0.5 rounded-md border border-pink-200">
                            {item.evidence.completedTimeFormatted}
                          </span>
                        </div>
                        <div className="text-[11px] text-pink-700 flex items-center gap-2">
                          <span>Scheduled: {item.scheduledDate} ({item.scheduledTime})</span>
                          <span>·</span>
                          <span className="capitalize">{item.category}</span>
                        </div>
                      </div>

                      {/* Student notes */}
                      {item.evidence.notes && (
                        <div className="text-xs text-pink-900 bg-white p-2.5 rounded-xl border border-pink-100">
                          <span className="font-bold text-pink-600 block text-[10px] uppercase">
                            Student Note:
                          </span>
                          <span>"{item.evidence.notes}"</span>
                        </div>
                      )}

                      {/* Teacher Feedback Banner if verified */}
                      {item.evidence.teacherFeedback && (
                        <div className="text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-[10px] uppercase text-emerald-700">
                              Teacher Feedback:
                            </span>
                            <span>{item.evidence.teacherFeedback}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Teacher Action Column */}
                    <div className="space-y-2 border-t md:border-t-0 md:border-l border-pink-100 md:pl-4 pt-3 md:pt-0">
                      <span className="text-[10px] font-bold text-pink-500 uppercase block">
                        Teacher Verification
                      </span>

                      {!isVerified ? (
                        <>
                          <input
                            type="text"
                            placeholder="Feedback (e.g. Great job! 🌟)"
                            value={teacherFeedbackInput[item.evidence.id] || ''}
                            onChange={(e) =>
                              setTeacherFeedbackInput((prev) => ({
                                ...prev,
                                [item.evidence.id]: e.target.value,
                              }))
                            }
                            className="w-full text-xs p-2 bg-pink-50/50 border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-1 focus:ring-pink-400"
                          />

                          <button
                            onClick={() => handleVerifySubmission(item)}
                            className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve & Verify Proof</span>
                          </button>
                        </>
                      ) : (
                        <div className="p-2.5 bg-emerald-100/60 rounded-xl text-center space-y-1">
                          <span className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                          <span className="text-[10px] text-emerald-700 block">
                            Streak & points validated for student report.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-pink-50/80 border-t border-pink-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-pink-700 font-medium">
            Showing {filteredSubmissions.length} of {allSubmissions.length} total assignments with photo proof.
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToStudentView && (
              <button
                onClick={onSwitchToStudentView}
                className="px-4 py-2 text-xs font-bold text-pink-700 bg-white hover:bg-pink-100 border border-pink-300 rounded-xl transition-colors"
              >
                Back to Student Calendar
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-transform active:scale-95"
            >
              Done Reviewing
            </button>
          </div>
        </div>
      </div>

      {/* Enlarge Photo Modal */}
      {selectedPhotoModal && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-pink-300 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-pink-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-pink-200 uppercase tracking-wide block">
                  Original Student Photo Evidence
                </span>
                <span className="text-sm font-black font-mono">
                  Stamped: {selectedPhotoModal.completedTimeFormatted}
                </span>
              </div>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 bg-slate-950 flex items-center justify-center">
              <img
                src={selectedPhotoModal.photoUrl}
                alt="Enlarged Proof"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="p-4 bg-pink-50 flex items-center justify-between text-xs text-pink-900">
              <div>
                <span className="font-bold">Student: {selectedPhotoModal.studentName || 'Student'}</span>
                <span className="mx-2">·</span>
                <span className="font-mono text-pink-700 font-bold">Earned +{selectedPhotoModal.pointsEarned} Points</span>
              </div>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                className="px-4 py-1.5 bg-pink-500 text-white font-bold rounded-xl text-xs"
              >
                Close Full Photo
              </button>
            </div>
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
      />
    </div>
  );
};
