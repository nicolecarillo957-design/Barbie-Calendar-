import React, { useState } from 'react';
import { signInWithGmail } from '../firebase';
import { cuteSound } from '../utils/cuteSound';
import {
  Sparkles,
  GraduationCap,
  Calendar,
  Camera,
  Flame,
  MessageCircleHeart,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export const GmailLoginGate: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithGmail();
      cuteSound.playCelebrationFanfare();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Sign-in window was closed. Please click the button below to sign in with your Gmail.');
      } else if (msg.includes('popup-blocked')) {
        setErrorMsg('Your browser blocked the sign-in popup. Please allow popups for this site and try again.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-pink-100 via-rose-50 to-fuchsia-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Soft decorative background blobs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-pink-300/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-rose-300/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-pink-300 overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
        {/* Top Banner */}
        <div className="p-6 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white text-center relative">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center justify-center gap-2">
            <span>EduTrack Calendar &amp; Reward Portal</span>
            <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300 shrink-0" />
          </h1>
          <p className="text-xs sm:text-sm text-pink-100 font-medium mt-1">
            Smart Study Timeboxing, Streaks & Teacher Monitoring
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-base font-black text-pink-950">
              Sign in with your Gmail Account
            </h2>
            <p className="text-xs text-pink-700 mt-1 leading-relaxed">
              Every student and teacher signs in with Google so calendars sync securely and teachers always know whose calendar they are monitoring.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-2.5 bg-pink-50/70 border border-pink-200 rounded-2xl p-4 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-pink-950">Earn 5–10 Points & Study Streaks</p>
                <p className="text-[11px] text-pink-700">
                  Check off calendar tasks with timestamped picture evidence.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-pink-100 text-pink-700 shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-pink-950">Identified Student-Teacher Sync</p>
                <p className="text-[11px] text-pink-700">
                  Teachers see your verified name & Gmail, live schedule, and photo proofs.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                <MessageCircleHeart className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-pink-950">Direct Creator Feedback Chat</p>
                <p className="text-[11px] text-pink-700">
                  Share thoughts and feedback about the app anytime in the chat box.
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-white hover:bg-pink-50 active:scale-[0.99] border-2 border-pink-300 hover:border-pink-400 rounded-2xl shadow-md flex items-center justify-center gap-3 transition-all disabled:opacity-60 cursor-pointer"
          >
            {/* Google G Logo */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span className="text-sm font-black text-pink-950">
              {isLoading ? 'Signing in with Gmail...' : 'Continue with Gmail / Google'}
            </span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-pink-600 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secured with Google Sign-In & verified Gmail identity</span>
          </div>
        </div>
      </div>
    </div>
  );
};
