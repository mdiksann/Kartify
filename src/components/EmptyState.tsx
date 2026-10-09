import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative mx-auto max-w-sm px-4 text-center',
        compact ? 'py-6' : 'py-10',
      )}
    >
      <h3 className="break-words text-sm font-semibold text-gray-900">
        {title}
      </h3>
      <p className="mt-1 break-words text-xs text-gray-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
