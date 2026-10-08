import { dueState, utcDate } from '@/lib/task-indicators';
import { cn } from '@/lib/utils';
export function DueBadge(props: {
  dueDate: Date | string | null;
  isDone: boolean;
  today: string;
}) {
  const state = dueState(props);
  if (!state || !props.dueDate) return null;
  const label =
    state === 'overdue'
      ? 'Overdue'
      : state === 'today'
        ? 'Due today'
        : state === 'soon'
          ? 'Due soon'
          : '';
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs',
        state === 'overdue'
          ? 'bg-red-50 text-red-700'
          : state === 'today' || state === 'soon'
            ? 'bg-amber-50 text-amber-700'
            : 'text-gray-500',
      )}
    >
      {label && `${label} · `}
      <time dateTime={utcDate(props.dueDate)}>{utcDate(props.dueDate)}</time>
    </span>
  );
}
