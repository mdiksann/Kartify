import 'server-only';
import type { Prisma } from '@prisma/client';
import { zId } from './validation/workspace';
import {
  activityPayloadSchema,
  type ActivityPayload,
} from './validation/activity';
export async function recordActivity(
  tx: Prisma.TransactionClient,
  options: { taskId: string; actorId: string; event: ActivityPayload },
) {
  const { type, data } = activityPayloadSchema.parse(options.event);
  return tx.activity.create({
    data: {
      taskId: zId.parse(options.taskId),
      actorId: zId.parse(options.actorId),
      type,
      data,
    },
  });
}
