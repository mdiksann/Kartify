'use client';
import { useOptimistic, useRef, useState, useTransition } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from '@/lib/toast';
import { createTask, moveTask } from '@/actions/task';
import { reorderColumn } from '@/actions/column';
import {
  optimisticMove,
  taskNeighbors,
  type BoardColumns,
} from '@/lib/board-state';
import { orderBetween, OrderingCollisionError } from '@/lib/ordering';
import type { BoardData } from '@/lib/board-queries';
type Change =
  | { kind: 'move'; taskId: string; columnId: string; index: number }
  | { kind: 'replace'; columns: BoardColumns };
export function useBoardMutations(data: BoardData, slug: string) {
  const [columns, change] = useOptimistic(
    data.columns,
    (state, event: Change) =>
      event.kind === 'move' ? optimisticMove(state, event) : event.columns,
  );
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const [announcement, setAnnouncement] = useState('');
  const scope = { slug, projectId: data.project.id };
  function move(taskId: string, columnId: string, index: number) {
    if (busy.current) return;
    busy.current = true;
    const snapshot = columns;
    const neighbors = taskNeighbors(columns, { taskId, columnId, index });
    const target = columns.find((column) => column.id === columnId);
    const current = columns.find((column) =>
      column.tasks.some((task) => task.id === taskId),
    );
    if (
      !target ||
      (current?.id === columnId &&
        current.tasks.findIndex((task) => task.id === taskId) === index)
    ) {
      busy.current = false;
      return;
    }
    startTransition(async () => {
      change({ kind: 'move', taskId, columnId, index });
      setAnnouncement('');
      try {
        const result = await moveTask({
          ...scope,
          taskId,
          toColumnId: columnId,
          ...neighbors,
        });
        if (!result.ok) {
          change({ kind: 'replace', columns: snapshot });
          setAnnouncement('Move failed. The task was restored.');
          toast.error(result.message);
          return;
        }
        setAnnouncement(`Moved to ${target.name}, position ${index + 1}`);
      } catch {
        change({ kind: 'replace', columns: snapshot });
        setAnnouncement('Move failed. The task was restored.');
        toast.error('Could not move the task. It was restored.');
      } finally {
        busy.current = false;
      }
    });
  }
  function reorder(columnId: string, toIndex: number) {
    if (busy.current) return;
    const from = columns.findIndex((column) => column.id === columnId);
    if (
      from < 0 ||
      toIndex < 0 ||
      toIndex >= columns.length ||
      from === toIndex
    )
      return;
    busy.current = true;
    const snapshot = columns;
    const next = arrayMove(columns, from, toIndex);
    startTransition(async () => {
      change({ kind: 'replace', columns: next });
      try {
        const result = await reorderColumn({
          ...scope,
          columnId,
          afterId: next[toIndex - 1]?.id,
          beforeId: next[toIndex + 1]?.id,
        });
        if (!result.ok) {
          change({ kind: 'replace', columns: snapshot });
          toast.error(result.message);
          return;
        }
        toast.success('Column moved');
      } catch {
        change({ kind: 'replace', columns: snapshot });
        toast.error('Could not move the column. It was restored.');
      } finally {
        busy.current = false;
      }
    });
  }
  async function addTask(
    columnId: string,
    title: string,
  ): Promise<string | null> {
    if (busy.current) return 'Wait for the current change to finish.';
    const column = columns.find((column) => column.id === columnId);
    if (!column) return 'This column is no longer available.';
    let position: number;
    try {
      position = orderBetween(column.tasks.at(-1)?.position);
    } catch (error) {
      if (!(error instanceof OrderingCollisionError)) throw error;
      // This temporary card stays last; the action renumbers persisted positions.
      position = orderBetween();
    }
    busy.current = true;
    const snapshot = columns;
    const now = new Date();
    const temporary = {
      id: `optimistic-${crypto.randomUUID()}`,
      projectId: data.project.id,
      columnId,
      title,
      description: null,
      priority: 'MEDIUM' as const,
      assigneeId: null,
      startDate: null,
      dueDate: null,
      createdBy: data.userId,
      createdAt: now,
      updatedAt: now,
      position,
      column: {
        id: column.id,
        projectId: column.projectId,
        name: column.name,
        position: column.position,
        isDone: column.isDone,
        createdAt: column.createdAt,
        updatedAt: column.updatedAt,
      },
      assignee: null,
      _count: { comments: 0 },
    };
    return new Promise((resolve) => {
      startTransition(async () => {
        change({
          kind: 'replace',
          columns: columns.map((item) =>
            item.id === columnId
              ? { ...item, tasks: [...item.tasks, temporary] }
              : item,
          ),
        });
        try {
          const result = await createTask({ ...scope, columnId, title });
          if (!result.ok) {
            change({ kind: 'replace', columns: snapshot });
            toast.error(result.message);
            resolve(result.message);
            return;
          }
          toast.success('Task created');
          resolve(null);
        } catch {
          change({ kind: 'replace', columns: snapshot });
          toast.error('Could not create the task. Try again.');
          resolve('Could not create the task. Try again.');
        } finally {
          busy.current = false;
        }
      });
    });
  }
  return {
    columns,
    pending,
    busy,
    announcement,
    move,
    reorder,
    addTask,
    clearAnnouncement: () => setAnnouncement(''),
  };
}
