export function utcDate(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}
export function dueState(options: {
  dueDate: Date | string | null;
  isDone: boolean;
  today: string;
}): 'overdue' | 'today' | 'soon' | 'future' | null {
  if (!options.dueDate) return null;
  const date = utcDate(options.dueDate);
  if (!options.isDone && date < options.today) return 'overdue';
  if (date === options.today) return 'today';
  const days = (Date.parse(date) - Date.parse(options.today)) / 86_400_000;
  return days > 0 && days <= 7 ? 'soon' : 'future';
}
