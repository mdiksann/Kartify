'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { workspaceAccess, requireCurrentUser } from '@/lib/workspace-access';
import { workspaceTargetSchema } from '@/lib/validation/workspace';
import {
  addMemberSchema,
  changeRoleSchema,
  memberTargetSchema,
} from '@/lib/validation/member';
import { assertMemberChange } from '@/lib/permissions';
import { NotFoundError } from '@/lib/errors';
import { actionFailure } from '@/lib/action-result';
export async function addMemberByEmail(input: unknown) {
  try {
    await requireCurrentUser();
    const member = await db.$transaction(
      async (tx) => {
        const { slug, email, role } = addMemberSchema.parse(input);
        const { workspace } = await workspaceAccess(slug, {
          roles: ['OWNER', 'ADMIN'],
          client: tx,
        });
        const user = await tx.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (!user) throw new NotFoundError();
        return tx.workspaceMember.create({
          data: { workspaceId: workspace.id, userId: user.id, role },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    revalidatePath('/w', 'layout');
    return { ok: true as const, data: member };
  } catch (error) {
    return actionFailure(error, '/w/members');
  }
}
export async function changeRole(input: unknown) {
  try {
    await requireCurrentUser();
    const member = await db.$transaction(
      async (tx) => {
        const { slug, memberId, role } = changeRoleSchema.parse(input);
        const { workspace } = await workspaceAccess(slug, {
          roles: ['OWNER', 'ADMIN'],
          client: tx,
        });
        const target = await tx.workspaceMember.findFirst({
          where: { id: memberId, workspaceId: workspace.id },
        });
        if (!target) throw new NotFoundError();
        const count = await tx.workspaceMember.count({
          where: {
            workspaceId: workspace.id,
            role: { in: ['OWNER', 'ADMIN'] },
          },
        });
        assertMemberChange(target.role, count, role);
        return tx.workspaceMember.update({
          where: { id: target.id, workspaceId: workspace.id },
          data: { role },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    revalidatePath('/w', 'layout');
    return { ok: true as const, data: member };
  } catch (error) {
    return actionFailure(error, '/w/members');
  }
}
export async function removeMember(input: unknown) {
  try {
    await requireCurrentUser();
    await db.$transaction(
      async (tx) => {
        const { slug, memberId } = memberTargetSchema.parse(input);
        const { workspace } = await workspaceAccess(slug, {
          roles: ['OWNER', 'ADMIN'],
          client: tx,
        });
        const target = await tx.workspaceMember.findFirst({
          where: { id: memberId, workspaceId: workspace.id },
        });
        if (!target) throw new NotFoundError();
        const count = await tx.workspaceMember.count({
          where: {
            workspaceId: workspace.id,
            role: { in: ['OWNER', 'ADMIN'] },
          },
        });
        assertMemberChange(target.role, count);
        await tx.task.updateMany({
          where: {
            assigneeId: target.userId,
            project: { workspaceId: workspace.id },
          },
          data: { assigneeId: null },
        });
        await tx.workspaceMember.delete({
          where: { id: target.id, workspaceId: workspace.id },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    revalidatePath('/w', 'layout');
    return { ok: true as const, data: undefined };
  } catch (error) {
    return actionFailure(error, '/w/members');
  }
}
export async function listMembers(input: unknown) {
  try {
    await requireCurrentUser();
    const { slug } = workspaceTargetSchema.parse(input);
    const { workspace } = await workspaceAccess(slug);
    const members = await db.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100,
    });
    return { ok: true as const, data: members };
  } catch (error) {
    return actionFailure(error, '/w/members');
  }
}
