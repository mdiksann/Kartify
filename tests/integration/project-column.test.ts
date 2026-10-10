import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  db,
  actor,
  createDomainFixture,
  dataOf,
  type DomainFixture,
} from './board-fixture';
const {
  createProject,
  renameProject,
  deleteProject,
  listProjects,
  createProjectForm,
} = await import('@/actions/project');
const {
  createColumn,
  renameColumn,
  reorderColumn,
  setColumnDone,
  deleteColumn,
} = await import('@/actions/column');
const { createTask } = await import('@/actions/task');
const { createComment } = await import('@/actions/comment');
let f: DomainFixture;
beforeEach(async () => {
  f = await createDomainFixture();
});
afterEach(async () => {
  await f.cleanup();
});
describe('projects and columns', () => {
  it('creates ordered projects with default done columns and allows members to list', async () => {
    actor(f.owner);
    const second = dataOf(
      await createProject({
        slug: f.slug,
        name: ' Second ',
        description: ' Test ',
      }),
    );
    expect(second.name).toBe('Second');
    expect(second.position).toBeGreaterThan(f.project.position);
    expect(
      (
        await db.column.findMany({
          where: { projectId: second.id },
          orderBy: { position: 'asc' },
        })
      ).map(({ name, isDone }) => ({ name, isDone })),
    ).toEqual([
      { name: 'To Do', isDone: false },
      { name: 'In Progress', isDone: false },
      { name: 'Done', isDone: true },
    ]);
    actor(f.member);
    const rows = dataOf(await listProjects({ slug: f.slug }));
    expect(rows.map((row) => row.id)).toEqual([f.project.id, second.id]);
    expect(rows.some((row) => row.workspaceId === f.otherId)).toBe(false);
  });
  it('supports Admin project/column mutations and persists reorder/done state', async () => {
    actor(f.admin);
    const project = dataOf(
      await createProject({ slug: f.slug, name: 'Admin project' }),
    );
    expect(
      dataOf(
        await renameProject({
          slug: f.slug,
          projectId: project.id,
          name: 'Renamed',
        }),
      ).name,
    ).toBe('Renamed');
    const column = dataOf(await createColumn({ ...f.scope, name: ' Review ' }));
    expect(column.name).toBe('Review');
    expect(
      dataOf(
        await renameColumn({
          ...f.scope,
          columnId: column.id,
          name: 'Quality review',
        }),
      ).name,
    ).toBe('Quality review');
    expect(
      dataOf(
        await setColumnDone({ ...f.scope, columnId: column.id, isDone: true }),
      ).isDone,
    ).toBe(true);
    dataOf(
      await reorderColumn({
        ...f.scope,
        columnId: column.id,
        beforeId: f.columns[0]!.id,
      }),
    );
    const persisted = await db.column.findMany({
      where: { projectId: f.project.id },
      orderBy: { position: 'asc' },
    });
    expect(persisted[0]?.id).toBe(column.id);
    expect(new Set(persisted.map((row) => row.position)).size).toBe(
      persisted.length,
    );
    dataOf(
      await deleteColumn({
        ...f.scope,
        columnId: column.id,
        confirmation: 'DELETE',
      }),
    );
    dataOf(
      await deleteProject({
        slug: f.slug,
        projectId: project.id,
        confirmation: 'DELETE',
      }),
    );
  });
  it('denies every project/column mutation to Members and anonymous users', async () => {
    for (const user of [f.member, null]) {
      actor(user);
      const inputs = [
        await createProject({ slug: f.slug, name: 'Denied' }),
        await renameProject({ ...f.scope, name: 'Denied' }),
        await deleteProject({ ...f.scope, confirmation: 'DELETE' }),
        await createColumn({ ...f.scope, name: 'Denied' }),
        await renameColumn({
          ...f.scope,
          columnId: f.columns[0]!.id,
          name: 'Denied',
        }),
        await reorderColumn({ ...f.scope, columnId: f.columns[0]!.id }),
        await setColumnDone({
          ...f.scope,
          columnId: f.columns[0]!.id,
          isDone: true,
        }),
        await deleteColumn({
          ...f.scope,
          columnId: f.columns[0]!.id,
          confirmation: 'DELETE',
        }),
      ];
      for (const result of inputs) {
        expect(result.ok).toBe(false);
        if (!result.ok)
          expect(result.message).toContain(user ? 'not allowed' : 'log in');
      }
    }
  });
  it('rejects foreign scopes and malformed names/IDs/confirmations without modifying data', async () => {
    actor(f.owner);
    for (const result of [
      await renameProject({
        slug: f.slug,
        projectId: f.otherProject.id,
        name: 'Foreign',
      }),
      await deleteProject({
        slug: f.slug,
        projectId: f.otherProject.id,
        confirmation: 'DELETE',
      }),
      await createColumn({
        slug: f.slug,
        projectId: f.otherProject.id,
        name: 'Foreign',
      }),
      await renameColumn({
        ...f.scope,
        columnId: f.otherColumn.id,
        name: 'Foreign',
      }),
      await reorderColumn({ ...f.scope, columnId: f.otherColumn.id }),
      await setColumnDone({
        ...f.scope,
        columnId: f.otherColumn.id,
        isDone: true,
      }),
      await deleteColumn({
        ...f.scope,
        columnId: f.otherColumn.id,
        confirmation: 'DELETE',
      }),
    ]) {
      expect(result).toMatchObject({
        ok: false,
        message: 'The requested resource was not found.',
      });
    }
    for (const result of [
      await createProject({ slug: f.slug, name: '' }),
      await renameProject({ ...f.scope, name: 'n'.repeat(81) }),
      await createColumn({ ...f.scope, name: '' }),
      await reorderColumn({ ...f.scope, columnId: 'bad' }),
      await deleteColumn({
        ...f.scope,
        columnId: f.columns[0]!.id,
        confirmation: '',
      }),
      await deleteProject({ ...f.scope, confirmation: '' }),
    ])
      expect(result.ok).toBe(false);
    actor(f.outsider);
    expect((await listProjects({ slug: f.slug })).ok).toBe(false);
    expect((await createProject({ slug: f.slug, name: 'Denied' })).ok).toBe(
      false,
    );
    expect(
      (await db.project.findUniqueOrThrow({ where: { id: f.otherProject.id } }))
        .name,
    ).toBe('Other board');
  });
  it('rejects stale/non-adjacent reorder neighbors and renumbers an exhausted column gap', async () => {
    actor(f.owner);
    const [a, b, c] = f.columns;
    expect(
      (
        await reorderColumn({
          ...f.scope,
          columnId: c!.id,
          beforeId: a!.id,
          afterId: b!.id,
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await reorderColumn({
          ...f.scope,
          columnId: c!.id,
          beforeId: f.otherColumn.id,
        })
      ).ok,
    ).toBe(false);
    await db.column.update({
      where: { id: b!.id },
      data: { position: 1.000000000000001 },
    });
    dataOf(
      await reorderColumn({
        ...f.scope,
        columnId: c!.id,
        beforeId: b!.id,
        afterId: a!.id,
      }),
    );
    const rows = await db.column.findMany({
      where: { projectId: f.project.id },
      orderBy: { position: 'asc' },
    });
    expect(rows.map((row) => row.id)).toEqual([a!.id, c!.id, b!.id]);
    expect(new Set(rows.map((row) => row.position)).size).toBe(3);
  });
  it.each(['column', 'project'] as const)(
    'cascades %s deletion through tasks, comments and activity, leaving other workspaces intact',
    async (kind) => {
      actor(f.owner);
      const project = dataOf(
        await createProject({ slug: f.slug, name: `Cascade ${kind}` }),
      );
      const column = await db.column.findFirstOrThrow({
        where: { projectId: project.id },
      });
      const task = dataOf(
        await createTask({
          slug: f.slug,
          projectId: project.id,
          columnId: column.id,
          title: 'Cascade task',
        }),
      );
      const comment = dataOf(
        await createComment({
          slug: f.slug,
          projectId: project.id,
          taskId: task.id,
          body: 'Cascade comment',
        }),
      );
      dataOf(
        kind === 'column'
          ? await deleteColumn({
              slug: f.slug,
              projectId: project.id,
              columnId: column.id,
              confirmation: 'DELETE',
            })
          : await deleteProject({
              slug: f.slug,
              projectId: project.id,
              confirmation: 'DELETE',
            }),
      );
      expect(await db.task.findUnique({ where: { id: task.id } })).toBeNull();
      expect(
        await db.comment.findUnique({ where: { id: comment.id } }),
      ).toBeNull();
      expect(await db.activity.count({ where: { taskId: task.id } })).toBe(0);
      expect(
        await db.column.findUnique({ where: { id: column.id } }),
      ).toBeNull();
      expect(
        await db.project.findUnique({ where: { id: f.otherProject.id } }),
      ).not.toBeNull();
    },
  );
  it('wires the create form through the same validated action', async () => {
    actor(f.admin);
    const form = new FormData();
    form.set('slug', f.slug);
    form.set('name', 'Form project');
    expect(await createProjectForm(null, form)).toEqual({
      ok: true,
      data: undefined,
    });
    actor(f.member);
    expect(await createProjectForm(null, form)).toMatchObject({
      ok: false,
      message: 'This action is not allowed.',
    });
  });
});
