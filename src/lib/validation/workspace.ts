import { z } from 'zod';
export const roles = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export const zId = z.string().cuid('Invalid identifier.');
export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid workspace address.');
export const workspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a workspace name.')
    .max(80, 'Use at most 80 characters.'),
});
export const workspaceTargetSchema = z.object({ slug: slugSchema });
export const renameWorkspaceSchema = workspaceTargetSchema.extend(
  workspaceSchema.shape,
);
export const deleteWorkspaceSchema = workspaceTargetSchema.extend({
  confirmation: z.literal('DELETE', { error: 'Confirm workspace deletion.' }),
});
