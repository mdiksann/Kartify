import { z } from 'zod';
import { zId } from './workspace';
const change = z.object({
  from: z.string().nullable(),
  to: z.string().nullable(),
});
export const activityPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('TASK_CREATED'),
    data: z.object({ title: z.string() }),
  }),
  z.object({
    type: z.literal('TASK_UPDATED'),
    data: z.object({
      changes: z
        .array(
          z.object({
            field: z.enum(['title', 'description', 'startDate']),
            ...change.shape,
          }),
        )
        .min(1),
    }),
  }),
  z.object({
    type: z.literal('TASK_MOVED'),
    data: z.object({
      fromColumn: z.string(),
      toColumn: z.string(),
      position: z.number().finite(),
    }),
  }),
  z.object({ type: z.literal('TASK_ASSIGNED'), data: change }),
  z.object({ type: z.literal('TASK_PRIORITY_CHANGED'), data: change }),
  z.object({ type: z.literal('TASK_DUE_DATE_CHANGED'), data: change }),
  ...(['COMMENT_ADDED', 'COMMENT_UPDATED', 'COMMENT_DELETED'] as const).map(
    (type) =>
      z.object({ type: z.literal(type), data: z.object({ commentId: zId }) }),
  ),
]);
export type ActivityPayload = z.infer<typeof activityPayloadSchema>;
