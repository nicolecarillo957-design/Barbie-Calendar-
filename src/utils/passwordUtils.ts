export interface PasswordChecks {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  score: number; // 0 to 4
  isValid: boolean;
  label: string;
}

export function evaluatePasswordStrength(password: string): PasswordChecks {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  const score = [minLength, hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;
  const isValid = minLength && hasUppercase && hasLowercase && hasNumber;

  let label = 'Too weak';
  if (score === 4) label = 'Strong & Safe';
  else if (score === 3) label = 'Almost strong';
  else if (score === 2) label = 'Fair';

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    score,
    isValid,
    label,
  };
}

export function mapFirebaseAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('auth/operation-not-allowed')) {
    return 'Email & Password sign-in is not enabled yet in Firebase Console (Authentication → Sign-in method → Email/Password). Please enable it or use Google Sign-In below.';
  }
  if (raw.includes('auth/email-already-in-use')) {
    return 'An account with this Gmail/email already exists. Switch to "Sign In" or click "Forgot password?".';
  }
  if (raw.includes('auth/weak-password')) {
    return 'Please choose a stronger password (at least 8 characters with uppercase, lowercase, and a number).';
  }
  if (raw.includes('auth/invalid-email')) {
    return 'Please enter a valid email / Gmail address.';
  }
  if (
    raw.includes('auth/invalid-credential') ||
    raw.includes('auth/wrong-password') ||
    raw.includes('auth/user-not-found')
  ) {
    return 'Incorrect email or password. Please check your credentials or use "Forgot password?".';
  }
  if (raw.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please wait a minute before trying again.';
  }
  if (raw.includes('auth/requires-recent-login')) {
    return 'For security, please sign out and sign back in before changing your password.';
  }
  if (raw.includes('auth/popup-closed-by-user')) {
    return 'Google sign-in popup was closed before completing.';
  }
  if (raw.includes('auth/popup-blocked')) {
    return 'Your browser blocked the sign-in popup. Allow popups or use Email & Password above.';
  }
  return raw;
}
