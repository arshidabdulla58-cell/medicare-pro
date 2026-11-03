export type WeeklyAvailability = { dayOfWeek: number; startTime: string; endTime: string };

const weekdayNumber: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function isValidTimeZone(timeZone: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone }).format(0); return true; } catch { return false; }
}

export function isWithinAvailability(start: Date, timeZone: string, weeklyAvailability: WeeklyAvailability[]): boolean {
  if (weeklyAvailability.length === 0 || !isValidTimeZone(timeZone)) return false;
  const startParts = localParts(start, timeZone);
  const endParts = localParts(new Date(start.getTime() + 30 * 60_000), timeZone);
  if (startParts.minute % 30 !== 0 || startParts.day !== endParts.day) return false;
  return weeklyAvailability.some((window) => {
    if (window.dayOfWeek !== startParts.day) return false;
    const from = minutes(window.startTime);
    const until = minutes(window.endTime);
    return from < until && startParts.minuteOfDay >= from && endParts.minuteOfDay <= until;
  });
}

export function enumerateAvailableSlots(from: Date, days: number, timeZone: string, weeklyAvailability: WeeklyAvailability[], reservedTimes: Set<number>): Date[] {
  if (!isValidTimeZone(timeZone) || weeklyAvailability.length === 0) return [];
  const end = from.getTime() + days * 24 * 60 * 60_000;
  const step = 15 * 60_000;
  let cursor = Math.ceil(from.getTime() / step) * step;
  const available: Date[] = [];
  for (; cursor < end; cursor += step) {
    const candidate = new Date(cursor);
    if (reservedTimes.has(cursor)) continue;
    if (isWithinAvailability(candidate, timeZone, weeklyAvailability)) available.push(candidate);
  }
  return available;
}

function localParts(date: Date, timeZone: string): { day: number; minute: number; minuteOfDay: number } {
  const parts = new Intl.DateTimeFormat('en', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = Number(value('hour'));
  const minute = Number(value('minute'));
  return { day: weekdayNumber[value('weekday')] ?? -1, minute, minuteOfDay: hour * 60 + minute };
}

function minutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}
