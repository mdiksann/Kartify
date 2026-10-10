import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  db,
  actor,
  createDomainFixture,
  dataOf,
  type DomainFixture,
} from './board-fixture';
const { readSearch } = await import('@/lib/search');
const { readDashboard } = await import('@/lib/dashboard');
const { createTask } = await import('@/actions/task');
const { createProject } = await import('@/actions/project');
let f: DomainFixture;
let tasks: Awaited<ReturnType<typeof db.task.findMany>>;
beforeEach(async () => {
  f = await createDomainFixture();
  actor(f.owner);
  const titles = [
    'Payment API',
    'Other work',
    'Completed payment',
    'Literal 100%_back\\slash',
  ];
  tasks = [];
  for (const [i, title] of titles.entries())
    tasks.push(
      dataOf(
        await createTask({
          ...f.scope,
          columnId: f.columns[i === 2 ? 2 : 0]!.id,
          title,
          description: i === 1 ? 'PAYMENT refactor' : null,
          priority: i === 0 ? 'URGENT' : i === 1 ? 'HIGH' : 'LOW',
          assigneeId: i < 2 ? f.member.id : null,
          dueDate:
            i === 0
              ? '2026-10-07'
              : i === 1
                ? '2026-10-08'
                : i === 2
                  ? '2026-10-01'
                  : null,
        }),
      ),
    );
  dataOf(
    await createTask({
      slug: f.otherSlug,
      projectId: f.otherProject.id,
      columnId: f.otherColumn.id,
      title: 'Payment in foreign workspace',
      priority: 'URGENT',
      dueDate: '2026-10-01',
      assigneeId: f.owner.id,
    }),
  );
});
afterEach(async () => {
  await f?.cleanup();
});
describe('workspace search and filters', () => {
  it('matches case-insensitive title OR description and isolates the workspace', async () => {
    actor(f.member);
    const result = await readSearch(f.slug, { q: 'pAyMeNt' });
    expect(result.items.map((t) => t.title)).toEqual([
      'Payment API',
      'Other work',
      'Completed payment',
    ]);
    expect(result.count).toBe(3);
    expect(result.columns.every((c) => c.project.name !== 'Other board')).toBe(
      true,
    );
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });
  it('returns the full scoped list for empty/whitespace queries and literal LIKE characters', async () => {
    actor(f.admin);
    for (const q of ['', '  '])
      expect((await readSearch(f.slug, { q })).count).toBe(4);
    expect(
      (await readSearch(f.slug, { q: '100%_back\\slash' })).items.map(
        (t) => t.title,
      ),
    ).toEqual(['Literal 100%_back\\slash']);
    expect((await readSearch(f.slug, { q: 'no match' })).count).toBe(0);
  });
  it('applies each filter and AND combinations with inclusive date boundaries', async () => {
    actor(f.owner);
    expect((await readSearch(f.slug, { assignee: f.member.id })).count).toBe(2);
    expect((await readSearch(f.slug, { assignee: 'unassigned' })).count).toBe(
      2,
    );
    expect(
      (await readSearch(f.slug, { priority: 'URGENT' })).items[0]?.id,
    ).toBe(tasks[0]?.id);
    expect((await readSearch(f.slug, { column: f.columns[2]!.id })).count).toBe(
      1,
    );
    expect(
      (await readSearch(f.slug, { from: '2026-10-07', to: '2026-10-08' }))
        .count,
    ).toBe(2);
    expect((await readSearch(f.slug, { from: '2026-10-08' })).count).toBe(1);
    expect((await readSearch(f.slug, { to: '2026-10-01' })).count).toBe(1);
    const combined = {
      q: 'payment',
      assignee: f.member.id,
      priority: 'HIGH',
      column: f.columns[0]!.id,
      from: '2026-10-08',
      to: '2026-10-08',
    };
    expect((await readSearch(f.slug, combined)).items.map((t) => t.id)).toEqual(
      [tasks[1]!.id],
    );
    expect(
      (await readSearch(f.slug, { ...combined, priority: 'LOW' })).count,
    ).toBe(0);
    expect((await readSearch(f.slug, {})).count).toBe(4);
  });
  it('ignores invalid and foreign parameters without leaking foreign options or data', async () => {
    actor(f.member);
    const result = await readSearch(f.slug, {
      priority: 'bad',
      column: f.otherColumn.id,
      assignee: f.outsider.id,
      from: 'bad',
      to: '2026-10-08',
    });
    expect(result.filters).toMatchObject({
      priority: undefined,
      column: undefined,
      assignee: undefined,
      from: undefined,
      to: '2026-10-08',
    });
    expect(result.count).toBe(3);
    expect(
      (await readSearch(f.slug, { from: '2026-10-09', to: '2026-10-01' }))
        .count,
    ).toBe(4);
  });
  it('rejects non-member and anonymous reads regardless of filters', async () => {
    actor(f.outsider);
    await expect(readSearch(f.slug, {})).rejects.toThrow('not found');
    actor(f.member);
    await expect(readSearch(f.otherSlug, { q: 'payment' })).rejects.toThrow(
      'not found',
    );
    actor(null);
    await expect(readSearch(f.slug, {})).rejects.toThrow('log in');
  });
  it('reports exact counts while bounding the returned rows', async () => {
    actor(f.owner);
    const project = dataOf(
      await createProject({ slug: f.slug, name: 'Large search' }),
    );
    const column = await db.column.findFirstOrThrow({
      where: { projectId: project.id },
    });
    await db.task.createMany({
      data: Array.from({ length: 101 }, (_, i) => ({
        projectId: project.id,
        columnId: column.id,
        title: 'Bounded row',
        position: i + 1,
        createdBy: f.owner.id,
      })),
    });
    const result = await readSearch(f.slug, { q: 'Bounded row' });
    expect(result.count).toBe(101);
    expect(result.items).toHaveLength(100);
    await db.project.delete({ where: { id: project.id } });
  });
});
describe('workspace dashboard', () => {
  const now = new Date('2026-10-08T23:30:00Z');
  it('counts done/overdue correctly and returns only the current member’s workspace assignments', async () => {
    actor(f.member);
    const result = await readDashboard(f.slug, now);
    expect(result).toMatchObject({
      today: '2026-10-08',
      total: 4,
      done: 1,
      overdueCount: 1,
      assignedCount: 2,
    });
    expect(result.projects[0]).toMatchObject({
      total: 4,
      done: 1,
      percent: 25,
      overdue: 1,
    });
    expect(result.assigned.map((t) => t.id)).toEqual([
      tasks[0]!.id,
      tasks[1]!.id,
    ]);
    actor(f.owner);
    expect((await readDashboard(f.slug, now)).assignedCount).toBe(0);
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });
  it('treats all done columns as complete and handles a project with no done columns', async () => {
    actor(f.owner);
    await db.column.update({
      where: { id: f.columns[2]!.id },
      data: { isDone: false },
    });
    const incomplete = await readDashboard(f.slug, now);
    expect(incomplete).toMatchObject({ done: 0, overdueCount: 2 });
    expect(incomplete.projects[0]?.percent).toBe(0);
    await db.column.update({
      where: { id: f.columns[2]!.id },
      data: { isDone: true },
    });
    await db.column.update({
      where: { id: f.columns[0]!.id },
      data: { isDone: true },
    });
    const complete = await readDashboard(f.slug, now);
    expect(complete).toMatchObject({ done: 4, overdueCount: 0 });
    expect(complete.projects[0]?.percent).toBe(100);
    await db.column.update({
      where: { id: f.columns[0]!.id },
      data: { isDone: false },
    });
  });
  it('handles empty workspaces and zero-task projects safely', async () => {
    actor(f.owner);
    const empty = dataOf(
      await createProject({ slug: f.slug, name: 'Empty project' }),
    );
    expect(
      (await readDashboard(f.slug, now)).projects.find(
        (p) => p.id === empty.id,
      ),
    ).toMatchObject({ total: 0, done: 0, percent: 0, overdue: 0 });
    await db.project.delete({ where: { id: empty.id } });
    await db.project.delete({ where: { id: f.otherProject.id } });
    const result = await readDashboard(f.otherSlug, now);
    expect(result).toMatchObject({
      total: 0,
      done: 0,
      overdueCount: 0,
      assignedCount: 0,
      projects: [],
      assigned: [],
    });
  });
  it('enforces membership for every dashboard read', async () => {
    actor(f.outsider);
    await expect(readDashboard(f.slug, now)).rejects.toThrow('not found');
    actor(f.member);
    await expect(readDashboard(f.otherSlug, now)).rejects.toThrow('not found');
    actor(null);
    await expect(readDashboard(f.slug, now)).rejects.toThrow('log in');
  });
});
