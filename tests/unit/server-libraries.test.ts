import { beforeEach, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AuthError, NotFoundError } from '@/lib/errors';

const mocks = vi.hoisted(() => {
  const model = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  });
  return {
    db: {
      project: model(),
      column: model(),
      task: model(),
      workspace: model(),
      workspaceMember: model(),
      comment: model(),
      activity: model(),
      $transaction: vi.fn(),
    },
    user: vi.fn(),
    revalidate: vi.fn(),
  };
});
vi.mock('@/lib/db', () => ({ db: mocks.db }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.user }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-request-id': 'unit' }),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  notFound: () => {
    throw new Error('404');
  },
}));
import {
  workspaceAccess,
  workspacePageAccess,
  userWorkspaces,
} from '@/lib/workspace-access';
import {
  requireProject,
  requireColumn,
  requireTask,
} from '@/lib/project-access';
import { recordActivity } from '@/lib/activity';
import { boardMutation } from '@/lib/board-mutation';
import {
  readBoard,
  readComments,
  readActivities,
  readTaskDetails,
} from '@/lib/board-queries';
import { readSearch } from '@/lib/search';
import { readDashboard } from '@/lib/dashboard';
import { cn } from '@/lib/utils';
const id = 'cm123456789012345678901234';
const scope = { slug: 'team', projectId: id, taskId: id };
const tx = mocks.db as unknown as Prisma.TransactionClient;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id, name: 'Alex' });
  mocks.db.workspace.findUnique.mockResolvedValue({ id, slug: 'team' });
  mocks.db.workspaceMember.findUnique.mockResolvedValue({
    role: 'OWNER',
    userId: id,
  });
  mocks.db.workspaceMember.findMany.mockResolvedValue([
    { user: { id, name: 'Alex' } },
  ]);
  mocks.db.project.findFirst.mockResolvedValue({ id });
  mocks.db.column.findFirst.mockResolvedValue({ id });
  mocks.db.task.findFirst.mockResolvedValue({ id });
  for (const model of [
    mocks.db.project,
    mocks.db.column,
    mocks.db.task,
    mocks.db.comment,
    mocks.db.activity,
  ])
    model.findMany.mockResolvedValue([]);
  mocks.db.$transaction.mockImplementation(async (operation) =>
    typeof operation === 'function'
      ? operation(mocks.db)
      : Promise.all(operation),
  );
});
it('scopes access, hides missing resources and maps page denials', async () => {
  expect(
    (await workspaceAccess('team', { roles: ['OWNER'], client: tx })).member
      .role,
  ).toBe('OWNER');
  await userWorkspaces(id);
  expect(mocks.db.workspace.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { members: { some: { userId: id } } } }),
  );
  await requireProject(tx, { projectId: id, workspaceId: id });
  await requireColumn(tx, { columnId: id, projectId: id });
  await requireTask(tx, { ...scope, workspaceId: id });
  for (const [model, operation] of [
    [mocks.db.task, () => requireTask(tx, { ...scope, workspaceId: id })],
    [mocks.db.column, () => requireColumn(tx, { columnId: id, projectId: id })],
    [
      mocks.db.project,
      () => requireProject(tx, { projectId: id, workspaceId: id }),
    ],
  ] as const) {
    model.findFirst.mockResolvedValueOnce(null);
    await expect(operation()).rejects.toBeInstanceOf(NotFoundError);
  }
  mocks.db.workspace.findUnique.mockResolvedValueOnce(null);
  await expect(workspaceAccess('team')).rejects.toBeInstanceOf(NotFoundError);
  mocks.db.workspace.findUnique.mockResolvedValueOnce(null);
  await expect(workspacePageAccess('team')).rejects.toThrow('404');
  await expect(workspacePageAccess('../bad')).rejects.toThrow('404');
  mocks.db.workspaceMember.findUnique.mockRejectedValueOnce(
    new Error('database unavailable'),
  );
  await expect(workspacePageAccess('team')).rejects.toThrow(
    'database unavailable',
  );
  mocks.user.mockResolvedValue(null);
  await expect(workspaceAccess('team')).rejects.toBeInstanceOf(AuthError);
  await expect(workspacePageAccess('team')).rejects.toThrow(
    'redirect:/login?next=%2Fw%2Fteam',
  );
});
it('validates activity payloads before writing', async () => {
  await recordActivity(tx, {
    taskId: id,
    actorId: id,
    event: { type: 'TASK_CREATED', data: { title: 'Task' } },
  });
  expect(mocks.db.activity.create).toHaveBeenCalledWith({
    data: {
      taskId: id,
      actorId: id,
      type: 'TASK_CREATED',
      data: { title: 'Task' },
    },
  });
  await expect(
    recordActivity(tx, {
      taskId: 'bad',
      actorId: id,
      event: { type: 'TASK_CREATED', data: { title: 'Task' } },
    }),
  ).rejects.toThrow();
  expect(mocks.db.activity.create).toHaveBeenCalledTimes(1);
});
it('revalidates only successful mutations and retries serialization conflicts at most three times', async () => {
  const schema = z.object({ slug: z.string() });
  const operation = vi.fn().mockResolvedValue('saved');
  const conflict = new Prisma.PrismaClientKnownRequestError('conflict', {
    code: 'P2034',
    clientVersion: '6',
  });
  mocks.db.$transaction
    .mockRejectedValueOnce(conflict)
    .mockRejectedValueOnce(conflict);
  expect(
    await boardMutation(schema, { slug: 'team' }, operation, ['OWNER']),
  ).toEqual({ ok: true, data: 'saved' });
  expect(mocks.db.$transaction).toHaveBeenCalledTimes(3);
  expect(mocks.revalidate).toHaveBeenCalledOnce();
  mocks.revalidate.mockClear();
  mocks.db.$transaction.mockRejectedValue(conflict);
  expect(
    await boardMutation(schema, { slug: 'team' }, operation),
  ).toMatchObject({
    ok: false,
    message: 'Another change happened. Try again.',
  });
  expect(mocks.revalidate).not.toHaveBeenCalled();
  expect(await boardMutation(schema, {}, operation)).toMatchObject({
    ok: false,
    field: 'slug',
  });
  mocks.db.$transaction.mockRejectedValueOnce(new NotFoundError());
  expect(
    await boardMutation(schema, { slug: 'team' }, operation),
  ).toMatchObject({
    ok: false,
    message: 'The requested resource was not found.',
  });
});
it('bounds comment/activity pages, rejects foreign cursors and parses activity JSON', async () => {
  expect((await readBoard(scope)).columns).toEqual([]);
  for (const [model, read] of [
    [mocks.db.comment, readComments],
    [mocks.db.activity, readActivities],
  ] as const) {
    expect((await read(scope)).nextCursor).toBeNull();
    model.findMany.mockResolvedValue(
      Array.from({ length: 51 }, (_, index) => ({
        id: String(index),
        type: 'TASK_CREATED',
        data: { title: 'Task' },
      })),
    );
    model.findFirst.mockResolvedValue({
      id,
      createdAt: new Date('2026-01-01'),
    });
    const page = await read({ ...scope, cursor: id });
    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).toBe('49');
    model.findFirst.mockResolvedValueOnce(null);
    await expect(read({ ...scope, cursor: id })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  }
  mocks.db.comment.findFirst.mockResolvedValue({ id, body: 'highlight' });
  expect(
    (await readTaskDetails({ ...scope, commentId: id })).highlightedComment,
  ).toMatchObject({ body: 'highlight' });
  expect((await readTaskDetails(scope)).highlightedComment).toBeNull();
});
it('normalizes foreign filters, escapes LIKE characters and preserves valid AND filters', async () => {
  mocks.db.column.findMany.mockResolvedValue([{ id }]);
  mocks.db.task.count.mockResolvedValue(0);
  expect(
    (
      await readSearch('team', {
        assignee: 'cm223456789012345678901234',
        column: 'cm223456789012345678901234',
      })
    ).filters,
  ).toMatchObject({ assignee: undefined, column: undefined });
  for (const assignee of [id, 'unassigned']) {
    await readSearch('team', {
      q: '100%_\\',
      assignee,
      column: id,
      priority: 'HIGH',
      from: '2026-01-01',
      to: '2026-01-02',
    });
    expect(mocks.db.task.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          project: { workspaceId: id },
          assigneeId: assignee === id ? id : null,
          columnId: id,
          priority: 'HIGH',
          OR: [
            { title: { contains: '100\\%\\_\\\\', mode: 'insensitive' } },
            { description: { contains: '100\\%\\_\\\\', mode: 'insensitive' } },
          ],
        }),
      }),
    );
  }
  await readSearch('team', { from: '2026-01-01' });
  await readSearch('team', { to: '2026-01-02' });
});
it('computes grouped dashboard progress and defaults empty project counts', async () => {
  mocks.db.project.findMany.mockResolvedValue([
    { id, name: 'Project', columns: [{ id, isDone: true }] },
    { id: 'empty', name: 'Empty', columns: [] },
  ]);
  mocks.db.task.groupBy
    .mockResolvedValueOnce([
      { projectId: id, columnId: id, _count: { _all: 2 } },
      { projectId: id, columnId: 'todo', _count: { _all: 2 } },
    ])
    .mockResolvedValueOnce([{ projectId: id, _count: { _all: 1 } }]);
  mocks.db.task.count.mockResolvedValue(0);
  const result = await readDashboard('team', new Date('2026-01-02'));
  expect(result.projects).toMatchObject([
    { total: 4, done: 2, percent: 50, overdue: 1 },
    { total: 0, done: 0, percent: 0, overdue: 0 },
  ]);
  expect(cn('p-2', false, 'p-4')).toBe('p-4');
});
