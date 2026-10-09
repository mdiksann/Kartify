import { dateSchema } from './validation/task';
const dayMs = 86_400_000;
export function monthWindow(month: string) {
  const first = dateSchema.parse(`${month}-01`);
  const next = new Date(`${first}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  next.setUTCDate(0);
  const last = next.toISOString().slice(0, 10);
  return {
    first,
    last,
    days: next.getUTCDate(),
    weekday: new Date(`${first}T00:00:00Z`).getUTCDay(),
  };
}
export function shiftMonth(month: string, direction: -1 | 1) {
  const { first } = monthWindow(month);
  const date = new Date(`${first}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + direction);
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return month;
  return date.toISOString().slice(0, 7);
}
export function visibleRange(
  start: string | null,
  end: string | null,
  month: string,
) {
  const { first, last } = monthWindow(month);
  if (!start || !end || start > end || start > last || end < first) return null;
  const from = start < first ? first : start;
  const to = end > last ? last : end;
  return {
    offset:
      (Date.parse(`${from}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) /
      dayMs,
    length:
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
        dayMs +
      1,
  };
}
