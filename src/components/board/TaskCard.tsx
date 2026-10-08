'use client';
import { useSortable } from '@dnd-kit/sortable';
import { MessageSquare } from 'lucide-react';
import { DueBadge } from '@/components/task/DueBadge';
import { PriorityBadge } from '@/components/task/PriorityBadge';
import type { TaskView } from '@/lib/task-select';
import { cn } from '@/lib/utils';
export function TaskCard({
  task,
  disabled,
  onOpen,
  today,
}: {
  task: TaskView;
  disabled: boolean;
  onOpen: () => void;
  today: string;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useSortable({
    id: task.id,
    data: { kind: 'task', columnId: task.columnId },
    disabled,
  });
  return (
    <button
      data-task-id={task.id}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      disabled={disabled}
      aria-label={`Open task ${task.title}. ${task.column.name}. ${task.priority.toLowerCase()} priority`}
      className={cn(
        'relative w-full touch-pan-y rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
        isDragging && 'opacity-60 ring-2 ring-blue-500/40',
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm font-medium">{task.title}</span>
        {task.assignee && (
          <span
            aria-label={`Assigned to ${task.assignee.name}`}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[11px] font-semibold text-gray-700"
          >
            {task.assignee.name
              .split(/\s+/)
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </span>
        )}
      </span>
      {task.dueDate && (
        <span className="mt-2 block">
          <DueBadge
            dueDate={task.dueDate}
            isDone={task.column.isDone}
            today={today}
          />
        </span>
      )}
      {task.description && (
        <span className="mt-2 line-clamp-2 text-xs text-gray-500">
          {task.description}
        </span>
      )}
      <span className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <MessageSquare aria-hidden="true" className="size-3.5" />
          {task._count.comments}
          <span className="sr-only"> comments</span>
        </span>
        <PriorityBadge priority={task.priority} />
      </span>
    </button>
  );
}
