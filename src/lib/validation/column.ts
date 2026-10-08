import { z } from 'zod';
import { zId } from './workspace';
import { projectTargetSchema, nameSchema, neighborsSchema } from './project';
export const columnTargetSchema = projectTargetSchema.extend({ columnId: zId });
export const createColumnSchema = projectTargetSchema.extend({
  name: nameSchema,
});
export const renameColumnSchema = columnTargetSchema.extend({
  name: nameSchema,
});
export const reorderColumnSchema = columnTargetSchema.extend(
  neighborsSchema.shape,
);
export const setColumnDoneSchema = columnTargetSchema.extend({
  isDone: z.boolean(),
});
export const deleteColumnSchema = columnTargetSchema.extend({
  confirmation: z.literal('DELETE', { error: 'Confirm column deletion.' }),
});
