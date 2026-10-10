import { beforeEach, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { allocatePosition } from '@/lib/positions';
import { ConflictError, ValidationError } from '@/lib/errors';
vi.mock('@/lib/db', () => ({ db: {} }));
const tx = {
  project: { findMany: vi.fn(), update: vi.fn() },
  column: { findMany: vi.fn(), update: vi.fn() },
  task: { findMany: vi.fn(), update: vi.fn() },
};
const client = tx as unknown as Prisma.TransactionClient;
beforeEach(() => vi.resetAllMocks());
it.each(['project', 'column', 'task'] as const)(
  'allocates head/middle/tail positions for %s and excludes the moving row',
  async (kind) => {
    tx[kind].findMany.mockResolvedValue([
      { id: 'a', position: 1 },
      { id: 'b', position: 3 },
      { id: 'c', position: 5 },
    ]);
    expect(await allocatePosition(client, { kind, parentId: 'parent' })).toBe(
      6,
    );
    expect(
      await allocatePosition(client, {
        kind,
        parentId: 'parent',
        beforeId: 'a',
      }),
    ).toBe(0);
    expect(
      await allocatePosition(client, {
        kind,
        parentId: 'parent',
        afterId: 'a',
        beforeId: 'b',
      }),
    ).toBe(2);
    expect(
      await allocatePosition(client, {
        kind,
        parentId: 'parent',
        excludeId: 'b',
        afterId: 'a',
        beforeId: 'c',
      }),
    ).toBe(3);
    expect(
      await allocatePosition(client, {
        kind,
        parentId: 'parent',
        afterId: 'c',
      }),
    ).toBe(6);
    expect(tx[kind].update).not.toHaveBeenCalled();
  },
);
it('rejects foreign neighbors, non-adjacent destinations and oversized boards', async () => {
  tx.task.findMany.mockResolvedValue([
    { id: 'a', position: 1 },
    { id: 'b', position: 2 },
    { id: 'c', position: 3 },
  ]);
  for (const neighbors of [{ beforeId: 'foreign' }, { afterId: 'foreign' }])
    await expect(
      allocatePosition(client, {
        kind: 'task',
        parentId: 'parent',
        ...neighbors,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  await expect(
    allocatePosition(client, {
      kind: 'task',
      parentId: 'parent',
      afterId: 'a',
      beforeId: 'c',
    }),
  ).rejects.toBeInstanceOf(ConflictError);
  tx.task.findMany.mockResolvedValue(
    Array.from({ length: 10001 }, (_, index) => ({
      id: String(index),
      position: index,
    })),
  );
  await expect(
    allocatePosition(client, { kind: 'task', parentId: 'parent' }),
  ).rejects.toThrow('too large');
  expect(tx.task.update).not.toHaveBeenCalled();
});
it.each(['project', 'column', 'task'] as const)(
  'stages %s renumbering outside occupied positions before inserting',
  async (kind) => {
    tx[kind].findMany.mockResolvedValue([
      { id: 'a', position: 1 },
      { id: 'b', position: 1 + Number.EPSILON },
      { id: 'c', position: 5 },
    ]);
    expect(
      await allocatePosition(client, {
        kind,
        parentId: 'parent',
        afterId: 'a',
        beforeId: 'b',
      }),
    ).toBe(1.5);
    const positions = tx[kind].update.mock.calls.map(
      ([input]) => input.data.position,
    );
    expect(positions).toEqual([6, 7, 8, 1, 2, 3]);
  },
);
it('propagates read failures without writing positions', async () => {
  tx.task.findMany.mockRejectedValue(new Error('database unavailable'));
  await expect(
    allocatePosition(client, { kind: 'task', parentId: 'parent' }),
  ).rejects.toThrow();
  expect(tx.task.update).not.toHaveBeenCalled();
});
