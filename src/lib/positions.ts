import 'server-only';
import type { Prisma } from '@prisma/client';
import {
  orderBetween,
  OrderingCollisionError,
  renumberPositions,
} from './ordering';
import { ConflictError, ValidationError } from './errors';
type Row = { id: string; position: number };
type Options = {
  kind: 'task' | 'column' | 'project';
  parentId: string;
  excludeId?: string;
  beforeId?: string;
  afterId?: string;
};
function insertionIndex(rows: Row[], options: Options): number {
  const before = options.beforeId
    ? rows.findIndex((row) => row.id === options.beforeId)
    : -1;
  const after = options.afterId
    ? rows.findIndex((row) => row.id === options.afterId)
    : -1;
  if ((options.beforeId && before < 0) || (options.afterId && after < 0))
    throw new ValidationError(
      'The destination changed. Refresh the board and try again.',
    );
  if (options.beforeId && options.afterId && before !== after + 1)
    throw new ConflictError('The destination order changed. Try again.');
  return options.beforeId ? before : options.afterId ? after + 1 : rows.length;
}
export async function allocatePosition(
  tx: Prisma.TransactionClient,
  options: Options,
): Promise<number> {
  const all =
    options.kind === 'project'
      ? await tx.project.findMany({
          where: { workspaceId: options.parentId },
          select: { id: true, position: true },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          take: 10_001,
        })
      : options.kind === 'task'
        ? await tx.task.findMany({
            where: { columnId: options.parentId },
            select: { id: true, position: true },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            take: 10_001,
          })
        : await tx.column.findMany({
            where: { projectId: options.parentId },
            select: { id: true, position: true },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            take: 10_001,
          });
  // ponytail: bound rebalance work at 10,000 rows; paginate a larger board before raising it.
  if (all.length > 10_000)
    throw new ValidationError('This board is too large to reorder.');
  const rows = all.filter((row) => row.id !== options.excludeId);
  const index = insertionIndex(rows, options);
  try {
    return orderBetween(rows[index - 1]?.position, rows[index]?.position);
  } catch (error) {
    if (!(error instanceof OrderingCollisionError)) throw error;
    const normalized = renumberPositions(all);
    // Stage in unused positions outside the final 1..N range so unique constraints hold.
    const occupied = new Set(all.map((row) => row.position));
    let staging = orderBetween(normalized.length + 1, undefined);
    for (const row of normalized) {
      while (occupied.has(staging)) staging = orderBetween(staging, undefined);
      if (options.kind === 'task')
        await tx.task.update({
          where: { id: row.id, columnId: options.parentId },
          data: { position: staging },
        });
      else if (options.kind === 'project')
        await tx.project.update({
          where: { id: row.id, workspaceId: options.parentId },
          data: { position: staging },
        });
      else
        await tx.column.update({
          where: { id: row.id, projectId: options.parentId },
          data: { position: staging },
        });
      occupied.add(staging);
      staging = orderBetween(staging, undefined);
    }
    for (const row of normalized) {
      if (options.kind === 'task')
        await tx.task.update({
          where: { id: row.id, columnId: options.parentId },
          data: { position: row.position },
        });
      else if (options.kind === 'project')
        await tx.project.update({
          where: { id: row.id, workspaceId: options.parentId },
          data: { position: row.position },
        });
      else
        await tx.column.update({
          where: { id: row.id, projectId: options.parentId },
          data: { position: row.position },
        });
    }
    const fresh = normalized.filter((row) => row.id !== options.excludeId);
    return orderBetween(fresh[index - 1]?.position, fresh[index]?.position);
  }
}
