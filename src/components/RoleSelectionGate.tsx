import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserRole } from '../types/calendar';
import { cuteSound } from '../utils/cuteSound';
import {
  BookOpen,
  Camera,
  CheckCircle2,
  Eye,
  Flame,
  GraduationCap,
  BarChart3,
  LogOut,
  Sparkles,
  CalendarDays,
  FileText,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface RoleSelectionGateProps {
  user: User;
  displayName: string;
  onSelectRole: (role: UserRole) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const RoleSelectionGate: React.FC<RoleSelectionGateProps> = ({
  user,
  displayName,
  onSelectRole,
  onSignOut,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConfirm = async (roleToSave: UserRole) => {
    setSelectedRole(roleToSave);
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSelectRole(roleToSave);
      cuteSound.playCelebrationFanfare();
    } catch (err) {
      console.error('Failed saving role:', err);
      setErrorMsg('Could not save your role selection right now. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-pink-100 via-rose-50 to-fuchsia-100 flex items-center justify-center p-3 sm:p-6 font-sans text-pink-950 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-pink-300 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Top Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white text-pink-600 flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                  {(displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
                  EduTrack Calendar &amp; Reward Portal
                </span>
                <h1 className="text-lg sm:text-xl font-black tracking-tight truncate">
                  Welcome, {displayName}! 👋
                </h1>
                <p className="text-[11px] sm:text-xs text-pink-100 font-mono truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              disabled={submitting}
              className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Selection Prompt */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-base sm:text-lg font-black text-pink-950 flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Choose Your Role to Continue</span>
            </h2>
            <p className="text-xs text-pink-700 font-medium max-w-lg mx-auto">
              Students and Teachers get tailored tools. You can also switch your role anytime in Settings.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Two Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Option 1: Student */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleConfirm('student')}
              className={`group text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                selectedRole === 'student'
                  ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-300 shadow-md'
                  : 'border-pink-200 bg-white hover:border-pink-400 hover:bg-pink-50/50 hover:shadow-md'
              } disabled:opacity-60`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-sm">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-100 text-pink-800 border border-pink-200 uppercase">
                    Planner &amp; Rewards
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-pink-950">I&apos;m a Student 🎒</h3>
                  <p className="text-xs text-pink-700 font-medium mt-0.5 leading-relaxed">
                    Schedule your tasks, complete calendar blocks with photo proof, and earn rewards.
                  </p>
                </div>

                <ul className="space-y-1.5 text-[11px] text-pink-900 font-medium">
                  <li className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                    <span>Create timeboxes &amp; manage backlog tasks</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Upload picture evidence for +5 to +10 pts</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Build daily study streaks &amp; link your teacher</span>
                  </li>
                </ul>
              </div>

              <div className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs group-hover:from-pink-600 group-hover:to-rose-600 transition-colors">
                <span>
                  {submitting && selectedRole === 'student'
                    ? 'Opening Student Portal...'
                    : 'Enter as Student'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Option 2: Teacher */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleConfirm('teacher')}
              className={`group text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                selectedRole === 'teacher'
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-300 shadow-md'
                  : 'border-purple-200 bg-white hover:border-purple-400 hover:bg-purple-50/40 hover:shadow-md'
              } disabled:opacity-60`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white flex items-center justify-center shadow-sm">
                    <GraduationCap className="w-5 h-5" />
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                    Monitor Only
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-purple-950">I&apos;m a Teacher 👩‍🏫</h3>
                  <p className="text-xs text-purple-800 font-medium mt-0.5 leading-relaxed">
                    Monitor your assigned students&apos; calendars without clutter — view-only &amp; verification tools.
                  </p>
                </div>

                <ul className="space-y-1.5 text-[11px] text-purple-950 font-medium">
                  <li className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Monitor live student schedules (view-only)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Inspect photo proofs, finish times &amp; approve</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-fuchsia-600 shrink-0" />
                    <span>View Weekly Insights &amp; Parent Summaries</span>
                  </li>
                </ul>
              </div>

              <div className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs group-hover:from-purple-700 group-hover:to-fuchsia-700 transition-colors">
                <span>
                  {submitting && selectedRole === 'teacher'
                    ? 'Opening Teacher Monitor...'
                    : 'Enter as Teacher'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-2 text-[11px] text-amber-900">
            <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>How Teacher Monitoring works:</strong> Once a student enters your Gmail (
              <span className="font-mono font-bold">{user.email}</span>) in their Settings or
              Teacher Monitor, their calendar &amp; picture proofs appear automatically in your
              Teacher Workspace.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
