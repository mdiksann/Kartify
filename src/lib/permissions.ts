import 'server-only';
import type { Prisma, Role } from '@prisma/client';
import { db } from './db';
import { ForbiddenError, NotFoundError } from './errors';
export const permissionRoles = {
  viewWorkspace: ['OWNER', 'ADMIN', 'MEMBER'],
  viewBoard: ['OWNER', 'ADMIN', 'MEMBER'],
  viewDashboard: ['OWNER', 'ADMIN', 'MEMBER'],
  search: ['OWNER', 'ADMIN', 'MEMBER'],
  createTask: ['OWNER', 'ADMIN', 'MEMBER'],
  editTask: ['OWNER', 'ADMIN', 'MEMBER'],
  moveTask: ['OWNER', 'ADMIN', 'MEMBER'],
  deleteTask: ['OWNER', 'ADMIN', 'MEMBER'],
  comment: ['OWNER', 'ADMIN', 'MEMBER'],
  createProject: ['OWNER', 'ADMIN'],
  renameProject: ['OWNER', 'ADMIN'],
  reorderProject: ['OWNER', 'ADMIN'],
  deleteProject: ['OWNER', 'ADMIN'],
  createColumn: ['OWNER', 'ADMIN'],
  editColumn: ['OWNER', 'ADMIN'],
  reorderColumn: ['OWNER', 'ADMIN'],
  deleteColumn: ['OWNER', 'ADMIN'],
  markColumnDone: ['OWNER', 'ADMIN'],
  listMembers: ['OWNER', 'ADMIN', 'MEMBER'],
  addMember: ['OWNER', 'ADMIN'],
  changeRole: ['OWNER', 'ADMIN'],
  removeMember: ['OWNER', 'ADMIN'],
  changeOwnerRole: [],
  removeOwner: [],
  renameWorkspace: ['OWNER', 'ADMIN'],
  deleteWorkspace: ['OWNER'],
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof permissionRoles;
export function can(role: Role, action: Permission): boolean {
  const allowed: readonly Role[] = permissionRoles[action];
  return allowed.includes(role);
}
export function assertRole(role: Role, allowed: readonly Role[]): void {
  if (!allowed.includes(role)) throw new ForbiddenError();
}
// The predicates above are pure; these two guards read current membership from Postgres.
export async function requireMember(
  userId: string,
  workspaceId: string,
  client: Pick<Prisma.TransactionClient, 'workspaceMember'> = db,
) {
  const member = await client.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new NotFoundError();
  return member;
}
export async function requireRole(
  userId: string,
  workspaceId: string,
  roles: readonly Role[],
  client: Pick<Prisma.TransactionClient, 'workspaceMember'> = db,
) {
  const member = await requireMember(userId, workspaceId, client);
  assertRole(member.role, roles);
  return member;
}
export function assertMemberChange(
  targetRole: Role,
  privilegedCount: number,
  nextRole?: Role,
) {
  if (targetRole === 'OWNER')
    throw new ForbiddenError(
      'The workspace owner cannot be changed or removed.',
    );
  if (targetRole === 'ADMIN' && nextRole !== 'ADMIN' && privilegedCount <= 1)
    throw new ForbiddenError('At least one Owner or Admin must remain.');
}
