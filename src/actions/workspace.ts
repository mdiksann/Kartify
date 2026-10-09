'use server';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { AuthError, ConflictError } from '@/lib/errors';
import {
  workspaceSchema,
  workspaceAppearanceSchema,
  renameWorkspaceSchema,
  deleteWorkspaceSchema,
} from '@/lib/validation/workspace';
import { workspaceSlug } from '@/lib/slug';
import { workspaceAccess, requireCurrentUser } from '@/lib/workspace-access';
import {
  actionFailure,
  authLog,
  type FormState,
  type ActionResult,
} from '@/lib/action-result';
export async function createWorkspace(
  input: unknown,
): Promise<ActionResult<{ slug: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError();
    const { name } = workspaceSchema.parse(input);
    // Retry the unique constraint, rather than race a separate existence check.
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const workspace = await db.$transaction((tx) =>
          tx.workspace.create({
            data: {
              name,
              slug: workspaceSlug(name, attempt),
              createdBy: user.id,
              members: { create: { userId: user.id, role: 'OWNER' } },
            },
            select: { slug: true },
          }),
        );
        revalidatePath('/workspaces');
        return { ok: true, data: workspace };
      } catch (error) {
        if (!(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ))
          throw error;
      }
    }
    throw new ConflictError(
      'Unable to choose a workspace address. Try a different name.',
    );
  } catch (error) {
    return actionFailure(error, '/workspaces');
  }
}
export async function createWorkspaceForm(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const result = await createWorkspace(Object.fromEntries(form));
  if (!result.ok) return result;
  redirect(`/w/${result.data.slug}`);
}
export async function renameWorkspace(input: unknown): Promise<ActionResult> {
  try {
    await requireCurrentUser();
    await db.$transaction(
      async (tx) => {
        const { slug, name } = renameWorkspaceSchema.parse(input);
        const { workspace } = await workspaceAccess(slug, {
          roles: ['OWNER', 'ADMIN'],
          client: tx,
        });
        await tx.workspace.update({
          where: { id: workspace.id },
          data: { name },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    revalidatePath('/w', 'layout');
    revalidatePath('/workspaces');
    return { ok: true, data: undefined };
  } catch (error) {
    return actionFailure(error, '/w/settings');
  }
}
export async function renameWorkspaceForm(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  return renameWorkspace(Object.fromEntries(form));
}
export async function deleteWorkspace(input: unknown): Promise<ActionResult> {
  try {
    await requireCurrentUser();
    await db.$transaction(
      async (tx) => {
        const { slug } = deleteWorkspaceSchema.parse(input);
        const { workspace } = await workspaceAccess(slug, {
          roles: ['OWNER'],
          client: tx,
        });
        await tx.workspace.delete({ where: { id: workspace.id } });
        return workspace.id;
      },
      { isolationLevel: 'Serializable' },
    );
    await authLog('Workspace deleted');
    revalidatePath('/w', 'layout');
    revalidatePath('/workspaces');
    return { ok: true, data: undefined };
  } catch (error) {
    return actionFailure(error, '/w/settings');
  }
}

export async function updateWorkspaceAppearance(
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireCurrentUser();
    const values = workspaceAppearanceSchema.parse(input);
    await db.$transaction(
      async (tx) => {
        const { workspace } = await workspaceAccess(values.slug, {
          roles: ['OWNER', 'ADMIN'],
          client: tx,
        });
        await tx.workspace.update({
          where: { id: workspace.id },
          data: { background: values.background },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    revalidatePath(`/w/${values.slug}`, 'layout');
    return { ok: true, data: undefined };
  } catch (error) {
    return actionFailure(error, '/w/settings');
  }
}
