import 'server-only';
import type { Prisma, Role } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from './auth';
import { db } from './db';
import { AuthError, NotFoundError } from './errors';
import { requireMember, assertRole } from './permissions';
import { slugSchema } from './validation/workspace';
export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}
export async function workspaceAccess(
  slug: unknown,
  options: { roles?: readonly Role[]; client?: Prisma.TransactionClient } = {},
) {
  const user = await requireCurrentUser();
  const validSlug = slugSchema.parse(slug);
  const client = options.client ?? db;
  const workspace = await client.workspace.findUnique({
    where: { slug: validSlug },
  });
  if (!workspace) throw new NotFoundError();
  const member = await requireMember(user.id, workspace.id, client);
  if (options.roles) assertRole(member.role, options.roles);
  return { user, workspace, member };
}
export async function workspacePageAccess(slug: string) {
  try {
    return await workspaceAccess(slug);
  } catch (error) {
    if (error instanceof AuthError)
      redirect(`/login?next=${encodeURIComponent(`/w/${slug}`)}`);
    if (error instanceof NotFoundError || !slugSchema.safeParse(slug).success)
      notFound();
    throw error;
  }
}
export async function userWorkspaces(userId: string) {
  return db.workspace.findMany({
    where: { members: { some: { userId } } },
    select: { id: true, name: true, slug: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: 50,
  });
}
