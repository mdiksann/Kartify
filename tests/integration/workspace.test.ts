import 'dotenv/config';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { testDatabaseUrl } from './database-url';
const runtime = vi.hoisted(() => ({
  user: null as { id: string; name: string; email: string } | null,
}));
vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => runtime.user }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-request-id': 'workspace-integration' }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.stubEnv(
  'DATABASE_URL',
  testDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL),
);
const { db } = await import('@/lib/db');
const {
  createWorkspace,
  createWorkspaceForm,
  renameWorkspace,
  renameWorkspaceForm,
  deleteWorkspace,
} = await import('@/actions/workspace');
const { workspacePageAccess, userWorkspaces } =
  await import('@/lib/workspace-access');
const { createFixture } = await import('./workspace-fixture');
let fixture: Awaited<ReturnType<typeof createFixture>>;
let owner: { id: string; name: string; email: string };
let admin: typeof owner;
let member: typeof owner;
let outsider: typeof owner;
let suffix: string;
let slug: string;
let otherSlug: string;
let workspaceId: string;
let otherId: string;

let taskIn: Awaited<ReturnType<typeof createFixture>>['taskIn'];
function actor(user: typeof owner | null) {
  runtime.user = user;
}
function form(data: Record<string, string>) {
  const result = new FormData();
  for (const [k, v] of Object.entries(data)) result.set(k, v);
  return result;
}
beforeAll(async () => {
  fixture = await createFixture(actor);
  ({
    owner,
    admin,
    member,
    outsider,
    suffix,
    slug,
    otherSlug,
    workspaceId,
    otherId,
    taskIn,
  } = fixture);
});
afterAll(async () => {
  await fixture.cleanup();
  vi.unstubAllEnvs();
});
describe('workspace creation and guards', () => {
  it('bootstraps exactly one owner, creates collision suffixes, and normalizes names', async () => {
    actor(owner);
    expect(
      await db.workspaceMember.count({ where: { workspaceId, role: 'OWNER' } }),
    ).toBe(1);
    const duplicate = await createWorkspace({ name: ` Team ${suffix} ` });
    expect(duplicate.ok).toBe(true);
    if (duplicate.ok) {
      expect(duplicate.data.slug).toBe(`${slug}-2`);
      expect(
        await db.workspaceMember.count({
          where: {
            workspace: { slug: duplicate.data.slug },
            role: 'OWNER',
            userId: owner.id,
          },
        }),
      ).toBe(1);
    }
    const data = form({ name: `Via form ${suffix}` });
    await expect(createWorkspaceForm(null, data)).rejects.toThrow(
      'REDIRECT:/w/',
    );
  });
  it('rejects invalid names and anonymous creation without writing', async () => {
    actor(owner);
    const before = await db.workspace.count({ where: { createdBy: owner.id } });
    for (const name of ['', ' ', 'a'.repeat(81), 123])
      expect(await createWorkspace({ name })).toMatchObject({
        ok: false,
        field: 'name',
      });
    expect(await db.workspace.count({ where: { createdBy: owner.id } })).toBe(
      before,
    );
    actor(null);
    expect(await createWorkspace({ name: 'No session' })).toMatchObject({
      ok: false,
      message: 'Please log in to continue.',
    });
  });
  it('allows members, returns 404 for non-members/missing slugs, and lists only own workspaces', async () => {
    actor(member);
    expect((await workspacePageAccess(slug)).member.role).toBe('MEMBER');
    expect((await userWorkspaces(member.id)).map((w) => w.id)).toEqual([
      workspaceId,
    ]);
    await expect(workspacePageAccess(otherSlug)).rejects.toThrow('NOT_FOUND');
    actor(outsider);
    await expect(workspacePageAccess(slug)).rejects.toThrow('NOT_FOUND');
    await expect(workspacePageAccess('does-not-exist')).rejects.toThrow(
      'NOT_FOUND',
    );
    await expect(workspacePageAccess('../invalid')).rejects.toThrow(
      'NOT_FOUND',
    );
    actor(null);
    await expect(workspacePageAccess(slug)).rejects.toThrow(
      'REDIRECT:/login?next=',
    );
  });
});
describe('workspace settings authorization and cascade', () => {
  it('allows Owner/Admin rename, denies Member/non-member/anonymous, and validates inputs', async () => {
    for (const user of [owner, admin]) {
      actor(user);
      expect(
        await renameWorkspace({ slug, name: 'Renamed team' }),
      ).toMatchObject({ ok: true });
    }
    actor(admin);
    expect(
      await renameWorkspaceForm(null, form({ slug, name: 'Via form' })),
    ).toMatchObject({ ok: true });
    actor(member);
    expect(await renameWorkspace({ slug, name: 'Denied' })).toMatchObject({
      ok: false,
      message: 'This action is not allowed.',
    });
    actor(outsider);
    expect(await renameWorkspace({ slug, name: 'Denied' })).toMatchObject({
      ok: false,
      message: 'The requested resource was not found.',
    });
    actor(null);
    expect(await renameWorkspace({ slug, name: 'Denied' })).toMatchObject({
      ok: false,
      message: 'Please log in to continue.',
    });
    actor(owner);
    expect(await renameWorkspace({ slug, name: '' })).toMatchObject({
      ok: false,
      field: 'name',
    });
    expect(
      (await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } }))
        .name,
    ).toBe('Via form');
  });
  it('only allows the owner to delete and cascades every existing dependent model', async () => {
    for (const user of [admin, member]) {
      actor(user);
      expect(
        await deleteWorkspace({ slug, confirmation: 'DELETE' }),
      ).toMatchObject({ ok: false, message: 'This action is not allowed.' });
    }
    actor(outsider);
    expect(
      await deleteWorkspace({ slug, confirmation: 'DELETE' }),
    ).toMatchObject({
      ok: false,
      message: 'The requested resource was not found.',
    });
    actor(null);
    expect((await deleteWorkspace({ slug, confirmation: 'DELETE' })).ok).toBe(
      false,
    );
    actor(owner);
    expect((await deleteWorkspace({ slug, confirmation: '' })).ok).toBe(false);
    const toDelete = await createWorkspace({ name: `Delete ${suffix}` });
    if (!toDelete.ok) throw new Error('Fixture creation failed');
    const id = (
      await db.workspace.findUniqueOrThrow({
        where: { slug: toDelete.data.slug },
      })
    ).id;
    const task = await taskIn(id, owner.id);
    expect(
      await deleteWorkspace({
        slug: toDelete.data.slug,
        confirmation: 'DELETE',
      }),
    ).toMatchObject({ ok: true });
    expect(await db.workspace.findUnique({ where: { id } })).toBeNull();
    expect(await db.workspaceMember.count({ where: { workspaceId: id } })).toBe(
      0,
    );
    expect(
      await db.project.findUnique({ where: { id: task.projectId } }),
    ).toBeNull();
    expect(
      await db.column.findUnique({ where: { id: task.columnId } }),
    ).toBeNull();
    expect(await db.task.findUnique({ where: { id: task.id } })).toBeNull();
    expect(
      await db.workspace.findUnique({ where: { id: otherId } }),
    ).not.toBeNull();
  });
});
