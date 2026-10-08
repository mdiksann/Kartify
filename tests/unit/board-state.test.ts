import { describe, expect, it } from 'vitest';
import {
  dueState,
  optimisticMove,
  taskNeighbors,
  type BoardColumns,
} from '@/lib/board-state';
const now = new Date('2026-10-08T00:00:00Z');
function fixture(): BoardColumns {
  const columns = ['todo', 'done'].map((id, index) => ({
    id,
    projectId: 'project',
    name: id,
    position: index + 1,
    isDone: index === 1,
    createdAt: now,
    updatedAt: now,
  }));
  return columns.map((column, index) => ({
    ...column,
    tasks: (index === 0 ? ['a', 'b'] : ['c']).map((id, position) => ({
      id,
      projectId: 'project',
      columnId: column.id,
      title: id,
      description: null,
      priority: 'MEDIUM' as const,
      assigneeId: null,
      dueDate: null,
      createdBy: 'author',
      createdAt: now,
      updatedAt: now,
      position: position + 1,
      column,
      assignee: null,
      _count: { comments: 0 },
    })),
  }));
}
describe('optimistic board state', () => {
  it('moves across columns immutably and retains the snapshot for rollback', () => {
    const previous = fixture();
    const next = optimisticMove(previous, {
      taskId: 'a',
      columnId: 'done',
      index: 0,
    });
    expect(previous[0]?.tasks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(next[0]?.tasks.map((t) => t.id)).toEqual(['b']);
    expect(next[1]?.tasks.map((t) => t.id)).toEqual(['a', 'c']);
    expect(next[1]?.tasks[0]?.column).toMatchObject({
      id: 'done',
      name: 'done',
      isDone: true,
    });
    expect(previous[0]?.tasks[0]?.column.isDone).toBe(false);
  });
  it('moves within a column, clamps indexes and ignores missing targets', () => {
    const previous = fixture();
    expect(
      optimisticMove(previous, {
        taskId: 'a',
        columnId: 'todo',
        index: 100,
      })[0]?.tasks.map((t) => t.id),
    ).toEqual(['b', 'a']);
    expect(
      optimisticMove(previous, {
        taskId: 'b',
        columnId: 'todo',
        index: -5,
      })[0]?.tasks.map((t) => t.id),
    ).toEqual(['b', 'a']);
    expect(
      optimisticMove(previous, {
        taskId: 'missing',
        columnId: 'todo',
        index: 0,
      }),
    ).toBe(previous);
    expect(
      optimisticMove(previous, { taskId: 'a', columnId: 'missing', index: 0 }),
    ).toBe(previous);
  });
  it('calculates neighbors after removing the moving card', () => {
    const columns = fixture();
    expect(
      taskNeighbors(columns, { taskId: 'a', columnId: 'todo', index: 1 }),
    ).toEqual({ afterId: 'b', beforeId: undefined });
    expect(
      taskNeighbors(columns, { taskId: 'a', columnId: 'done', index: -1 }),
    ).toEqual({ afterId: undefined, beforeId: 'c' });
    expect(
      taskNeighbors(columns, { taskId: 'a', columnId: 'missing', index: 1 }),
    ).toEqual({ afterId: undefined, beforeId: undefined });
  });
});
describe('due date display', () => {
  const today = '2026-10-08';
  it('handles missing, overdue, today, future and completed dates', () => {
    expect(dueState({ dueDate: null, isDone: false, today })).toBeNull();
    expect(
      dueState({ dueDate: new Date('2026-10-07Z'), isDone: false, today }),
    ).toBe('overdue');
    expect(
      dueState({ dueDate: '2026-10-08T00:00:00Z', isDone: false, today }),
    ).toBe('today');
    expect(dueState({ dueDate: '2026-10-09', isDone: false, today })).toBe(
      'soon',
    );
    expect(dueState({ dueDate: '2026-10-07', isDone: true, today })).toBe(
      'future',
    );
  });
});
