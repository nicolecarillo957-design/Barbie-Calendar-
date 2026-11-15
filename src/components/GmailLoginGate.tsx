import React, { useMemo, useState } from 'react';
import {
  listSavedPortalAccounts,
  PortalUser,
  registerAccountFreely,
  resetLocalAccountPassword,
  signInFreely,
} from '../localPortal';
import { cuteSound } from '../utils/cuteSound';
import { evaluatePasswordStrength } from '../utils/passwordUtils';
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
  const [savedAccounts] = useState<PortalUser[]>(() => listSavedPortalAccounts());
  const [mode, setMode] = useState<AuthMode>(savedAccounts.length > 0 ? 'signin' : 'signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter your Gmail or email address.');
      return;
    }

    if (mode === 'forgot') {
      if (newResetPassword.length < 4) {
        setErrorMsg('Please enter a new password of at least 4 characters.');
        return;
      }
      setIsLoading(true);
      try {
        await resetLocalAccountPassword(cleanEmail, newResetPassword);
        cuteSound.playSparkle();
        setSuccessMsg(`Password updated for ${cleanEmail}! You can now sign in.`);
        setPassword(newResetPassword);
        setNewResetPassword('');
        setMode('signin');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Could not update password.');
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
      if (password.length < 4) {
        setErrorMsg('Please create a safety password of at least 4 characters.');
        return;
      }
      if (confirmPassword && !passwordsMatch) {
        setErrorMsg('Passwords do not match. Please re-enter the same password.');
        return;
      }

      setIsLoading(true);
      try {
        await registerAccountFreely(fullName, cleanEmail, password);
        cuteSound.playCelebrationFanfare();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Could not create account.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Free & instant Sign In (also works seamlessly if user enters a fresh email + password)
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await signInFreely(cleanEmail, password, fullName);
      cuteSound.playCelebrationFanfare();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not sign in.');
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
        <div className="p-4 sm:p-5 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white text-center relative">
          <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center justify-center gap-1.5 flex-wrap">
            <span>EduTrack Calendar &amp; Reward Portal</span>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 fill-yellow-300 shrink-0" />
          </h1>
          <p className="text-[11px] sm:text-xs text-pink-100 font-medium mt-1">
            Sign In Freely — Study Planner, Streaks &amp; Teacher Monitoring
          </p>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Saved Local Profiles Quick Picker */}
          {savedAccounts.length > 0 && mode !== 'forgot' && (
            <div className="p-2.5 rounded-2xl bg-pink-50/80 border border-pink-200 space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-pink-700">
                Saved Accounts on This Device
              </p>
              <div className="flex flex-wrap gap-1.5">
                {savedAccounts.map((acc) => (
                  <button
                    key={acc.uid}
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setEmail(acc.email);
                      setErrorMsg(null);
                      cuteSound.playCutePop();
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-pink-100 border border-pink-200 text-[11px] font-bold text-pink-950 flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <span className="w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                      {(acc.displayName || acc.email)[0]?.toUpperCase()}
                    </span>
                    <span className="truncate max-w-[140px]">{acc.displayName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                Create Account
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
                Sign In
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

          {/* Heading */}
          <div>
            <h2 className="text-sm sm:text-base font-black text-pink-950 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-pink-500 shrink-0" />
              <span>
                {mode === 'signup'
                  ? 'Create Your Account & Password'
                  : mode === 'signin'
                  ? 'Sign In Freely'
                  : 'Set a New Password'}
              </span>
            </h2>
            <p className="text-[11px] text-pink-700 mt-0.5 leading-snug">
              {mode === 'signup'
                ? 'No email verification wait — enter your name, email, and a password to start immediately.'
                : mode === 'signin'
                ? 'Enter your email and password to enter right away (new emails automatically create an account!).'
                : 'Enter your email and choose a new safety password.'}
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

          <form onSubmit={handleSubmit} className="space-y-3">
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

            {mode !== 'forgot' ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-pink-900">
                    {mode === 'signup' ? 'Safety Password (4+ chars)' : 'Password'}
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
                      mode === 'signup' ? 'Create password (min 4 chars)' : 'Enter your password'
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

                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 p-2 rounded-xl bg-pink-50/70 border border-pink-200/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-pink-800">Password Strength:</span>
                      <span
                        className={
                          strength.score === 4
                            ? 'text-emerald-600'
                            : strength.score >= 2
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
                                : strength.score >= 2
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                              : 'bg-pink-200/70'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                      <Check className={`w-3 h-3 ${password.length >= 4 ? 'opacity-100' : 'opacity-30'}`} />
                      <span>Ready at 4+ characters (8+ A-z 0-9 recommended)</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-pink-900 mb-1">
                  New Safety Password
                </label>
                <input
                  type="password"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Enter new password (4+ chars)"
                  className="w-full px-3 py-2.5 text-sm sm:text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white font-semibold"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-pink-900 mb-1">
                  Confirm Password (Optional)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
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
                    {passwordsMatch ? 'Passwords match!' : 'Passwords do not match yet'}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 hover:from-pink-600 hover:to-rose-600 active:scale-[0.99] text-white text-sm font-black rounded-2xl shadow-lg shadow-pink-300/60 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isLoading
                ? 'Entering Portal...'
                : mode === 'signup'
                ? 'Create Account & Enter 💖'
                : mode === 'signin'
                ? 'Sign In Now 💖'
                : 'Save New Password'}
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] text-pink-600 font-medium text-center pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Sign in freely anytime — choose Student or Teacher after signing in</span>
          </div>
        </div>
      </div>
    </div>
  );
};
