export class OrderingCollisionError extends Error {}
export function orderBetween(prev?: number, next?: number): number {
  if (
    (prev !== undefined && !Number.isFinite(prev)) ||
    (next !== undefined && !Number.isFinite(next))
  )
    throw new OrderingCollisionError('Positions must be finite.');
  if (prev !== undefined && next !== undefined && prev >= next)
    throw new OrderingCollisionError('Positions must be strictly ordered.');
  const midpoint =
    prev === undefined
      ? next === undefined
        ? 1
        : next - 1
      : next === undefined
        ? prev + 1
        : prev / 2 + next / 2;
  // Prisma's JSON numeric transport can collapse adjacent 16-digit doubles.
  // Leave a decimal precision margin and rebalance before persistence collides.
  const position = Number(midpoint.toPrecision(15));
  if (
    !Number.isFinite(position) ||
    (prev !== undefined && position <= prev) ||
    (next !== undefined && position >= next)
  )
    throw new OrderingCollisionError('Renumber positions before inserting.');
  return position;
}
export function renumberPositions<T extends { id: string }>(
  rows: readonly T[],
): (T & { position: number })[] {
  let previous: number | undefined;
  return rows.map((row) => {
    const position = orderBetween(previous, undefined);
    previous = position;
    return { ...row, position };
  });
}
