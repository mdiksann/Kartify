import { describe, expect, it } from 'vitest';
import { monthWindow, shiftMonth, visibleRange } from '@/lib/project-schedule';
import {
  createTaskSchema,
  updateTaskSchema,
  taskScheduleSchema,
} from '@/lib/validation/task';
import { workspaceAppearanceSchema } from '@/lib/validation/workspace';
import { taskChangeEvents } from '@/lib/task-changes';
import { activitySentence } from '@/lib/activity-format';
const scope = {
  slug: 'studio',
  projectId: 'cm123456789012345678901234',
  columnId: 'cm123456789012345678901234',
  taskId: 'cm123456789012345678901234',
};
describe('project schedules', () => {
  it('validates dates and allows incomplete schedules and single-day tasks', () => {
    for (const dates of [
      {},
      { startDate: null, dueDate: null },
      { startDate: '2026-10-08' },
      { dueDate: '2026-10-08' },
      { startDate: '2026-10-08', dueDate: '2026-10-08' },
    ])
      expect(taskScheduleSchema.safeParse(dates).success).toBe(true);
    for (const schema of [createTaskSchema, updateTaskSchema])
      expect(
        schema.safeParse({
          ...scope,
          title: 'Task',
          startDate: '2026-10-09',
          dueDate: '2026-10-08',
        }).success,
      ).toBe(false);
    expect(
      taskScheduleSchema.safeParse({ startDate: '2026-02-30' }).success,
    ).toBe(false);
  });
  it('handles leap months, year transitions and year bounds in UTC', () => {
    expect(monthWindow('2024-02')).toEqual({
      first: '2024-02-01',
      last: '2024-02-29',
      days: 29,
      weekday: 4,
    });
    expect(monthWindow('2025-02').days).toBe(28);
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('0001-01', -1)).toBe('0001-01');
    expect(shiftMonth('9999-12', 1)).toBe('9999-12');
    expect(() => monthWindow('2026-13')).toThrow();
  });
  it('clips ranges to a month, includes both days, and excludes incomplete/outside ranges', () => {
    expect(visibleRange('2026-09-20', '2026-11-03', '2026-10')).toEqual({
      offset: 0,
      length: 31,
    });
    expect(visibleRange('2026-10-08', '2026-10-08', '2026-10')).toEqual({
      offset: 7,
      length: 1,
    });
    expect(visibleRange('2026-10-28', '2026-11-04', '2026-10')).toEqual({
      offset: 27,
      length: 4,
    });
    for (const [start, end] of [
      [null, '2026-10-08'],
      ['2026-10-08', null],
      ['2026-09-01', '2026-09-30'],
      ['2026-11-01', '2026-11-02'],
      ['2026-10-09', '2026-10-08'],
    ] as const)
      expect(visibleRange(start, end, '2026-10')).toBeNull();
  });
  it('records start date changes through the existing activity format', () => {
    const before = {
      title: 'Task',
      description: null,
      priority: 'MEDIUM' as const,
      assigneeId: null,
      assignee: null,
      dueDate: null,
      startDate: null,
    };
    const events = taskChangeEvents(
      before,
      { ...scope, startDate: '2026-10-08' },
      null,
    );
    expect(events).toEqual([
      {
        type: 'TASK_UPDATED',
        data: {
          changes: [{ field: 'startDate', from: null, to: '2026-10-08' }],
        },
      },
    ]);
    expect(activitySentence(events[0])).toBe('updated start date');
    expect(
      taskChangeEvents(
        { ...before, startDate: new Date('2026-10-08T00:00:00Z') },
        { ...scope, startDate: '2026-10-08' },
        null,
      ),
    ).toEqual([]);
  });
  it('rejects arbitrary CSS/colors and invalid workspace targets', () => {
    expect(
      workspaceAppearanceSchema.safeParse({
        slug: 'studio',
        background: 'mint',
      }).success,
    ).toBe(true);
    for (const background of ['#ffffff', 'url(example)', 'red', '', null])
      expect(
        workspaceAppearanceSchema.safeParse({ slug: 'studio', background })
          .success,
      ).toBe(false);
    expect(
      workspaceAppearanceSchema.safeParse({
        slug: '../other',
        background: 'blue',
      }).success,
    ).toBe(false);
  });
});
