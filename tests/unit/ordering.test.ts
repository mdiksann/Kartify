import { describe, expect, it } from 'vitest';
import {
  orderBetween,
  OrderingCollisionError,
  renumberPositions,
} from '@/lib/ordering';
describe('fractional ordering', () => {
  it('inserts at the head, middle, tail and empty list', () => {
    expect(orderBetween()).toBe(1);
    expect(orderBetween(undefined, 1)).toBe(0);
    expect(orderBetween(1, 3)).toBe(2);
    expect(orderBetween(3)).toBe(4);
    expect(orderBetween(-2, -1)).toBe(-1.5);
  });
  it('detects equal, reversed, exhausted and non-finite gaps', () => {
    for (const [prev, next] of [
      [1, 1],
      [2, 1],
      [1, 1 + Number.EPSILON],
      [Number.MAX_VALUE, undefined],
      [undefined, -Number.MAX_VALUE],
      [NaN, 2],
      [1, Infinity],
      [0, Number.MIN_VALUE],
    ] as const)
      expect(() => orderBetween(prev, next)).toThrow(OrderingCollisionError);
  });
  it('handles extreme finite midpoints without overflow', () => {
    const previous = Number.MAX_VALUE / 2;
    expect(orderBetween(previous, Number.MAX_VALUE)).toBeGreaterThan(previous);
  });
  it('renumbers after repeated midpoint exhaustion and preserves IDs/order', () => {
    let next = 2;
    let collision = false;
    for (let i = 0; i < 100; i++) {
      try {
        next = orderBetween(1, next);
      } catch (error) {
        expect(error).toBeInstanceOf(OrderingCollisionError);
        collision = true;
        break;
      }
    }
    expect(collision).toBe(true);
    expect(renumberPositions([{ id: 'b' }, { id: 'a' }])).toEqual([
      { id: 'b', position: 1 },
      { id: 'a', position: 2 },
    ]);
    expect(renumberPositions([])).toEqual([]);
  });
});
