import 'server-only';
import type { Prisma } from '@prisma/client';
export const taskViewInclude = {
  column: true,
  assignee: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
} as const satisfies Prisma.TaskInclude;
export type TaskView = Prisma.TaskGetPayload<{
  include: typeof taskViewInclude;
}>;
export const authorSelect = { id: true, name: true } as const;
