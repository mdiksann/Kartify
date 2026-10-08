import { describe, expect, it } from 'vitest';
import { searchSchema, filterParams } from '@/lib/validation/search';
import { dueState, utcDate } from '@/lib/task-indicators';
import { progressPercent } from '@/lib/progress';
const id = 'cm123456789012345678901234';
describe('search URL validation', () => {
  it('normalizes text, accepts filters and serializes safe URL values', () => {
    const values = searchSchema.parse({
      q: '  Payment & refactor  ',
      assignee: id,
      priority: 'URGENT',
      from: '2026-10-08',
      to: '2026-10-15',
      column: id,
    });
    expect(values.q).toBe('Payment & refactor');
    expect(new URLSearchParams(filterParams(values)).get('q')).toBe(values.q);
    expect(searchSchema.parse({ assignee: 'unassigned' }).assignee).toBe(
      'unassigned',
    );
    expect(filterParams(searchSchema.parse({}))).toBe('');
  });
  it('ignores invalid/repeated/oversized parameters independently', () => {
    const values = searchSchema.parse({
      q: ['repeated'],
      assignee: 'bad',
      priority: 'BAD',
      from: '2026-02-30',
      to: 42,
      column: [],
    });
    expect(values).toMatchObject({
      q: '',
      assignee: undefined,
      priority: undefined,
      from: undefined,
      to: undefined,
      column: undefined,
    });
    expect(
      searchSchema.parse({ q: 'x'.repeat(201), priority: 'HIGH' }),
    ).toMatchObject({ q: '', priority: 'HIGH' });
    expect(searchSchema.parse({ q: 'x'.repeat(200) }).q).toHaveLength(200);
  });
  it('ignores a reversed range but retains independent valid filters', () => {
    expect(
      searchSchema.parse({
        from: '2026-10-09',
        to: '2026-10-08',
        priority: 'LOW',
      }),
    ).toMatchObject({ from: undefined, to: undefined, priority: 'LOW' });
    expect(searchSchema.parse({ from: '2026-10-08' }).from).toBe('2026-10-08');
    expect(searchSchema.parse({ to: '2026-10-08' }).to).toBe('2026-10-08');
  });
});
describe('shared deadline indicators', () => {
  const today = '2026-10-08';
  it.each([
    [null, false, null],
    ['2026-10-07', false, 'overdue'],
    ['2026-10-07', true, 'future'],
    ['2026-10-08', false, 'today'],
    ['2026-10-08', true, 'today'],
    ['2026-10-09', false, 'soon'],
    ['2026-10-15', false, 'soon'],
    ['2026-10-16', false, 'future'],
    ['2026-10-09', true, 'soon'],
  ] as const)(
    'classifies %s with done=%s as %s',
    (dueDate, isDone, expected) => {
      expect(dueState({ dueDate, isDone, today })).toBe(expected);
    },
  );
  it('renders UTC date-only strings without local timezone drift', () => {
    expect(utcDate('2026-10-08')).toBe('2026-10-08');
    expect(utcDate(new Date('2026-10-08T00:00:00Z'))).toBe('2026-10-08');
    expect(utcDate('2026-10-08T01:00:00+07:00')).toBe('2026-10-07');
    expect(
      dueState({ dueDate: new Date('2026-10-08Z'), isDone: false, today }),
    ).toBe('today');
  });
});
describe('project progress', () => {
  it.each([
    [0, 0, 0],
    [0, 3, 0],
    [1, 3, 33],
    [3, 3, 100],
    [-1, 3, 0],
    [4, 3, 100],
    [0, -1, 0],
  ])('computes done=%s total=%s as %s%% safely', (done, total, expected) => {
    expect(progressPercent(done, total)).toBe(expected);
  });
});
