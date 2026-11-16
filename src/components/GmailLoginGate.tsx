import React, { useState } from 'react';
import { signInWithGoogle } from '../localPortal';
import { cuteSound } from '../utils/cuteSound';
import {
  Sparkles,
  Calendar,
  ShieldCheck,
  AlertCircle,
  BookOpen,
  GraduationCap,
  MessageCircleHeart,
} from 'lucide-react';

export const GmailLoginGate: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      cuteSound.playCelebrationFanfare();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-pink-100 via-rose-50 to-fuchsia-100 flex items-center justify-center p-3 sm:p-5 relative overflow-y-auto font-sans">
      <div className="fixed -top-24 -left-24 w-72 h-72 rounded-full bg-pink-300/30 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-80 h-80 rounded-full bg-rose-300/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md my-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-pink-300 overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
        {/* Top Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white text-center relative">
          <div className="w-14 h-14 mx-auto mb-2.5 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center justify-center gap-1.5 flex-wrap">
            <span>EduTrack Calendar &amp; Reward Portal</span>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 fill-yellow-300 shrink-0" />
          </h1>
          <p className="text-[11px] sm:text-xs text-pink-100 font-medium mt-1">
            Cloud-Synced Study Planner, Streaks &amp; Teacher Monitoring
          </p>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3 rounded-2xl bg-pink-50/80 border border-pink-200 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <BookOpen className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-black text-pink-950">Students: Track Assignments &amp; Streaks</p>
                <p className="text-[11px] text-pink-700 font-medium">
                  Schedule timeboxes, reorder tasks by priority, and earn +5 to +10 pts with photo proof.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <GraduationCap className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-black text-purple-950">Teachers: Real-Time Proof Dashboard</p>
                <p className="text-[11px] text-purple-700 font-medium">
                  Receive instant alerts when students link your Gmail and verify their work anytime.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <MessageCircleHeart className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-black text-rose-950">Live Two-Way Creator Chat</p>
                <p className="text-[11px] text-rose-700 font-medium">
                  Message the app maker directly and see live replies across all devices.
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-white hover:bg-pink-50 active:scale-[0.99] text-pink-950 text-sm font-black rounded-2xl shadow-lg shadow-pink-200/70 border-2 border-pink-300 flex items-center justify-center gap-3 transition-all disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{isLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-pink-700 font-medium text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Secured by Firebase Google Sign-In — choose Student or Teacher after signing in</span>
          </div>
        </div>
      </div>
    </div>
  );
};
