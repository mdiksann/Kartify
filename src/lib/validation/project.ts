import { z } from 'zod';
import { workspaceTargetSchema, zId } from './workspace';
export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a name.')
  .max(80, 'Use at most 80 characters.');
export const projectTargetSchema = workspaceTargetSchema.extend({
  projectId: zId,
});
export const createProjectSchema = workspaceTargetSchema.extend({
  name: nameSchema,
  description: z.string().trim().max(10_000).optional(),
});
export const renameProjectSchema = projectTargetSchema.extend({
  name: nameSchema,
});
export const deleteProjectSchema = projectTargetSchema.extend({
  confirmation: z.literal('DELETE', { error: 'Confirm project deletion.' }),
});
export const neighborsSchema = z.object({
  beforeId: zId.optional(),
  afterId: zId.optional(),
});
