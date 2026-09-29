import { CyclePhase, CyclePhaseInfo, CycleSettings, DayCycleStatus } from '../types/calendar';
import { formatDateKey, parseDateKey } from './dateUtils';

export const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  enabled: true,
  lastPeriodStartDate: '2026-09-26', // Sept 26, 2026 (so on Sept 28 it is Day 3 - Menstrual Phase)
  cycleLengthDays: 28,
  periodDurationDays: 5,
  dailyMorningNotificationEnabled: true,
  morningNotificationTime: '08:00',
};

export const CYCLE_PHASE_CONFIG: Record<
  CyclePhase,
  {
    name: string;
    season: string;
    icon: string;
    color: string;
    bgClass: string;
    borderClass: string;
    badgeClass: string;
    gradientClass: string;
    summary: string;
  }
> = {
  menstrual: {
    name: 'Menstrual Phase (Reset & Rest)',
    season: 'Inner Winter ❄️',
    icon: '🩸',
    color: '#e11d48', // Crimson Rose
    bgClass: 'bg-rose-50/90',
    borderClass: 'border-rose-300',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    gradientClass: 'from-rose-500 to-pink-600',
    summary: 'Time to rest, nourish, and honor your inner winter with cozy self-care and gentle pacing.',
  },
  follicular: {
    name: 'Follicular Phase (Spark & Create)',
    season: 'Inner Spring 🌱',
    icon: '🌸',
    color: '#ec4899', // Hot Barbie Pink
    bgClass: 'bg-pink-50/90',
    borderClass: 'border-pink-300',
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-300',
    gradientClass: 'from-pink-500 to-rose-400',
    summary: 'Rising estrogen brings high creative energy, fresh optimism, and drive to start big ideas.',
  },
  ovulatory: {
    name: 'Ovulatory Phase (Peak & Glow)',
    season: 'Inner Summer ☀️',
    icon: '👑',
    color: '#d946ef', // Fuchsia Sparkle
    bgClass: 'bg-fuchsia-50/90',
    borderClass: 'border-fuchsia-300',
    badgeClass: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
    gradientClass: 'from-fuchsia-500 to-pink-500',
    summary: 'Peak confidence, magnetic communication, and stamina for high-impact social and executive tasks.',
  },
  luteal: {
    name: 'Luteal Phase (Organize & Ground)',
    season: 'Inner Autumn 🍂',
    icon: '🎀',
    color: '#be185d', // Deep Magenta
    bgClass: 'bg-pink-100/70',
    borderClass: 'border-pink-400',
    badgeClass: 'bg-pink-200/80 text-pink-900 border-pink-300',
    gradientClass: 'from-pink-600 to-purple-600',
    summary: 'Progesterone brings detail-oriented focus. Wrap up loose ends, organize spaces, and slow down.',
  },
};

/**
 * Returns cycle information for a given date based on cycle settings
 */
