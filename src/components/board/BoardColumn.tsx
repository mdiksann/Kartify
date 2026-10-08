'use client';
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
  const color = column.isDone
    ? 'bg-green-50'
    : column.name.toLowerCase() === 'in progress'
      ? 'bg-amber-50'
      : column.name.toLowerCase() === 'in review'
        ? 'bg-violet-50'
        : 'bg-gray-50';
  const pill = column.isDone
    ? 'bg-green-600 text-white'
    : column.name.toLowerCase() === 'in progress'
      ? 'bg-amber-400 text-gray-900'
      : column.name.toLowerCase() === 'in review'
        ? 'bg-violet-600 text-white'
        : 'bg-gray-200 text-gray-700';
  return (
    <section
      ref={setColumnRef}
      aria-label={`Column: ${column.name}, ${column.tasks.length} tasks`}
      className={cn(
        'w-[85vw] max-w-xs shrink-0 rounded-lg p-2.5 md:w-[300px]',
        color,
        isDragging && 'opacity-60',
        isOver && 'ring-1 ring-blue-500/30',
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2
          className={cn(
            'inline-flex min-w-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold uppercase',
            pill,
          )}
        >
          <span className="truncate">{column.name}</span>
          <span className="rounded-full bg-white/70 px-1.5 text-gray-700">
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
              className="touch-none max-md:size-11"
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
          <p className="py-6 text-center text-xs text-gray-500">No tasks yet</p>
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
