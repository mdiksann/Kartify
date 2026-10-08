'use client';
import { useEffect, useRef, useState } from 'react';
import { useBoardMutations } from './useBoardMutations';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { BoardData } from '@/lib/board-queries';
import { BoardColumn } from './BoardColumn';
import { ColumnControls } from './ColumnControls';
import { TaskDrawer } from '@/components/task/TaskDrawer';
import { ProjectControls } from '@/components/project/ProjectControls';
export function Board({
  data,
  slug,
  today,
  initialTaskId,
}: {
  data: BoardData;
  slug: string;
  today: string;
  initialTaskId?: string;
}) {
  const {
    columns,
    pending,
    busy,
    announcement,
    move,
    reorder,
    addTask,
    clearAnnouncement,
  } = useBoardMutations(data, slug);
  const [selected, setSelected] = useState<string | null>(
    initialTaskId ?? null,
  );
  const restoreTask = useRef<string | null>(null);
  useEffect(() => {
    if (!pending && !selected && restoreTask.current) {
      document
        .querySelector<HTMLElement>(`[data-task-id="${restoreTask.current}"]`)
        ?.focus();
      restoreTask.current = null;
    }
  }, [pending, selected]);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const scope = { slug, projectId: data.project.id };
  const manage = data.role !== 'MEMBER';
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );
  function drop(event: DragEndEvent) {
    setDragLabel(null);
    if (!event.over || busy.current) return;
    const active = event.active.data.current;
    const over = event.over.data.current;
    if (active?.kind === 'column') {
      const index = columns.findIndex((column) => column.id === over?.columnId);
      if (typeof active.columnId === 'string') reorder(active.columnId, index);
      return;
    }
    const taskId = String(event.active.id);
    const columnId = typeof over?.columnId === 'string' ? over.columnId : null;
    if (!columnId || event.over.id === event.active.id) return;
    const tasks =
      columns
        .find((column) => column.id === columnId)
        ?.tasks.filter((task) => task.id !== taskId) ?? [];
    const overIndex = tasks.findIndex(
      (task) => task.id === String(event.over?.id),
    );
    const below =
      (event.active.rect.current.translated?.top ?? 0) +
        (event.active.rect.current.translated?.height ?? 0) / 2 >
      event.over.rect.top + event.over.rect.height / 2;
    move(
      taskId,
      columnId,
      overIndex < 0 ? tasks.length : overIndex + (below ? 1 : 0),
    );
  }
  const selectedTask = columns
    .flatMap((column) => column.tasks)
    .find((task) => task.id === selected);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{data.project.name}</h1>
        {manage && (
          <div className="flex flex-wrap gap-2">
            <ProjectControls slug={slug} project={data.project} />
            <ColumnControls scope={scope} disabled={pending} />
          </div>
        )}
      </header>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {selected ? '' : announcement}
      </p>
      <DndContext
        id={`board-${data.project.id}`}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event) =>
          setDragLabel(
            columns
              .flatMap((column) => column.tasks)
              .find((task) => task.id === event.active.id)?.title ??
              columns.find(
                (column) => `column-${column.id}` === event.active.id,
              )?.name ??
              '',
          )
        }
        onDragCancel={() => setDragLabel(null)}
        onDragEnd={drop}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              'Press Space to pick up. Use arrow keys to move. Press Space to drop or Escape to cancel. Press Enter to open a task.',
          },
          announcements: {
            onDragStart: () => 'Picked up. Use arrow keys to move.',
            onDragOver: () => undefined,
            onDragEnd: () => undefined,
            onDragCancel: () => 'Drag cancelled.',
          },
        }}
      >
        <div className="flex max-w-full items-start gap-3 overflow-x-auto pb-4">
          <SortableContext
            items={columns.map((column) => `column-${column.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column, index) => (
              <BoardColumn
                key={column.id}
                column={column}
                scope={scope}
                manage={manage}
                pending={pending}
                today={today}
                actions={{
                  onOpen: (id) => {
                    clearAnnouncement();
                    setSelected(id);
                  },
                  onCreate: (title) => addTask(column.id, title),
                  onReorder: (direction) =>
                    reorder(column.id, index + (direction === 'left' ? -1 : 1)),
                }}
              />
            ))}
          </SortableContext>
          {!columns.length && (
            <div className="py-10 text-center">
              <h2 className="text-sm font-semibold">No columns yet</h2>
              <p className="mt-2 text-xs text-gray-500">
                {manage
                  ? 'Add a column to start creating tasks.'
                  : 'Ask an Owner or Admin to add a column.'}
              </p>
            </div>
          )}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragLabel && (
            <div className="max-w-xs rounded-lg border border-blue-500 bg-white p-3 text-sm font-medium opacity-90 shadow-sm">
              {dragLabel}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      {selected && (
        <TaskDrawer
          key={selected}
          scope={{ ...scope, taskId: selected }}
          columns={columns.map(({ id, name, tasks }) => ({
            id,
            name,
            tasks: tasks.map(({ id }) => ({ id })),
          }))}
          context={{
            actor: { id: data.userId, role: data.role },
            fallbackTitle: selectedTask?.title ?? 'Task',
            announcement,
          }}
          onClose={() => {
            clearAnnouncement();
            restoreTask.current = selected;
            setSelected(null);
          }}
          onMove={move}
          disabled={pending}
        />
      )}
    </div>
  );
}
