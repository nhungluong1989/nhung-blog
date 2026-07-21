import readingTime from 'reading-time';

export function getMinutes(body: string | undefined): number {
  if (!body) return 1;
  const stats = readingTime(body);
  return Math.max(1, Math.round(stats.minutes));
}