export function getCurrentCycleInfo(currentDate: Date, settings: CycleSettings = DEFAULT_CYCLE_SETTINGS): CyclePhaseInfo {
  const lastStart = parseDateKey(settings.lastPeriodStartDate);
  
  // Calculate difference in whole calendar days (UTC to UTC)
  const utcTarget = Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const utcLast = Date.UTC(lastStart.getFullYear(), lastStart.getMonth(), lastStart.getDate());
  const diffDays = Math.floor((utcTarget - utcLast) / (1000 * 60 * 60 * 24));

  const cycleLen = Math.max(20, Math.min(45, settings.cycleLengthDays || 28));
  const periodLen = Math.max(2, Math.min(10, settings.periodDurationDays || 5));

  // Compute 1-indexed cycle day (1 to cycleLen)
  const cycleDay = (((diffDays % cycleLen) + cycleLen) % cycleLen) + 1;

  // Ovulation typically occurs 14 days before the end of the cycle
  const ovulationDay = Math.max(periodLen + 2, cycleLen - 14);

  // Determine current biological phase
  let phase: CyclePhase;
  if (cycleDay <= periodLen) {
    phase = 'menstrual';
  } else if (cycleDay < ovulationDay - 1) {
    phase = 'follicular';
  } else if (cycleDay <= ovulationDay + 2) {
    phase = 'ovulatory';
  } else {
    phase = 'luteal';
  }

  const isPeriod = cycleDay <= periodLen;
  const isOvulation = cycleDay === ovulationDay;
  const isFertile = cycleDay >= ovulationDay - 4 && cycleDay <= ovulationDay + 1;

  // Days until next period
  const daysUntilNextPeriod = cycleLen - cycleDay + 1;
  const nextPeriodDateObj = new Date(currentDate);
  nextPeriodDateObj.setDate(currentDate.getDate() + daysUntilNextPeriod);
  const nextPeriodDate = formatDateKey(nextPeriodDateObj);

  const config = CYCLE_PHASE_CONFIG[phase];

  // Specific recommendations based on phase
  let energyLevel = '';
  let hormones = '';
  let whatToDoWork = '';
  let whatToDoMovement = '';
  let whatToDoNutrition = '';
  let whatToDoSelfCare = '';
  let affirmation = '';

  switch (phase) {
    case 'menstrual':
      energyLevel = 'Gentle, Restorative & Reflective';
      hormones = 'Estrogen & progesterone at lowest baseline. Intuition and right-brain reflection peak.';
      whatToDoWork = 'Focus on big-picture strategic reviews, journaling goals, independent creative writing, and low-pressure admin. Protect your calendar from unnecessary back-to-back syncs.';
      whatToDoMovement = 'Restorative yin yoga, gentle mobility stretching, slow walks in nature, or pure rest days.';
      whatToDoNutrition = 'Iron & mineral-rich foods (spinach, beets, lentil soup), bone broth, warm ginger/chamomile teas, and dark chocolate (70%+). Avoid icy drinks.';
      whatToDoSelfCare = 'Warm heating pad on belly, lavender essential oils, early bedtimes (8+ hours), cozy blankets, and warm bubble baths.';
      affirmation = 'I honor my body’s natural cadence and grant myself permission to rest, recharge, and reset 💖';
      break;

    case 'follicular':
      energyLevel = 'Rising, Vibrant, Curious & Optimistic';
      hormones = 'Estrogen & FSH steadily rise. Brain neuroplasticity and mental alertness are supercharged.';
      whatToDoWork = 'Best time to brainstorm fresh concepts, initiate new projects, learn new skills, architect strategy, and map out quarterly visions!';
      whatToDoMovement = 'Energy is bouncing back! Try reformer pilates, dance workouts, strength training, cycling, and trail jogs.';
      whatToDoNutrition = 'Vibrant probiotic foods (kimchi, kombucha), avocado, citrus fruits, pumpkin & flax seeds (seed cycling), light proteins, and green matcha.';
      whatToDoSelfCare = 'Try something new! Experiment with a daring fashion outfit, plan a fun day out with friends, or start a creative hobby.';
      affirmation = 'My mind is sparkling with inspiration and I have the power to create beautiful things ✨';
      break;

    case 'ovulatory':
      energyLevel = 'Peak, Magnetic, Confident & Radiant';
      hormones = 'Estrogen peaks, LH surge triggers ovulation, and a mild testosterone bump boosts confidence and verbal fluency.';
      whatToDoWork = 'Prime time for high-stakes pitches, public speaking, executive board syncs, podcast interviews, salary negotiations, and networking events!';
      whatToDoMovement = 'High stamina! HIIT circuits, heavy strength workouts, power yoga, and competitive group fitness classes.';
      whatToDoNutrition = 'Antioxidant-dense berries, leafy green salads, sunflower & sesame seeds, quinoa, grilled salmon, and continuous hydration with lemon.';
      whatToDoSelfCare = 'Socialize, dress up in your favorite Barbie glam, celebrate your wins with friends, and enjoy community connections!';
      affirmation = 'I step into my full power and magnetic radiance with grace, strength, and joy 👑';
      break;

    case 'luteal':
      energyLevel = 'Inward, Detail-Oriented, Analytical & Grounded';
      hormones = 'Progesterone dominates to ground and calm the nervous system, then gradually tapers off before the next cycle.';
      whatToDoWork = 'Superpower: detail orientation! Ideal for code reviews, editing documents, organizing files and closets, closing open tasks, and finishing deliverables.';
      whatToDoMovement = 'Low-impact strength, slow pilates, brisk walks, and gentle barre. Taper intensity as your period approaches.';
      whatToDoNutrition = 'Complex carbs to support serotonin (sweet potatoes, roasted squash, oats), magnesium-rich pumpkin seeds, bananas, and calming peppermint tea.';
      whatToDoSelfCare = 'Declutter your living space, take relaxing evening baths, set gentle boundaries, avoid overcommitting, and stock up on period care essentials.';
      affirmation = 'I ground myself in clarity, patience, and gentle self-compassion 🎀';
      break;
  }

  return {
    phase,
    phaseName: config.name,
    seasonName: config.season,
    icon: config.icon,
    cycleDay,
    cycleLength: cycleLen,
    isPeriod,
    isOvulation,
    isFertile,
    daysUntilNextPeriod,
    nextPeriodDate,
    energyLevel,
    hormones,
    whatToDoWork,
    whatToDoMovement,
    whatToDoNutrition,
    whatToDoSelfCare,
    affirmation,
  };
}

