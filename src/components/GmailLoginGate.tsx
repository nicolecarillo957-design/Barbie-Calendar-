import React, { useMemo, useState } from 'react';
import {
  registerWithEmailPassword,
  sendPasswordReset,
  signInWithEmailPassword,
  signInWithGmail,
} from '../firebase';
import { cuteSound } from '../utils/cuteSound';
import {
  evaluatePasswordStrength,
  mapFirebaseAuthError,
} from '../utils/passwordUtils';
import {
  Sparkles,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  Check,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot';

export const GmailLoginGate: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your Gmail / email address.');
      return;
    }

    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        await sendPasswordReset(cleanEmail);
        cuteSound.playSparkle();
        setSuccessMsg(
          `Password reset link sent to ${cleanEmail}. Check your inbox (and spam folder) to set a new password.`
        );
      } catch (err) {
        setErrorMsg(mapFirebaseAuthError(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your name so your teacher knows whose calendar this is.');
        return;
      }
      if (!strength.isValid) {
        setErrorMsg(
          'Please create a stronger safety password (at least 8 characters with uppercase, lowercase, and a number).'
        );
        return;
      }
      if (!passwordsMatch) {
        setErrorMsg('Passwords do not match. Please re-enter the same password.');
        return;
      }

      setIsLoading(true);
      try {
        await registerWithEmailPassword(fullName, cleanEmail, password);
        cuteSound.playCelebrationFanfare();
      } catch (err) {
        setErrorMsg(mapFirebaseAuthError(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Sign in with password
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailPassword(cleanEmail, password);
      cuteSound.playCelebrationFanfare();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      await signInWithGmail();
      cuteSound.playCelebrationFanfare();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-pink-100 via-rose-50 to-fuchsia-100 flex items-center justify-center p-3 sm:p-5 relative overflow-y-auto font-sans">
      {/* Soft decorative background blobs */}
      <div className="fixed -top-24 -left-24 w-72 h-72 rounded-full bg-pink-300/30 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-80 h-80 rounded-full bg-rose-300/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md my-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-pink-300 overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
        {/* Top Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white text-center relative">
          <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center justify-center gap-1.5 flex-wrap">
            <span>EduTrack Calendar &amp; Reward Portal</span>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 fill-yellow-300 shrink-0" />
          </h1>
          <p className="text-[11px] sm:text-xs text-pink-100 font-medium mt-1">
            Password-Protected Study Planner, Streaks &amp; Teacher Sync
          </p>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Mode Tabs */}
          {mode !== 'forgot' ? (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-pink-100/80 rounded-2xl border border-pink-200">
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-pink-700 hover:bg-pink-200/50'
                }`}
              >
                Create Account &amp; Password
              </button>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-pink-700 hover:bg-pink-200/50'
                }`}
              >
                Sign In with Password
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-700 hover:text-pink-950 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          )}

          {/* Contextual Heading */}
          <div>
            <h2 className="text-sm sm:text-base font-black text-pink-950 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-pink-500 shrink-0" />
              <span>
                {mode === 'signup'
                  ? 'Create Your Safe Account Password'
                  : mode === 'signin'
                  ? 'Sign In to Your Calendar'
                  : 'Reset Your Password'}
              </span>
            </h2>
            <p className="text-[11px] text-pink-700 mt-0.5 leading-snug">
              {mode === 'signup'
                ? 'Set a personal password for safety so only you control your study schedule, streaks, and picture proofs.'
                : mode === 'signin'
                ? 'Enter your Gmail/email and personal password to continue.'
                : 'Enter your account email and we will send you a password reset link.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
            {/* Full Name (Sign up only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-pink-900 mb-1">
                  Full Name (Student or Teacher)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Nicole Carillo"
                    autoComplete="name"
                    className="w-full pl-9 pr-3 py-2.5 text-sm sm:text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-[11px] font-bold text-pink-900 mb-1">
                Gmail / Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 text-sm sm:text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white font-semibold"
                />
              </div>
            </div>

            {/* Password Input */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-pink-900">
                    {mode === 'signup' ? 'Create Safety Password' : 'Password'}
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-bold text-pink-600 hover:text-pink-900 underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === 'signup'
                        ? 'Min 8 chars, A-Z, a-z, 0-9'
                        : 'Enter your password'
                    }
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full pl-9 pr-10 py-2.5 text-sm sm:text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-pink-400 hover:text-pink-700 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter & Rules (Create Account only) */}
                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-pink-50/70 border border-pink-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-pink-800">Password Safety:</span>
                      <span
                        className={
                          strength.score === 4
                            ? 'text-emerald-600'
                            : strength.score >= 3
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }
                      >
                        {strength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full transition-colors ${
                            strength.score >= step
                              ? strength.score === 4
                                ? 'bg-emerald-500'
                                : strength.score >= 3
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                              : 'bg-pink-200/70'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-0.5 text-[10px]">
                      {[
                        { ok: strength.minLength, label: '8+ characters' },
                        { ok: strength.hasUppercase, label: '1 Uppercase (A-Z)' },
                        { ok: strength.hasLowercase, label: '1 Lowercase (a-z)' },
                        { ok: strength.hasNumber, label: '1 Number (0-9)' },
                      ].map((rule) => (
                        <div
                          key={rule.label}
                          className={`flex items-center gap-1 font-semibold ${
                            rule.ok ? 'text-emerald-700' : 'text-pink-500'
                          }`}
                        >
                          <Check className={`w-3 h-3 ${rule.ok ? 'opacity-100' : 'opacity-30'}`} />
                          <span>{rule.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password (Sign up only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-pink-900 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm sm:text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-pink-400 hover:text-pink-700 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p
                    className={`text-[10px] font-bold mt-1 ${
                      passwordsMatch ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {passwordsMatch ? '✓ Passwords match!' : 'Passwords do not match yet'}
                  </p>
                )}
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 hover:from-pink-600 hover:to-rose-600 active:scale-[0.99] text-white text-sm font-black rounded-2xl shadow-lg shadow-pink-300/60 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isLoading
                ? 'Please wait...'
                : mode === 'signup'
                ? 'Create Account & Set Password 🔐'
                : mode === 'signin'
                ? 'Sign In Safely 💖'
                : 'Send Password Reset Email'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-pink-200" />
            <span className="shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-pink-400">
              or quick Google sign-in
            </span>
            <div className="flex-grow border-t border-pink-200" />
          </div>

          {/* Google Sign-In Option */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-pink-50 active:scale-[0.99] border-2 border-pink-200 hover:border-pink-300 rounded-2xl shadow-xs flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
            <span className="text-xs font-extrabold text-pink-950">
              Continue with Google / Gmail
            </span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] text-pink-600 font-medium text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Password &amp; verified email keep student &amp; teacher calendars safe</span>
          </div>
        </div>
      </div>
    </div>
  );
};
