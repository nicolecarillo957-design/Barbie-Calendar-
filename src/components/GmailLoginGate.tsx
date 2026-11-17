import React, { useEffect, useState } from 'react';
import {
  PortalUser,
  isInAppBrowser,
  listSavedPortalAccounts,
  quickSignInWithSavedAccount,
  registerAccountFreely,
  resetLocalAccountPassword,
  signInFreely,
  signInWithGoogle,
} from '../localPortal';
import { evaluatePasswordStrength } from '../utils/passwordUtils';
import { cuteSound } from '../utils/cuteSound';
import {
  Sparkles,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  KeyRound,
} from 'lucide-react';

type AuthTab = 'signin' | 'signup' | 'forgot';

export const GmailLoginGate: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<PortalUser[]>(() =>
    listSavedPortalAccounts()
  );

  const inAppWebView = isInAppBrowser();
  const pwStrength = evaluatePasswordStrength(password);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSavedAccounts(listSavedPortalAccounts());
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const switchTab = (next: AuthTab) => {
    setActiveTab(next);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmitEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (activeTab === 'signup') {
        await registerAccountFreely({
          displayName,
          email,
          password,
        });
        cuteSound.playCelebrationFanfare();
      } else if (activeTab === 'signin') {
        await signInFreely({
          email,
          password,
          displayNameIfNew: displayName,
        });
        cuteSound.playCelebrationFanfare();
      } else {
        await resetLocalAccountPassword(email, password);
        cuteSound.playSparkle();
        setSuccessMsg('Password updated! You can now sign in with your new password.');
        setActiveTab('signin');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAccountClick = async (acc: PortalUser) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const signed = await quickSignInWithSavedAccount(acc.uid);
      if (signed) {
        cuteSound.playCelebrationFanfare();
      } else {
        setEmail(acc.email);
        setDisplayName(acc.displayName);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not switch to account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      cuteSound.playCelebrationFanfare();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not sign in with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-pink-100 via-rose-50 to-fuchsia-100 flex items-center justify-center p-3 sm:p-5 relative overflow-y-auto font-sans">
      <div className="fixed -top-24 -left-24 w-72 h-72 rounded-full bg-pink-300/30 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-80 h-80 rounded-full bg-rose-300/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md my-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-pink-300 overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
        {/* Top Banner */}
        <div className="p-5 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white text-center relative">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center justify-center gap-1.5 flex-wrap">
            <span>EduTrack Calendar &amp; Reward Portal</span>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 fill-yellow-300 shrink-0" />
          </h1>
          <p className="text-[11px] sm:text-xs text-pink-100 font-medium mt-1">
            Study Planner, Streaks, Teacher Monitoring &amp; Creator Chat
          </p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Quick-Pick Saved Accounts */}
          {savedAccounts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-pink-800">
                Quick Sign In ({savedAccounts.length} saved)
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {savedAccounts.slice(0, 6).map((acc) => (
                  <button
                    key={acc.uid}
                    type="button"
                    disabled={isLoading || isGoogleLoading}
                    onClick={() => handleQuickAccountClick(acc)}
                    className="px-2.5 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-left flex items-center gap-2 transition-colors max-w-full"
                  >
                    <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                      {(acc.displayName || acc.email || 'U').charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-black text-pink-950 truncate max-w-[140px]">
                        {acc.displayName}
                      </span>
                      <span className="block text-[10px] text-pink-600 truncate max-w-[140px]">
                        {acc.email}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode Tabs */}
          {activeTab !== 'forgot' ? (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-pink-100/70 rounded-2xl border border-pink-200">
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'signin'
                    ? 'bg-white text-pink-950 shadow-xs border border-pink-200'
                    : 'text-pink-700 hover:text-pink-950'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'signup'
                    ? 'bg-white text-pink-950 shadow-xs border border-pink-200'
                    : 'text-pink-700 hover:text-pink-950'
                }`}
              >
                Create Account
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Reset Your Password</span>
              </div>
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className="text-[11px] font-extrabold text-pink-600 hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-snug font-medium">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-snug font-bold">{successMsg}</span>
            </div>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handleSubmitEmailAuth} className="space-y-3">
            {activeTab === 'signup' && (
              <div>
                <label className="block text-[11px] font-extrabold text-pink-900 mb-1">
                  Your Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-pink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., Nicole C. or Ms. Cruz"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-pink-950 focus:outline-none focus:ring-2 focus:ring-pink-400 font-semibold"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-extrabold text-pink-900 mb-1">
                Gmail or Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-pink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-pink-950 focus:outline-none focus:ring-2 focus:ring-pink-400 font-semibold"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-extrabold text-pink-900">
                  {activeTab === 'forgot' ? 'New Password' : 'Password'}
                </label>
                {activeTab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchTab('forgot')}
                    className="text-[11px] font-bold text-pink-600 hover:text-pink-800 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-pink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    activeTab === 'signup'
                      ? 'Create password (at least 4 chars)'
                      : activeTab === 'forgot'
                      ? 'Enter new password (4+ chars)'
                      : 'Enter your password'
                  }
                  autoComplete={activeTab === 'signup' ? 'new-password' : 'current-password'}
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-pink-950 focus:outline-none focus:ring-2 focus:ring-pink-400 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-pink-500 hover:text-pink-800"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {(activeTab === 'signup' || activeTab === 'forgot') && password.length > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold">
                  <span
                    className={
                      pwStrength.score >= 3
                        ? 'text-emerald-700'
                        : pwStrength.score >= 2
                        ? 'text-amber-700'
                        : 'text-pink-700'
                    }
                  >
                    Strength: {pwStrength.label}
                  </span>
                  <span className="text-pink-500">Min 4 characters</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 hover:from-pink-600 hover:via-rose-600 hover:to-fuchsia-600 active:scale-[0.99] text-white text-sm font-black rounded-2xl shadow-lg shadow-pink-200/80 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
            >
              <span>
                {isLoading
                  ? 'Signing in...'
                  : activeTab === 'signup'
                  ? 'Create Free Account'
                  : activeTab === 'forgot'
                  ? 'Save New Password'
                  : 'Sign In to Portal'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-0.5">
            <div className="border-t border-pink-200 w-full" />
            <span className="bg-white px-3 text-[10px] font-black uppercase tracking-wider text-pink-400 shrink-0">
              or
            </span>
            <div className="border-t border-pink-200 w-full" />
          </div>

          {/* Optional Google Sign-In */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-pink-50 active:scale-[0.99] text-pink-950 text-xs font-black rounded-2xl shadow-xs border-2 border-pink-200 flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
              <span>
                {isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google (Popup)'}
              </span>
            </button>

            {inAppWebView && (
              <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 text-center font-medium">
                Opened inside Messenger/in-app browser? Use the Email &amp; Password form above — Google disables popups inside embedded WebViews.
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-pink-700 font-medium text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Works on every browser &amp; phone — pick Student or Teacher after signing in</span>
          </div>
        </div>
      </div>
    </div>
  );
};