/**
 * Checks the cycle status of any specific calendar date (for marking on calendar grids)
 */
export function getDayCycleStatus(dateKey: string, settings: CycleSettings = DEFAULT_CYCLE_SETTINGS): DayCycleStatus {
  const targetDate = parseDateKey(dateKey);
  const lastStart = parseDateKey(settings.lastPeriodStartDate);

  const utcTarget = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const utcLast = Date.UTC(lastStart.getFullYear(), lastStart.getMonth(), lastStart.getDate());
  const diffDays = Math.floor((utcTarget - utcLast) / (1000 * 60 * 60 * 24));

  const cycleLen = Math.max(20, Math.min(45, settings.cycleLengthDays || 28));
  const periodLen = Math.max(2, Math.min(10, settings.periodDurationDays || 5));

  const cycleDay = (((diffDays % cycleLen) + cycleLen) % cycleLen) + 1;
  const ovulationDay = Math.max(periodLen + 2, cycleLen - 14);

  let phase: CyclePhase;
  if (cycleDay <= periodLen) {
    phase = 'menstrual';
  } else if (cycleDay < ovulationDay - 1) {
    phase = 'follicular';
  } else if (cycleDay <= ovulationDay + 2) {
    phase = 'ovulatory';
  } else {
    phase = 'luteal';
  }

  const isPeriod = cycleDay <= periodLen;
  const isOvulation = cycleDay === ovulationDay;
  const isNextPeriodPredicted = cycleDay === 1;

  return {
    date: dateKey,
    isPeriod,
    isNextPeriodPredicted,
    isOvulation,
    phase,
    cycleDay,
  };
}

/**
 * Generates an uplifting, gentle, phase-specific morning message
 */
export function getCycleMorningMessage(phaseInfo: CyclePhaseInfo): {
  title: string;
  message: string;
  icon: string;
} {
  switch (phaseInfo.phase) {
    case 'menstrual':
      return {
        title: `Good Morning, Beautiful! Day ${phaseInfo.cycleDay} · Menstrual Glow 🩸`,
        message: `Your body is resting and resetting today. Give yourself permission to move gently, drink warm rose tea, and focus on quiet reflection without pressure 💖`,
        icon: '🩸',
      };

    case 'follicular':
      return {
        title: `Good Morning, Glow-Getter! Day ${phaseInfo.cycleDay} · Spring Sparkle 🌸`,
        message: `Estrogen is rising and your creativity is blooming! Today is prime for fresh ideas, learning something exciting, and planning bold new adventures ✨`,
        icon: '🌸',
      };

    case 'ovulatory':
      return {
        title: `Good Morning, Radiant Queen! Day ${phaseInfo.cycleDay} · Peak Summer 👑`,
        message: `You are at your peak magnetic radiance and verbal confidence today! Step into the spotlight, pitch your vision, and share your warmth with the world 💖`,
        icon: '👑',
      };

    case 'luteal':
      return {
        title: `Good Morning, Boss Babe! Day ${phaseInfo.cycleDay} · Autumn Grounding 🎀`,
        message: `Your superpower today is detail focus and nesting! Wrap up loose ends, organize your dreamhouse space, and protect your evening tranquility 🕯️`,
        icon: '🎀',
      };
  }
}
