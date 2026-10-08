import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { workspaceAccess } from './workspace-access';
import { searchSchema } from './validation/search';
import { utcDate } from './task-indicators';
export const taskRowSelect = {
  id: true,
  title: true,
  priority: true,
  dueDate: true,
  project: { select: { id: true, name: true } },
  column: { select: { id: true, name: true, isDone: true } },
  assignee: { select: { id: true, name: true } },
} as const satisfies Prisma.TaskSelect;
export type TaskRowData = Prisma.TaskGetPayload<{
  select: typeof taskRowSelect;
}>;
export async function readSearch(slug: unknown, input: unknown) {
  const { workspace } = await workspaceAccess(slug);
  const filters = searchSchema.parse(input);
  const [members, columns] = await Promise.all([
    db.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      select: { user: { select: { id: true, name: true } } },
      orderBy: { id: 'asc' },
      take: 1000,
    }),
    db.column.findMany({
      where: { project: { workspaceId: workspace.id } },
      select: { id: true, name: true, project: { select: { name: true } } },
      orderBy: [
        { project: { position: 'asc' } },
        { position: 'asc' },
        { id: 'asc' },
      ],
      take: 1000,
    }),
  ]);
  if (
    filters.assignee &&
    filters.assignee !== 'unassigned' &&
    !members.some((m) => m.user.id === filters.assignee)
  )
    filters.assignee = undefined;
  if (filters.column && !columns.some((c) => c.id === filters.column))
    filters.column = undefined;
  // Escape LIKE metacharacters so a user's literal text cannot turn into a wildcard search.
  const q = filters.q.replace(/[\\%_]/g, '\\$&');
  const where: Prisma.TaskWhereInput = {
    project: { workspaceId: workspace.id },
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(filters.assignee
      ? {
          assigneeId:
            filters.assignee === 'unassigned' ? null : filters.assignee,
        }
      : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.column ? { columnId: filters.column } : {}),
    ...(filters.from || filters.to
      ? {
          dueDate: {
            ...(filters.from
              ? { gte: new Date(`${filters.from}T00:00:00Z`) }
              : {}),
            ...(filters.to ? { lte: new Date(`${filters.to}T00:00:00Z`) } : {}),
          },
        }
      : {}),
  };
  const [items, count] = await db.$transaction(
    [
      db.task.findMany({
        where,
        select: taskRowSelect,
        orderBy: [
          { project: { position: 'asc' } },
          { column: { position: 'asc' } },
          { position: 'asc' },
          { id: 'asc' },
        ],
        take: 100,
      }),
      db.task.count({ where }),
    ],
    { isolationLevel: 'RepeatableRead' },
  );
  return {
    items,
    count,
    filters,
    members: members.map((m) => m.user),
    columns,
    today: utcDate(new Date()),
  };
}
