import 'server-only';
import { Prisma, type Role } from '@prisma/client';
import type { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from './db';
import { actionFailure, type ActionResult } from './action-result';
import { requireCurrentUser, workspaceAccess } from './workspace-access';
type Context = Awaited<ReturnType<typeof workspaceAccess>> & {
  tx: Prisma.TransactionClient;
};
export async function boardMutation<Input extends { slug: string }, Output>(
  schema: z.ZodType<Input>,
  input: unknown,
  operation: (input: Input, context: Context) => Promise<Output>,
  roles?: readonly Role[],
): Promise<ActionResult<Output>> {
  try {
    await requireCurrentUser();
    const values = schema.parse(input);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await db.$transaction(
          async (tx) =>
            operation(values, {
              ...(await workspaceAccess(values.slug, { client: tx, roles })),
              tx,
            }),
          { isolationLevel: 'Serializable' },
        );
        revalidatePath(`/w/${values.slug}`, 'layout');
        return { ok: true, data };
      } catch (error) {
        if (
          !(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2034'
          ) ||
          attempt === 2
        )
          throw error;
      }
    }
    throw new Error('Transaction retry exhausted.');
  } catch (error) {
    return actionFailure(error, '/w/board');
  }
}
