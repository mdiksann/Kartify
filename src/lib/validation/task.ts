import { z } from 'zod';
import { zId } from './workspace';
import { projectTargetSchema, neighborsSchema } from './project';
import { columnTargetSchema } from './column';
export const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      !value.startsWith('0000')
    );
  }, 'Enter a valid calendar date.');
export const taskFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a task title.')
    .max(200, 'Use at most 200 characters.'),
  description: z
    .string()
    .trim()
    .max(10_000, 'Use at most 10,000 characters.')
    .nullable()
    .optional(),
  priority: z.enum(priorities),
  assigneeId: zId.nullable().optional(),
  dueDate: dateSchema.nullable().optional(),
});
export const taskTargetSchema = projectTargetSchema.extend({ taskId: zId });
export const createTaskSchema = columnTargetSchema.extend({
  ...taskFieldsSchema.shape,
  priority: z.enum(priorities).default('MEDIUM'),
});
export const updateTaskSchema = taskTargetSchema.extend(
  taskFieldsSchema.partial().shape,
);
export const deleteTaskSchema = taskTargetSchema.extend({
  confirmation: z.literal('DELETE', { error: 'Confirm task deletion.' }),
});
export const moveTaskSchema = taskTargetSchema.extend({
  toColumnId: zId,
  ...neighborsSchema.shape,
});
export const taskDetailsSchema = taskTargetSchema.extend({
  commentId: zId.optional(),
});
