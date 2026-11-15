import confetti from 'canvas-confetti';
import { cuteSound } from './cuteSound';

const CELEBRATION_COLORS = [
  '#ec4899', // pink-500
  '#f472b6', // pink-400
  '#db2777', // pink-600
  '#fbbf24', // amber-400
  '#f59e0b', // amber-500
  '#a855f7', // purple-500
  '#10b981', // emerald-500
  '#38bdf8', // sky-400
];

/**
 * Special extended confetti spectacle across the entire screen
 * when clicking "Celebrate Streak" at the 7-day milestone (or hitting day 7/14/21...).
 */
export function triggerExtendedStreakCelebration(): void {
  cuteSound.playCelebrationFanfare();

  if (typeof window === 'undefined') return;

  const durationMs = 3400;
  const endTime = Date.now() + durationMs;

  // Opening center firework burst
  confetti({
    particleCount: 110,
    spread: 100,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.55 },
    colors: CELEBRATION_COLORS,
    zIndex: 9999,
  });

  // Side cannons streaming continuously across the duration
  let lastBurst = 0;
  const frame = () => {
    const now = Date.now();
    if (now - lastBurst >= 140) {
      lastBurst = now;

      // Left edge cannon
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 60,
        startVelocity: 52,
        origin: { x: 0.04, y: 0.68 },
        colors: CELEBRATION_COLORS,
        zIndex: 9999,
      });

      // Right edge cannon
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 60,
        startVelocity: 52,
        origin: { x: 0.96, y: 0.68 },
        colors: CELEBRATION_COLORS,
        zIndex: 9999,
      });
    }

    if (now < endTime) {
      window.requestAnimationFrame(frame);
    }
  };

  window.requestAnimationFrame(frame);

  // Mid-show star & gold shower + grand finale burst
  window.setTimeout(() => {
    confetti({
      particleCount: 75,
      spread: 120,
      startVelocity: 38,
      origin: { x: 0.28, y: 0.45 },
      colors: ['#fbbf24', '#f59e0b', '#fde047', '#ec4899'],
      zIndex: 9999,
    });
    confetti({
      particleCount: 75,
      spread: 120,
      startVelocity: 38,
      origin: { x: 0.72, y: 0.45 },
      colors: ['#fbbf24', '#f59e0b', '#fde047', '#a855f7'],
      zIndex: 9999,
    });
    cuteSound.playSparkle();
  }, 1100);

  window.setTimeout(() => {
    confetti({
      particleCount: 130,
      spread: 130,
      startVelocity: 48,
      origin: { x: 0.5, y: 0.5 },
      colors: CELEBRATION_COLORS,
      zIndex: 9999,
    });
  }, 2400);
}

/**
 * Celebratory multi-cannon confetti across the screen when a student earns
 * points from finishing a task (automatically upgrades to the extended milestone
 * spectacle if they just hit a 7-day streak milestone).
 */
export function triggerTaskPointsCelebration(
  pointsEarned: number,
  newStreakDays: number,
  previousStreakDays: number
): void {
  const hitSevenDayMilestone =
    newStreakDays >= 7 &&
    newStreakDays > previousStreakDays &&
    (newStreakDays === 7 || newStreakDays % 7 === 0);

  if (hitSevenDayMilestone) {
    triggerExtendedStreakCelebration();
    return;
  }

  cuteSound.playCelebrationFanfare();

  if (typeof window === 'undefined') return;

  const isBonusPoints = pointsEarned >= 10;

  // Center points burst
  confetti({
    particleCount: isBonusPoints ? 95 : 70,
    spread: 85,
    startVelocity: 42,
    origin: { x: 0.5, y: 0.62 },
    colors: CELEBRATION_COLORS,
    zIndex: 9999,
  });

  // Left & right follow-up bursts for full-screen points celebration
  window.setTimeout(() => {
    confetti({
      particleCount: 45,
      angle: 65,
      spread: 65,
      origin: { x: 0.12, y: 0.72 },
      colors: CELEBRATION_COLORS,
      zIndex: 9999,
    });
    confetti({
      particleCount: 45,
      angle: 115,
      spread: 65,
      origin: { x: 0.88, y: 0.72 },
      colors: CELEBRATION_COLORS,
      zIndex: 9999,
    });
  }, 220);

  if (isBonusPoints) {
    window.setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 105,
        startVelocity: 36,
        origin: { x: 0.5, y: 0.48 },
        colors: ['#fbbf24', '#f59e0b', '#ec4899', '#10b981'],
        zIndex: 9999,
      });
    }, 550);
  }
}
