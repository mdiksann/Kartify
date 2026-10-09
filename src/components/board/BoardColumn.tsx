'use client';
import { EmptyState } from '@/components/EmptyState';
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoardColumns } from '@/lib/board-state';
import { TaskCard } from './TaskCard';
import { ColumnControls } from './ColumnControls';
import { InlineTask } from './InlineTask';
import { Button } from '@/components/ui/button';
export function BoardColumn({
  column,
  scope,
  manage,
  pending,
  today,
  actions,
}: {
  column: BoardColumns[number];
  scope: { slug: string; projectId: string };
  manage: boolean;
  pending: boolean;
  today: string;
  actions: {
    onOpen: (id: string) => void;
    onCreate: (title: string) => Promise<string | null>;
    onReorder: (direction: 'left' | 'right') => void;
  };
}) {
  const {
    setNodeRef: setColumnRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
    data: { kind: 'column', columnId: column.id },
    disabled: !manage || pending,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: column.id,
    data: { kind: 'lane', columnId: column.id },
    disabled: pending,
  });
  const color = 'border border-card-border bg-background';
  const pill = column.isDone
    ? 'bg-green-100 text-green-800'
    : column.name.toLowerCase() === 'in progress'
      ? 'bg-amber-100 text-amber-800'
      : column.name.toLowerCase() === 'in review'
        ? 'bg-violet-100 text-violet-800'
        : 'bg-gray-200 text-gray-700';
  return (
    <section
      ref={setColumnRef}
      aria-label={`Column: ${column.name}, ${column.tasks.length} tasks`}
      className={cn(
        'w-[85vw] max-w-xs shrink-0 snap-start rounded-lg p-2.5 md:w-[300px]',
        color,
        isDragging && 'opacity-60',
        isOver && 'ring-1 ring-primary/20',
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2
          className={cn(
            'inline-flex min-w-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium',
            pill,
          )}
        >
          <span className="truncate">{column.name}</span>
          <span className="px-1 text-muted-foreground">
            {column.tasks.length}
          </span>
        </h2>
        {manage && (
          <div className="flex shrink-0">
            <Button
              ref={setActivatorNodeRef}
              variant="ghost"
              size="icon"
              {...attributes}
              {...listeners}
              disabled={pending}
              aria-label={`Reorder column ${column.name}`}
              title={`Reorder column ${column.name}`}
              className="size-11 touch-none"
            >
              <GripVertical />
            </Button>
            <ColumnControls
              scope={scope}
              column={column}
              disabled={pending}
              onReorder={actions.onReorder}
            />
          </div>
        )}
      </header>
      <div ref={setDropRef} className="min-h-12 space-y-2">
        <SortableContext
          items={column.tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              disabled={pending}
              today={today}
              onOpen={() => actions.onOpen(task.id)}
            />
          ))}
        </SortableContext>
        {!column.tasks.length && (
          <EmptyState
            compact
            title="No tasks yet"
            description="Add a task below to start this column."
          />
        )}
        <InlineTask
          scope={{ ...scope, columnId: column.id }}
          disabled={pending}
          onCreate={actions.onCreate}
        />
      </div>
    </section>
  );
}
