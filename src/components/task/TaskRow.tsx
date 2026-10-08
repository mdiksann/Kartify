import Link from 'next/link';
import type { TaskRowData } from '@/lib/search';
import { DueBadge } from './DueBadge';
import { PriorityBadge } from './PriorityBadge';
export function TaskRow({
  task,
  slug,
  today,
}: {
  task: TaskRowData;
  slug: string;
  today: string;
}) {
  return (
    <li className="border-b border-gray-100 last:border-0">
      <Link
        href={`/w/${slug}/board/${task.project.id}?task=${task.id}`}
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-medium">
            {task.title}
          </span>
          <span className="text-xs text-gray-500">
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
