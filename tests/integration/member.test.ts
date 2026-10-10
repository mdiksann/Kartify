import 'dotenv/config';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
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
const { addMemberByEmail, changeRole, removeMember, listMembers } =
  await import('@/actions/member');
const { workspacePageAccess } = await import('@/lib/workspace-access');
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
let ownerMembership: string;
let adminMembership: string;
let memberMembership: string;
let taskIn: Awaited<ReturnType<typeof createFixture>>['taskIn'];
function actor(user: typeof owner | null) {
  runtime.user = user;
}
beforeEach(async () => {
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
    ownerMembership,
    adminMembership,
    memberMembership,
    taskIn,
  } = fixture);
});
afterEach(async () => {
  await fixture.cleanup();
});
describe('membership lifecycle, authorization and isolation', () => {
  it('allows admin add by existing normalized email, rejects duplicates/missing users/owner role', async () => {
    actor(admin);
    const result = await addMemberByEmail({
      slug,
      email: ` ${outsider.email.toUpperCase()} `,
      role: 'MEMBER',
    });
    expect(result.ok).toBe(true);
    expect(
      (await addMemberByEmail({ slug, email: outsider.email, role: 'ADMIN' }))
        .ok,
    ).toBe(false);
    expect(
      await addMemberByEmail({
        slug,
        email: 'missing-account@example.com',
        role: 'MEMBER',
      }),
    ).toMatchObject({
      ok: false,
      message: 'No account found for this email. Ask them to register first.',
    });
    expect(
      (await addMemberByEmail({ slug, email: outsider.email, role: 'OWNER' }))
        .ok,
    ).toBe(false);
    if (result.ok)
      expect((await removeMember({ slug, memberId: result.data.id })).ok).toBe(
        true,
      );
    actor(owner);
    const added = await addMemberByEmail({
      slug,
      email: outsider.email,
      role: 'ADMIN',
    });
    expect(added.ok).toBe(true);
    if (added.ok)
      expect((await removeMember({ slug, memberId: added.data.id })).ok).toBe(
        true,
      );
  });
  it('allows all members to list without exposing hashes; denies outsiders', async () => {
    actor(member);
    const result = await listMembers({ slug });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(3);
      expect(JSON.stringify(result.data)).not.toContain('passwordHash');
    }
    actor(outsider);
    expect(await listMembers({ slug })).toMatchObject({
      ok: false,
      message: 'The requested resource was not found.',
    });
    actor(null);
    expect((await listMembers({ slug })).ok).toBe(false);
    actor(owner);
    expect((await listMembers({ slug: '../bad' })).ok).toBe(false);
  });
  it('denies every member mutation for Member actors and immutable Owner targets', async () => {
    actor(member);
    for (const result of [
      await addMemberByEmail({ slug, email: outsider.email, role: 'MEMBER' }),
      await changeRole({ slug, memberId: adminMembership, role: 'MEMBER' }),
      await removeMember({ slug, memberId: adminMembership }),
    ])
      expect(result).toMatchObject({
        ok: false,
        message: 'This action is not allowed.',
      });
    for (const user of [owner, admin]) {
      actor(user);
      expect(
        (await changeRole({ slug, memberId: ownerMembership, role: 'ADMIN' }))
          .ok,
      ).toBe(false);
      expect((await removeMember({ slug, memberId: ownerMembership })).ok).toBe(
        false,
      );
    }
    actor(null);
    expect(
      (await addMemberByEmail({ slug, email: outsider.email, role: 'MEMBER' }))
        .ok,
    ).toBe(false);
    expect(
      (await changeRole({ slug, memberId: memberMembership, role: 'ADMIN' }))
        .ok,
    ).toBe(false);
    expect((await removeMember({ slug, memberId: memberMembership })).ok).toBe(
      false,
    );
  });
  it('allows admin promotion/demotion and rejects IDs and targets from other workspaces', async () => {
    actor(admin);
    expect(
      (await changeRole({ slug, memberId: memberMembership, role: 'ADMIN' }))
        .ok,
    ).toBe(true);
    expect(
      (await changeRole({ slug, memberId: memberMembership, role: 'MEMBER' }))
        .ok,
    ).toBe(true);
    const otherOwner = await db.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: otherId, userId: owner.id } },
    });
    for (const result of [
      await changeRole({ slug, memberId: otherOwner.id, role: 'MEMBER' }),
      await removeMember({ slug, memberId: otherOwner.id }),
      await changeRole({
        slug: otherSlug,
        memberId: memberMembership,
        role: 'ADMIN',
      }),
      await removeMember({ slug: otherSlug, memberId: memberMembership }),
      await addMemberByEmail({
        slug: otherSlug,
        email: outsider.email,
        role: 'MEMBER',
      }),
    ])
      expect(result).toMatchObject({
        ok: false,
        message: 'The requested resource was not found.',
      });
    expect(
      (await changeRole({ slug, memberId: 'bad', role: 'MEMBER' })).ok,
    ).toBe(false);
    expect((await removeMember({ slug, memberId: 'bad' })).ok).toBe(false);
    expect(
      (
        await db.workspaceMember.findUniqueOrThrow({
          where: { id: otherOwner.id },
        })
      ).role,
    ).toBe('OWNER');
  });
  it('defensively protects a last Admin if legacy/corrupt data lacks an Owner', async () => {
    const legacy = await db.workspace.create({
      data: {
        name: 'Legacy fixture',
        slug: `legacy-${suffix}`,
        createdBy: owner.id,
        members: { create: { userId: admin.id, role: 'ADMIN' } },
      },
    });
    const last = await db.workspaceMember.findUniqueOrThrow({
      where: {
        workspaceId_userId: { workspaceId: legacy.id, userId: admin.id },
      },
    });
    actor(admin);
    expect(
      await changeRole({
        slug: legacy.slug,
        memberId: last.id,
        role: 'MEMBER',
      }),
    ).toMatchObject({
      ok: false,
      message: 'At least one Owner or Admin must remain.',
    });
    expect(
      await removeMember({ slug: legacy.slug, memberId: last.id }),
    ).toMatchObject({
      ok: false,
      message: 'At least one Owner or Admin must remain.',
    });
    expect(
      (await db.workspaceMember.findUniqueOrThrow({ where: { id: last.id } }))
        .role,
    ).toBe('ADMIN');
  });
  it('removes membership and clears only that workspace’s assignments atomically, preserving the account', async () => {
    const ownTask = await taskIn(workspaceId, member.id);
    const otherTask = await taskIn(otherId, member.id);
    await db.workspaceMember.create({
      data: { workspaceId: otherId, userId: member.id, role: 'MEMBER' },
    });
    actor(admin);
    expect((await removeMember({ slug, memberId: memberMembership })).ok).toBe(
      true,
    );
    expect(
      await db.workspaceMember.findUnique({ where: { id: memberMembership } }),
    ).toBeNull();
    expect(
      (await db.task.findUniqueOrThrow({ where: { id: ownTask.id } }))
        .assigneeId,
    ).toBeNull();
    expect(
      (await db.task.findUniqueOrThrow({ where: { id: otherTask.id } }))
        .assigneeId,
    ).toBe(member.id);
    expect(
      await db.user.findUnique({ where: { id: member.id } }),
    ).not.toBeNull();
    actor(member);
    await expect(workspacePageAccess(slug)).rejects.toThrow('NOT_FOUND');
    expect((await workspacePageAccess(otherSlug)).member.userId).toBe(
      member.id,
    );
  });
});
