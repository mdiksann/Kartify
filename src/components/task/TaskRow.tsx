import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { TaskRowData } from '@/lib/search';
import { DueBadge } from './DueBadge';
import { PriorityBadge } from './PriorityBadge';
export function TaskRow({
  task,
  slug,
  today,
  outlined = false,
}: {
  task: TaskRowData;
  slug: string;
  today: string;
  outlined?: boolean;
}) {
  return (
    <li
      className={outlined ? undefined : 'border-b border-border last:border-0'}
    >
      <Link
        href={`/w/${slug}/board/${task.project.id}?task=${task.id}`}
        className={cn(
          'flex flex-col items-start justify-between gap-2 rounded-md py-3 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary sm:flex-row sm:items-center sm:gap-3',
          outlined
            ? 'border border-card-border bg-background px-4 hover:border-gray-400'
            : 'px-2',
        )}
      >
        <span className="w-full min-w-0 sm:w-auto sm:flex-1">
          <span className="block break-words text-sm font-medium">
            {task.title}
          </span>
          <span className="break-words text-xs text-gray-500">
            {task.project.name} · {task.column.name}
            {task.assignee && ` · ${task.assignee.name}`}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <DueBadge
            dueDate={task.dueDate}
            isDone={task.column.isDone}
            today={today}
          />
          <PriorityBadge priority={task.priority} />
        </span>
      </Link>
    </li>
  );
}
