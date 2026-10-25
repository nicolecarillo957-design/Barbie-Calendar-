import { StudentStreakData } from '../types/calendar';

export const STREAK_STORAGE_KEY = 'student_streak_points_v1';
export const STUDENT_NAME_STORAGE_KEY = 'student_name_v1';
export const TEACHER_MODE_STORAGE_KEY = 'teacher_monitoring_mode_v1';

export const DEFAULT_STREAK_DATA: StudentStreakData = {
  currentStreak: 3,
  bestStreak: 5,
  totalPoints: 45,
  lastActiveDate: '2026-10-24',
  historyDates: ['2026-10-22', '2026-10-23', '2026-10-24'],
};

/**
 * Calculates updated streak when a task is completed with evidence on a given date (YYYY-MM-DD)
 */
export function calculateUpdatedStreak(
  prev: StudentStreakData,
  completedDateStr: string,
  pointsEarned: number
): StudentStreakData {
  const historySet = new Set(prev.historyDates);
  const alreadyCompletedToday = historySet.has(completedDateStr);
  
  historySet.add(completedDateStr);
  const sortedDates = Array.from(historySet).sort();

  let newCurrentStreak = prev.currentStreak;

  if (!alreadyCompletedToday) {
    if (!prev.lastActiveDate) {
      newCurrentStreak = 1;
    } else {
      // Check if last active was yesterday
      const lastDate = new Date(prev.lastActiveDate);
      const currDate = new Date(completedDateStr);
      const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newCurrentStreak = prev.currentStreak + 1;
      } else if (diffDays === 0) {
        newCurrentStreak = prev.currentStreak;
      } else {
        // Gap of more than 1 day resets streak to 1
        newCurrentStreak = 1;
      }
    }
  }

  const newBestStreak = Math.max(prev.bestStreak, newCurrentStreak);
  const newTotalPoints = prev.totalPoints + pointsEarned;

  return {
    currentStreak: newCurrentStreak,
    bestStreak: newBestStreak,
    totalPoints: newTotalPoints,
    lastActiveDate: completedDateStr,
    historyDates: sortedDates,
  };
}
