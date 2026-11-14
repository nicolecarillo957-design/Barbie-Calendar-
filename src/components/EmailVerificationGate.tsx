import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  reloadAndVerifyUser,
  resendVerificationEmail,
  signOutUser,
} from '../firebase';
import { cuteSound } from '../utils/cuteSound';
import {
  MailCheck,
  RefreshCw,
  CheckCircle2,
  LogOut,
  AlertCircle,
  Send,
  ShieldCheck,
} from 'lucide-react';

interface EmailVerificationGateProps {
  user: User;
  onVerified: (updatedUser: User) => void;
}

export const EmailVerificationGate: React.FC<EmailVerificationGateProps> = ({
  user,
  onVerified,
}) => {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCheckVerified = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setChecking(true);
    try {
      const updated = await reloadAndVerifyUser();
      if (updated && updated.emailVerified) {
        cuteSound.playCelebrationFanfare();
        onVerified(updated);
      } else {
        setErrorMsg(
          'Your email is not verified yet. Please open the verification email in your inbox (or Spam folder), click the link, then tap "I Verified — Enter Portal".'
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to check verification status.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setResending(true);
    try {
      await resendVerificationEmail();
      cuteSound.playSparkle();
      setStatusMsg(`Verification link resent to ${user.email}! Please check your inbox & spam folder.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not resend verification email.';
      if (msg.includes('too-many-requests')) {
        setErrorMsg('Please wait a moment before requesting another verification email.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-pink-100 via-rose-50 to-fuchsia-100 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-pink-300 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg">
            <MailCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight">
            Verify Your Email for Safety
          </h1>
          <p className="text-xs text-pink-100 font-medium mt-1">
            EduTrack Calendar &amp; Reward Portal
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-4 text-pink-950">
          <div className="p-3.5 rounded-2xl bg-pink-50 border border-pink-200 text-center space-y-1">
            <p className="text-xs font-bold text-pink-700">We sent a verification link to:</p>
            <p className="text-sm font-black font-mono text-pink-950 break-all">
              {user.email}
            </p>
            <p className="text-[11px] text-pink-700 leading-relaxed pt-1">
              Click the link in your email to confirm your account &amp; keep your calendar and teacher monitoring secure.
            </p>
          </div>

          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleCheckVerified}
              disabled={checking}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-sm font-black rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking...' : "I Verified — Enter Portal"}</span>
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full py-2.5 px-4 bg-pink-50 hover:bg-pink-100 border border-pink-300 text-pink-900 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-pink-600" />
              <span>{resending ? 'Sending email...' : 'Resend Verification Email'}</span>
            </button>

            <button
              type="button"
              onClick={signOutUser}
              className="w-full py-2 px-4 text-xs font-bold text-pink-600 hover:text-pink-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Use a Different Account / Sign Out</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-pink-600 font-medium pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Password + verified Gmail keeps student calendars safe</span>
          </div>
        </div>
      </div>
    </div>
  );
};
