import { beforeAll, afterAll, expect, it } from 'vitest';
import {
  db,
  actor,
  createDomainFixture,
  dataOf,
  type DomainFixture,
} from './board-fixture';
const { createTask, updateTask } = await import('@/actions/task');
const { updateWorkspaceAppearance } = await import('@/actions/workspace');
const { readBoard } = await import('@/lib/board-queries');
let f: DomainFixture;
beforeAll(async () => {
  f = await createDomainFixture();
});
afterAll(async () => {
  actor(f.owner);
  await f.cleanup();
});
it('persists date ranges, rejects partial edits against the stored counterpart and records changes atomically', async () => {
  actor(f.member);
  const task = dataOf(
    await createTask({
      ...f.scope,
      columnId: f.columns[0]!.id,
      title: 'Scheduled',
      startDate: '2026-10-08',
      dueDate: '2026-10-10',
    }),
  );
  expect(task.startDate?.toISOString()).toBe('2026-10-08T00:00:00.000Z');
  for (const patch of [{ startDate: '2026-10-11' }, { dueDate: '2026-10-07' }])
    expect(
      await updateTask({ ...f.scope, taskId: task.id, ...patch }),
    ).toMatchObject({ ok: false, field: 'dueDate' });
  expect(await db.activity.count({ where: { taskId: task.id } })).toBe(1);
  const saved = await db.task.findUniqueOrThrow({ where: { id: task.id } });
  expect(saved.startDate).toEqual(task.startDate);
  expect(saved.dueDate).toEqual(task.dueDate);
  dataOf(
    await updateTask({ ...f.scope, taskId: task.id, startDate: '2026-10-09' }),
  );
  expect(
    await db.activity.findFirst({
      where: { taskId: task.id, type: 'TASK_UPDATED' },
    }),
  ).toMatchObject({
    data: {
      changes: [{ field: 'startDate', from: '2026-10-08', to: '2026-10-09' }],
    },
  });
  expect(
    (await readBoard(f.scope)).columns
      .flatMap((c) => c.tasks)
      .find((t) => t.id === task.id)
      ?.startDate?.toISOString(),
  ).toBe('2026-10-09T00:00:00.000Z');
  expect(
    await updateTask({
      ...f.scope,
      projectId: f.otherProject.id,
      taskId: task.id,
      startDate: null,
    }),
  ).toMatchObject({ ok: false });
  dataOf(await updateTask({ ...f.scope, taskId: task.id, startDate: null }));
  expect(
    (await db.task.findUniqueOrThrow({ where: { id: task.id } })).startDate,
  ).toBeNull();
});
it('allows only Owner/Admin to save a validated background and shares it through workspace reads', async () => {
  actor(f.owner);
  dataOf(await updateWorkspaceAppearance({ slug: f.slug, background: 'mint' }));
  actor(f.admin);
  dataOf(
    await updateWorkspaceAppearance({ slug: f.slug, background: 'lavender' }),
  );
  actor(f.member);
  expect(
    await updateWorkspaceAppearance({ slug: f.slug, background: 'peach' }),
  ).toMatchObject({ ok: false });
  actor(f.outsider);
  expect(
    await updateWorkspaceAppearance({ slug: f.slug, background: 'peach' }),
  ).toMatchObject({ ok: false });
  actor(null);
  expect(
    await updateWorkspaceAppearance({ slug: f.slug, background: 'peach' }),
  ).toMatchObject({ ok: false });
  actor(f.owner);
  expect(
    await updateWorkspaceAppearance({
      slug: f.slug,
      background: 'url(example)',
    }),
  ).toMatchObject({ ok: false });
  expect(
    (await db.workspace.findUniqueOrThrow({ where: { slug: f.slug } }))
      .background,
  ).toBe('lavender');
  expect(
    (await db.workspace.findUniqueOrThrow({ where: { slug: f.otherSlug } }))
      .background,
  ).toBe('blue');
});
