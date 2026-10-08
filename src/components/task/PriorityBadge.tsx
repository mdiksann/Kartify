import { Flag } from 'lucide-react';
import type { TaskPriority } from '@prisma/client';
import { cn } from '@/lib/utils';
const colors = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-orange-50 text-orange-700',
  URGENT: 'bg-red-50 text-red-700',
} satisfies Record<TaskPriority, string>;
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold',
        colors[priority],
      )}
    >
      <Flag aria-hidden="true" className="size-3" />
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}
