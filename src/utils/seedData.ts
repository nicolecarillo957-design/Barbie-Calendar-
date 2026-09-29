import { CalendarEvent, UnscheduledTask } from '../types/calendar';

/**
 * Clean schedule: No pre-populated events so the user can freely create their own timeboxes!
 */
export const INITIAL_EVENTS: CalendarEvent[] = [];

/**
 * Initial backlog tasks: Fresh and empty for the user to add their own to-dos!
 */
export const INITIAL_TASKS: UnscheduledTask[] = [];
