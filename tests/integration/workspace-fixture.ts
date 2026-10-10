import { makeUser, makeProject, makeTask } from '../factories';
import { db } from '@/lib/db';
import { createWorkspace } from '@/actions/workspace';
type PublicUser = { id: string; name: string; email: string };
export async function createFixture(actor: (user: PublicUser | null) => void) {
  const suffix = crypto.randomUUID();
  const users: PublicUser[] = [];
  for (const name of ['owner', 'admin', 'member', 'outsider'])
    users.push(
      await makeUser(db, {
        name,
        email: `${name}-${suffix}@example.com`,
        passwordHash: 'not-used-for-login',
      }),
    );
  const [owner, admin, member, outsider] = users as [
    PublicUser,
    PublicUser,
    PublicUser,
    PublicUser,
  ];
  actor(owner);
  const first = await createWorkspace({ name: `Team ${suffix}` });
  const other = await createWorkspace({ name: `Other ${suffix}` });
  if (!first.ok || !other.ok) throw new Error('Fixture workspaces not created');
  const slug = first.data.slug;
  const otherSlug = other.data.slug;
  const workspaceId = (
    await db.workspace.findUniqueOrThrow({ where: { slug } })
  ).id;
  const otherId = (
    await db.workspace.findUniqueOrThrow({ where: { slug: otherSlug } })
  ).id;
  const ownerMembership = (
    await db.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId: owner.id } },
    })
  ).id;
  const adminMembership = (
    await db.workspaceMember.create({
      data: { workspaceId, userId: admin.id, role: 'ADMIN' },
    })
  ).id;
  const memberMembership = (
    await db.workspaceMember.create({
      data: { workspaceId, userId: member.id, role: 'MEMBER' },
    })
  ).id;
  async function taskIn(workspace: string, assignee: string) {
    const project = await makeProject(db, {
      workspaceId: workspace,
      name: 'Fixture project',
      position: 1,
    });
    const column = await db.column.create({
      data: { projectId: project.id, name: 'Fixture column', position: 1 },
    });
    return makeTask(db, {
      projectId: project.id,
      columnId: column.id,
      createdBy: owner.id,
      title: 'Fixture task',
      position: 1,
      assigneeId: assignee,
    });
  }
  async function cleanup() {
    await db.workspace.deleteMany({
      where: { createdBy: { in: users.map((u) => u.id) } },
    });
    await db.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await db.$disconnect();
  }
  return {
    suffix,
    owner,
    admin,
    member,
    outsider,
    slug,
    otherSlug,
    workspaceId,
    otherId,
    ownerMembership,
    adminMembership,
    memberMembership,
    taskIn,
    cleanup,
  };
}
