import { describe, expect, it } from 'vitest';
import {
  createTaskSchema,
  updateTaskSchema,
  dateSchema,
  moveTaskSchema,
} from '@/lib/validation/task';
import {
  createProjectSchema,
  renameProjectSchema,
  deleteProjectSchema,
} from '@/lib/validation/project';
import {
  createColumnSchema,
  reorderColumnSchema,
  setColumnDoneSchema,
  deleteColumnSchema,
} from '@/lib/validation/column';
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
  taskPageSchema,
} from '@/lib/validation/comment';
import { activityPayloadSchema } from '@/lib/validation/activity';
import { activitySentence, relativeTime } from '@/lib/activity-format';
import { taskChangeEvents } from '@/lib/task-changes';
const id = 'cm123456789012345678901234';
const scope = { slug: 'alpha', projectId: id, columnId: id, taskId: id };
describe('shared domain schemas', () => {
  it('normalizes task fields and accepts exact limits', () => {
    expect(createTaskSchema.parse({ ...scope, title: ' Task ' })).toMatchObject(
      { title: 'Task', priority: 'MEDIUM' },
    );
    expect(
      createTaskSchema.safeParse({
        ...scope,
        title: 't'.repeat(200),
        description: 'd'.repeat(10_000),
        dueDate: '2024-02-29',
      }).success,
    ).toBe(true);
    expect(
      updateTaskSchema.parse({
        slug: scope.slug,
        projectId: id,
        taskId: id,
        title: 'New',
      }),
    ).not.toHaveProperty('priority');
  });
  it.each([
    { title: '' },
    { title: ' ' },
    { title: 't'.repeat(201) },
    { title: 3 },
    { description: 'd'.repeat(10_001) },
    { priority: 'BAD' },
    { dueDate: '2025-02-29' },
    { columnId: 'bad' },
    { assigneeId: 'bad' },
    { projectId: 'bad' },
  ])('rejects invalid task boundaries %o', (patch) => {
    expect(
      createTaskSchema.safeParse({ ...scope, title: 'Task', ...patch }).success,
    ).toBe(false);
  });
  it.each([
    '2026-02-30',
    '2026-13-01',
    '2026-00-01',
    '2026-01-00',
    '2026-1-1',
    'not a date',
    '0000-01-01',
    '2026-10-08T00:00:00Z',
  ])('rejects invalid date %s', (value) => {
    expect(dateSchema.safeParse(value).success).toBe(false);
  });
  it('accepts null clearing and rejects malformed movement', () => {
    expect(
      updateTaskSchema.safeParse({
        ...scope,
        assigneeId: null,
        dueDate: null,
        description: null,
      }).success,
    ).toBe(true);
    expect(
      moveTaskSchema.safeParse({ ...scope, toColumnId: 'bad' }).success,
    ).toBe(false);
    expect(
      moveTaskSchema.safeParse({ ...scope, toColumnId: id, beforeId: id })
        .success,
    ).toBe(true);
  });
  it('validates project and column names/scopes/confirmations', () => {
    for (const schema of [
      createProjectSchema,
      renameProjectSchema,
      createColumnSchema,
    ]) {
      expect(schema.safeParse({ ...scope, name: 'n'.repeat(80) }).success).toBe(
        true,
      );
      for (const name of ['', ' ', 'n'.repeat(81), 123])
        expect(schema.safeParse({ ...scope, name }).success).toBe(false);
    }
    expect(
      createProjectSchema.safeParse({
        ...scope,
        name: 'Project',
        description: 'd'.repeat(10_001),
      }).success,
    ).toBe(false);
    expect(
      reorderColumnSchema.safeParse({ ...scope, beforeId: 'bad' }).success,
    ).toBe(false);
    expect(
      setColumnDoneSchema.safeParse({ ...scope, isDone: 'true' }).success,
    ).toBe(false);
    for (const schema of [deleteProjectSchema, deleteColumnSchema]) {
      expect(
        schema.safeParse({ ...scope, confirmation: 'DELETE' }).success,
      ).toBe(true);
      expect(schema.safeParse({ ...scope, confirmation: '' }).success).toBe(
        false,
      );
    }
  });
  it('enforces comment bodies, scopes and bounded pagination cursors', () => {
    expect(
      createCommentSchema.parse({ ...scope, body: ' Hello ' }),
    ).toMatchObject({ body: 'Hello' });
    expect(
      createCommentSchema.safeParse({ ...scope, body: 'b'.repeat(5000) })
        .success,
    ).toBe(true);
    for (const body of ['', ' ', 'b'.repeat(5001), 123])
      expect(createCommentSchema.safeParse({ ...scope, body }).success).toBe(
        false,
      );
    expect(
      updateCommentSchema.safeParse({ ...scope, commentId: id, body: 'edited' })
        .success,
    ).toBe(true);
    expect(
      deleteCommentSchema.safeParse({
        ...scope,
        commentId: id,
        confirmation: 'DELETE',
      }).success,
    ).toBe(true);
    expect(taskPageSchema.safeParse({ ...scope, cursor: 'bad' }).success).toBe(
      false,
    );
  });
});
describe('auditable task changes and sentences', () => {
  const before = {
    title: 'Old',
    description: null,
    priority: 'MEDIUM' as const,
    assigneeId: null,
    dueDate: null,
    assignee: null,
  };
  it('builds one matching event per change, groups text fields and excludes no-ops', () => {
    const events = taskChangeEvents(
      before,
      {
        ...scope,
        title: 'New',
        description: 'Description',
        priority: 'URGENT',
        assigneeId: id,
        dueDate: '2026-10-09',
      },
      'Alex',
    );
    expect(events.map((event) => event.type)).toEqual([
      'TASK_UPDATED',
      'TASK_PRIORITY_CHANGED',
      'TASK_ASSIGNED',
      'TASK_DUE_DATE_CHANGED',
    ]);
    expect(events[0]?.data).toEqual({
      changes: [
        { field: 'title', from: 'Old', to: 'New' },
        { field: 'description', from: null, to: 'Description' },
      ],
    });
    for (const event of events)
      expect(activityPayloadSchema.safeParse(event).success).toBe(true);
    expect(
      taskChangeEvents(
        before,
        {
          ...scope,
          title: 'Old',
          description: '',
          priority: 'MEDIUM',
          assigneeId: null,
          dueDate: null,
        },
        null,
      ),
    ).toEqual([]);
  });
  it('records assignment and date clearing with previous values', () => {
    const events = taskChangeEvents(
      {
        ...before,
        assigneeId: id,
        assignee: { name: 'Alex' },
        dueDate: new Date('2026-10-09T00:00:00Z'),
      },
      { ...scope, assigneeId: null, dueDate: null },
      null,
    );
    expect(events).toEqual([
      { type: 'TASK_ASSIGNED', data: { from: 'Alex', to: null } },
      { type: 'TASK_DUE_DATE_CHANGED', data: { from: '2026-10-09', to: null } },
    ]);
  });
  it('formats every event and safely rejects malformed JSON', () => {
    const events = [
      { type: 'TASK_CREATED', data: { title: 'Task' } },
      {
        type: 'TASK_MOVED',
        data: { fromColumn: 'To Do', toColumn: 'Done', position: 1 },
      },
      ...taskChangeEvents(
        before,
        {
          ...scope,
          title: 'New',
          priority: 'HIGH',
          assigneeId: id,
          dueDate: '2026-10-09',
        },
        'Alex',
      ),
      ...(['COMMENT_ADDED', 'COMMENT_UPDATED', 'COMMENT_DELETED'] as const).map(
        (type) => ({ type, data: { commentId: id } }),
      ),
    ];
    for (const event of events)
      expect(activitySentence(event)).not.toContain('unavailable');
    expect(
      activitySentence({
        type: 'TASK_ASSIGNED',
        data: { from: 'Alex', to: null },
      }),
    ).toBe('removed the assignee');
    expect(
      activitySentence({
        type: 'TASK_DUE_DATE_CHANGED',
        data: { from: '2026-10-09', to: null },
      }),
    ).toBe('removed the due date');
    expect(activitySentence({ type: 'INVALID', data: {} })).toContain(
      'unavailable',
    );
    expect(
      activityPayloadSchema.safeParse({ type: 'TASK_CREATED', data: {} })
        .success,
    ).toBe(false);
  });
  it('uses deterministic relative time with a caller-provided clock', () => {
    const now = '2026-10-08T12:00:00Z';
    expect(relativeTime(now, now)).toBe('just now');
    expect(relativeTime('2026-10-08T11:59:00Z', now)).toBe('1m ago');
    expect(relativeTime('2026-10-08T10:00:00Z', now)).toBe('2h ago');
    expect(relativeTime('2026-10-06T12:00:00Z', now)).toBe('2d ago');
  });
});
