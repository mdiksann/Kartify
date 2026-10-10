import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  db,
  actor,
  createDomainFixture,
  dataOf,
  type DomainFixture,
} from './board-fixture';
const { createTask, updateTask, deleteTask, moveTask } =
  await import('@/actions/task');
const { readBoard } = await import('@/lib/board-queries');
const { getTaskDetails } = await import('@/actions/board');
const { createProject } = await import('@/actions/project');
const { recordActivity } = await import('@/lib/activity');
let f: DomainFixture;
beforeEach(async () => {
  f = await createDomainFixture();
});
afterEach(async () => {
  await f.cleanup();
});
async function makeTask(title: string, columnId = f.columns[0]!.id) {
  return dataOf(await createTask({ ...f.scope, columnId, title }));
}
describe('task lifecycle and board queries', () => {
  it('lets every member create tasks in scoped columns, appends in order and audits creation', async () => {
    for (const user of [f.owner, f.admin, f.member]) {
      actor(user);
      const task = await makeTask(`Created by ${user.name}`);
      expect(task.createdBy).toBe(user.id);
      expect(task.priority).toBe('MEDIUM');
      expect(
        await db.activity.count({
          where: { taskId: task.id, type: 'TASK_CREATED' },
        }),
      ).toBe(1);
      expect(JSON.stringify(task)).not.toContain('passwordHash');
    }
    const board = await readBoard(f.scope);
    const tasks = board.columns[0]!.tasks;
    expect(tasks.map((task) => task.position)).toEqual([1, 2, 3]);
    expect(tasks.map((task) => task.title)).toEqual([
      'Created by owner',
      'Created by admin',
      'Created by member',
    ]);
    expect(board.columns[1]?.tasks).toEqual([]);
  });
  it('updates all fields with exactly the matching audit rows, skips no-ops and handles clearing', async () => {
    actor(f.member);
    const task = await makeTask('Before');
    const updated = dataOf(
      await updateTask({
        ...f.scope,
        taskId: task.id,
        title: ' After ',
        description: ' Description ',
        priority: 'URGENT',
        assigneeId: f.admin.id,
        dueDate: '2026-10-09',
      }),
    );
    expect(updated).toMatchObject({
      title: 'After',
      description: 'Description',
      priority: 'URGENT',
      assigneeId: f.admin.id,
    });
    expect(updated.dueDate?.toISOString()).toBe('2026-10-09T00:00:00.000Z');
    expect(
      (
        await db.activity.findMany({
          where: { taskId: task.id },
          orderBy: { createdAt: 'asc' },
        })
      ).map((row) => row.type),
    ).toEqual([
      'TASK_CREATED',
      'TASK_UPDATED',
      'TASK_PRIORITY_CHANGED',
      'TASK_ASSIGNED',
      'TASK_DUE_DATE_CHANGED',
    ]);
    dataOf(await updateTask({ ...f.scope, taskId: task.id, title: 'After' }));
    expect(await db.activity.count({ where: { taskId: task.id } })).toBe(5);
    expect(
      (await db.task.findUniqueOrThrow({ where: { id: task.id } })).priority,
    ).toBe('URGENT');
    dataOf(
      await updateTask({
        ...f.scope,
        taskId: task.id,
        assigneeId: null,
        dueDate: null,
        description: '',
      }),
    );
    expect(await db.activity.count({ where: { taskId: task.id } })).toBe(8);
  });
  it('rejects invalid data/assignees, anonymous/non-member access, foreign projects and columns', async () => {
    actor(f.owner);
    const task = await makeTask('Protected');
    const before = await db.activity.count({ where: { taskId: task.id } });
    for (const result of [
      await updateTask({
        ...f.scope,
        taskId: task.id,
        assigneeId: f.outsider.id,
      }),
      await createTask({
        ...f.scope,
        columnId: f.columns[0]!.id,
        title: 'Invalid assignment',
        assigneeId: f.outsider.id,
      }),
      await updateTask({ ...f.scope, taskId: task.id, dueDate: '2026-02-30' }),
      await createTask({
        ...f.scope,
        columnId: f.otherColumn.id,
        title: 'Foreign',
      }),
      await createTask({ ...f.scope, columnId: f.columns[0]!.id, title: '' }),
      await updateTask({
        slug: f.otherSlug,
        projectId: f.otherProject.id,
        taskId: task.id,
        title: 'Foreign',
      }),
      await deleteTask({
        slug: f.otherSlug,
        projectId: f.otherProject.id,
        taskId: task.id,
        confirmation: 'DELETE',
      }),
    ])
      expect(result.ok).toBe(false);
    for (const user of [f.outsider, null]) {
      actor(user);
      for (const result of [
        await createTask({
          ...f.scope,
          columnId: f.columns[0]!.id,
          title: 'Denied',
        }),
        await updateTask({ ...f.scope, taskId: task.id, title: 'Denied' }),
        await deleteTask({
          ...f.scope,
          taskId: task.id,
          confirmation: 'DELETE',
        }),
        await moveTask({
          ...f.scope,
          taskId: task.id,
          toColumnId: f.columns[1]!.id,
        }),
        await getTaskDetails({ ...f.scope, taskId: task.id }),
      ])
        expect(result.ok).toBe(false);
    }
    expect(
      (await db.task.findUniqueOrThrow({ where: { id: task.id } })).title,
    ).toBe('Protected');
    expect(await db.activity.count({ where: { taskId: task.id } })).toBe(
      before,
    );
  });
  it('lets Members delete only their own tasks and privileged actors delete any', async () => {
    actor(f.owner);
    const other = await makeTask('Owner task');
    actor(f.member);
    expect(
      await deleteTask({
        ...f.scope,
        taskId: other.id,
        confirmation: 'DELETE',
      }),
    ).toMatchObject({ ok: false, message: 'This action is not allowed.' });
    const own = await makeTask('Own task');
    dataOf(
      await deleteTask({ ...f.scope, taskId: own.id, confirmation: 'DELETE' }),
    );
    expect(await db.task.findUnique({ where: { id: own.id } })).toBeNull();
    actor(f.admin);
    dataOf(
      await deleteTask({
        ...f.scope,
        taskId: other.id,
        confirmation: 'DELETE',
      }),
    );
    expect(await db.activity.count({ where: { taskId: other.id } })).toBe(0);
  });
  it('rolls back mutations when audit insertion fails and rejects malformed activity payloads', async () => {
    actor(f.owner);
    const task = await makeTask('Audit atomicity');
    await expect(
      db.$transaction(async (tx) => {
        await tx.task.update({
          where: { id: task.id },
          data: { title: 'Partial' },
        });
        await recordActivity(tx, {
          taskId: task.id,
          actorId: f.owner.id,
          // @ts-expect-error Invalid activity payloads are rejected at compile time too.
          event: { type: 'TASK_CREATED', data: { title: 42 } },
        });
      }),
    ).rejects.toThrow();
    expect(
      (await db.task.findUniqueOrThrow({ where: { id: task.id } })).title,
    ).toBe('Audit atomicity');
  });
  it('scopes board/detail reads by workspace and includes ordered, safe task metadata', async () => {
    actor(f.member);
    const board = await readBoard(f.scope);
    expect(
      board.columns.every((column) => column.projectId === f.project.id),
    ).toBe(true);
    expect(JSON.stringify(board)).not.toContain('passwordHash');
    await expect(
      readBoard({ slug: f.slug, projectId: f.otherProject.id }),
    ).rejects.toThrow('not found');
    await expect(
      readBoard({ slug: f.otherSlug, projectId: f.otherProject.id }),
    ).rejects.toThrow('not found');
  });
  it('retries concurrent appends without duplicate positions or audit events', async () => {
    actor(f.owner);
    const project = dataOf(
      await createProject({ slug: f.slug, name: 'Concurrent board' }),
    );
    const column = await db.column.findFirstOrThrow({
      where: { projectId: project.id },
    });
    const results = await Promise.all(
      ['First', 'Second'].map((title) =>
        createTask({
          slug: f.slug,
          projectId: project.id,
          columnId: column.id,
          title,
        }),
      ),
    );
    const tasks = results.map(dataOf);
    expect(new Set(tasks.map((task) => task.position)).size).toBe(2);
    expect(tasks.map((task) => task.position).sort()).toEqual([1, 2]);
    expect(
      await db.activity.count({
        where: {
          taskId: { in: tasks.map((task) => task.id) },
          type: 'TASK_CREATED',
        },
      }),
    ).toBe(2);
  });
});
