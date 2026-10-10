import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  db,
  actor,
  createDomainFixture,
  dataOf,
  type DomainFixture,
} from './board-fixture';
const { createProject } = await import('@/actions/project');
const { createTask, moveTask } = await import('@/actions/task');
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
describe('task movement', () => {
  it('moves between columns and at head/middle/tail with unique positions and audited names', async () => {
    actor(f.member);
    const a = await makeTask('Move A', f.columns[1]!.id),
      b = await makeTask('Move B', f.columns[1]!.id),
      c = await makeTask('Move C', f.columns[1]!.id);
    dataOf(
      await moveTask({
        ...f.scope,
        taskId: c.id,
        toColumnId: f.columns[1]!.id,
        beforeId: a.id,
      }),
    );
    dataOf(
      await moveTask({
        ...f.scope,
        taskId: c.id,
        toColumnId: f.columns[1]!.id,
        afterId: a.id,
        beforeId: b.id,
      }),
    );
    dataOf(
      await moveTask({
        ...f.scope,
        taskId: a.id,
        toColumnId: f.columns[1]!.id,
      }),
    );
    expect(
      (
        await db.task.findMany({
          where: { columnId: f.columns[1]!.id },
          orderBy: { position: 'asc' },
        })
      ).map((row) => row.id),
    ).toEqual([c.id, b.id, a.id]);
    const moved = dataOf(
      await moveTask({
        ...f.scope,
        taskId: a.id,
        toColumnId: f.columns[2]!.id,
      }),
    );
    expect(moved.columnId).toBe(f.columns[2]!.id);
    const activity = await db.activity.findFirstOrThrow({
      where: { taskId: a.id, type: 'TASK_MOVED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity.data).toMatchObject({
      fromColumn: 'In Progress',
      toColumn: 'Done',
    });
    const rows = await db.task.findMany({
      where: { columnId: f.columns[1]!.id },
    });
    expect(new Set(rows.map((row) => row.position)).size).toBe(rows.length);
  });
  it('rejects cross-project, foreign-neighbor and non-adjacent moves without writes', async () => {
    actor(f.owner);
    const task = await makeTask('No partial move');
    const otherTask = await makeTask('Other task', f.columns[2]!.id);
    const before = await db.task.findUniqueOrThrow({ where: { id: task.id } });
    const activityCount = await db.activity.count({
      where: { taskId: task.id },
    });
    for (const result of [
      await moveTask({
        ...f.scope,
        taskId: task.id,
        toColumnId: f.otherColumn.id,
      }),
      await moveTask({
        ...f.scope,
        taskId: task.id,
        toColumnId: f.columns[0]!.id,
        beforeId: otherTask.id,
      }),
      await moveTask({
        ...f.scope,
        taskId: task.id,
        toColumnId: f.columns[0]!.id,
        beforeId: task.id,
      }),
      await moveTask({ ...f.scope, taskId: task.id, toColumnId: 'bad' }),
    ])
      expect(result.ok).toBe(false);
    expect(await db.task.findUniqueOrThrow({ where: { id: task.id } })).toEqual(
      before,
    );
    expect(await db.activity.count({ where: { taskId: task.id } })).toBe(
      activityCount,
    );
  });
  it('renumbers a exhausted task gap atomically before a middle move', async () => {
    actor(f.owner);
    const project = dataOf(
      await createProject({ slug: f.slug, name: 'Precision project' }),
    );
    const column = await db.column.findFirstOrThrow({
      where: { projectId: project.id },
    });
    const scope = { slug: f.slug, projectId: project.id };
    const a = dataOf(
      await createTask({ ...scope, columnId: column.id, title: 'A' }),
    );
    const b = dataOf(
      await createTask({ ...scope, columnId: column.id, title: 'B' }),
    );
    const c = dataOf(
      await createTask({ ...scope, columnId: column.id, title: 'C' }),
    );
    await db.task.update({
      where: { id: b.id },
      data: { position: 1.000000000000001 },
    });
    dataOf(
      await moveTask({
        ...scope,
        taskId: c.id,
        toColumnId: column.id,
        afterId: a.id,
        beforeId: b.id,
      }),
    );
    expect(
      (
        await db.task.findMany({
          where: { columnId: column.id },
          orderBy: { position: 'asc' },
        })
      ).map((row) => row.id),
    ).toEqual([a.id, c.id, b.id]);
  });
});
