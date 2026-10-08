import { z } from 'zod';
import { zId } from './workspace';
import { dateSchema, priorities } from './task';
export const searchSchema = z
  .object({
    q: z.string().trim().max(200).catch(''),
    assignee: z
      .union([zId, z.literal('unassigned')])
      .optional()
      .catch(undefined),
    priority: z.enum(priorities).optional().catch(undefined),
    from: dateSchema.optional().catch(undefined),
    to: dateSchema.optional().catch(undefined),
    column: zId.optional().catch(undefined),
  })
  .transform((values) =>
    values.from && values.to && values.from > values.to
      ? { ...values, from: undefined, to: undefined }
      : values,
  );
export type SearchFilters = z.infer<typeof searchSchema>;
export function filterParams(filters: SearchFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value) params.set(key, value);
  return params.toString();
}
