import { z } from 'zod';
import { taskTargetSchema } from './task';
import { zId } from './workspace';
export const bodySchema = z
  .string()
  .trim()
  .min(1, 'Enter a comment.')
  .max(5000, 'Use at most 5,000 characters.');
export const createCommentSchema = taskTargetSchema.extend({
  body: bodySchema,
});
export const commentTargetSchema = taskTargetSchema.extend({ commentId: zId });
export const updateCommentSchema = commentTargetSchema.extend({
  body: bodySchema,
});
export const deleteCommentSchema = commentTargetSchema.extend({
  confirmation: z.literal('DELETE', { error: 'Confirm comment deletion.' }),
});
export const taskPageSchema = taskTargetSchema.extend({
  cursor: zId.optional(),
});
