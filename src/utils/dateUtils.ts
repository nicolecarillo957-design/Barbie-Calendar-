import { CalendarEvent } from '../types/calendar';

/**
 * Formats a Date object as YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD string into Date object (local midnight)
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Returns Monday of the week for given date
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // If Sunday (0), distance is -6 days; otherwise distance is 1 - day
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns array of 7 dates representing the week starting from Monday
 */
export function getDaysOfWeek(currentDate: Date): Date[] {
  const start = getStartOfWeek(currentDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Converts HH:mm string to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converts minutes from midnight to HH:mm string
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats 24-hour HH:mm string into friendly 12-hour string (e.g. 9:00 AM)
 */
export function formatFriendlyTime(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Formats duration between startTime and endTime in hours and minutes
 */
export function formatDuration(startTime: string, endTime: string): string {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const diff = Math.max(0, endMin - startMin);
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Calculate duration in fractional hours (e.g. 1.5)
 */
export function getDurationHours(startTime: string, endTime: string): number {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  return Math.max(0, (endMin - startMin) / 60);
}

/**
 * Checks whether two time intervals overlap
 */
export function checkOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && sB < eA;
}

/**
 * Checks whether two dates are the same calendar day
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Calculate layout columns for overlapping events on a single day.
 * Returns map of eventId -> { colIndex, totalCols }
 */
export function computeEventColumns(events: CalendarEvent[]): Map<string, { colIndex: number; totalCols: number }> {
  const result = new Map<string, { colIndex: number; totalCols: number }>();
  if (events.length === 0) return result;

  // Sort events primarily by start time, secondary by duration descending
  const sorted = [...events].sort((a, b) => {
    const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (diff !== 0) return diff;
    return (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)) - 
           (timeToMinutes(a.endTime) - timeToMinutes(a.startTime));
  });

  // Track active clusters of overlapping events
  const clusters: CalendarEvent[][] = [];
  let currentCluster: CalendarEvent[] = [];
  let clusterEnd = 0;

  for (const ev of sorted) {
    const evStart = timeToMinutes(ev.startTime);
    const evEnd = timeToMinutes(ev.endTime);

    if (currentCluster.length === 0) {
      currentCluster.push(ev);
      clusterEnd = evEnd;
    } else if (evStart < clusterEnd) {
      // Overlaps with current cluster
      currentCluster.push(ev);
      clusterEnd = Math.max(clusterEnd, evEnd);
    } else {
      clusters.push(currentCluster);
      currentCluster = [ev];
      clusterEnd = evEnd;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Layout each cluster into columns
  for (const cluster of clusters) {
    const columns: CalendarEvent[][] = [];

    for (const ev of cluster) {
      const evStart = timeToMinutes(ev.startTime);
      let placed = false;

      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1];
        if (timeToMinutes(lastInCol.endTime) <= evStart) {
          columns[i].push(ev);
          result.set(ev.id, { colIndex: i, totalCols: 0 }); // totalCols will be updated
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([ev]);
        result.set(ev.id, { colIndex: columns.length - 1, totalCols: 0 });
      }
    }

    const totalCols = columns.length;
    for (const ev of cluster) {
      const info = result.get(ev.id);
      if (info) {
        result.set(ev.id, { colIndex: info.colIndex, totalCols });
      }
    }
  }

  return result;
}

/**
 * Generate iCalendar (.ics) string for export
 */
export function exportToIcs(events: CalendarEvent[]): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const dtStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barbie Calendar//Time Management Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Barbie Calendar',
  ];

  for (const ev of events) {
    const [year, month, day] = ev.date.split('-').map(Number);
    const [startH, startM] = ev.startTime.split(':').map(Number);
    const [endH, endM] = ev.endTime.split(':').map(Number);

    const dtStart = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00`;
    const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(endM)}00`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@barbiecalendar.app`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeIcs(ev.title)}`);
    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcs(ev.description)}`);
    }
    if (ev.location) {
      lines.push(`LOCATION:${escapeIcs(ev.location)}`);
    }
    lines.push(`CATEGORIES:${ev.category.toUpperCase()}`);
    lines.push(`STATUS:${ev.isCompleted ? 'COMPLETED' : 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Downloads a string as an ICS file in browser
 */
export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
