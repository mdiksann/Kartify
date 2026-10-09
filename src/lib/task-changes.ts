import type { Task } from '@prisma/client';
import type { z } from 'zod';
import type { updateTaskSchema } from './validation/task';
import type { ActivityPayload } from './validation/activity';
export function taskChangeEvents(
  before: Pick<
    Task,
    'title' | 'description' | 'priority' | 'assigneeId' | 'dueDate'
  > & { startDate?: Date | null; assignee: { name: string } | null },
  patch: z.infer<typeof updateTaskSchema>,
  assigneeName: string | null,
): ActivityPayload[] {
  const events: ActivityPayload[] = [];
  const changes: {
    field: 'title' | 'description' | 'startDate';
    from: string | null;
    to: string | null;
  }[] = [];
  for (const field of ['title', 'description'] as const)
    if (patch[field] !== undefined && (patch[field] || null) !== before[field])
      changes.push({ field, from: before[field], to: patch[field] || null });
  const priorStart = before.startDate?.toISOString().slice(0, 10) ?? null;
  if (patch.startDate !== undefined && patch.startDate !== priorStart)
    changes.push({ field: 'startDate', from: priorStart, to: patch.startDate });
  if (changes.length) events.push({ type: 'TASK_UPDATED', data: { changes } });
  if (patch.priority !== undefined && patch.priority !== before.priority)
    events.push({
      type: 'TASK_PRIORITY_CHANGED',
      data: { from: before.priority, to: patch.priority },
    });
  if (patch.assigneeId !== undefined && patch.assigneeId !== before.assigneeId)
    events.push({
      type: 'TASK_ASSIGNED',
      data: { from: before.assignee?.name ?? null, to: assigneeName },
    });
  const priorDate = before.dueDate?.toISOString().slice(0, 10) ?? null;
  if (patch.dueDate !== undefined && patch.dueDate !== priorDate)
    events.push({
      type: 'TASK_DUE_DATE_CHANGED',
      data: { from: priorDate, to: patch.dueDate },
    });
  return events;
}
