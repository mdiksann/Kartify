'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import type { BoardColumns } from '@/lib/board-state';
import { monthWindow, shiftMonth, visibleRange } from '@/lib/project-schedule';
import { cn } from '@/lib/utils';
import { utcDate } from '@/lib/task-indicators';

export function ProjectSchedule({
  columns,
  view,
  today,
  onOpen,
}: {
  columns: BoardColumns;
  view: 'timeline' | 'calendar';
  today: string;
  onOpen: (id: string) => void;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const window = monthWindow(month);
  const tasks = columns.flatMap((column) => column.tasks);
  const dates = Array.from(
    { length: window.days },
    (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`,
  );
  const scheduled = tasks.filter((task) =>
    view === 'calendar'
      ? Boolean(task.dueDate)
      : Boolean(task.startDate && task.dueDate),
  );
  const unscheduled = tasks.filter((task) => !scheduled.includes(task));
  const title = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${window.first}T00:00:00Z`));
  const label = (task: (typeof tasks)[number]) =>
    `${task.title} · ${task.column.name}`;
  const tone = (done: boolean) =>
    done ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700';
  const inMonth = scheduled.filter((task) =>
    view === 'calendar'
      ? utcDate(task.dueDate!).startsWith(month)
      : visibleRange(utcDate(task.startDate!), utcDate(task.dueDate!), month),
  );
  return (
    <section
      aria-label={`${view === 'calendar' ? 'Calendar' : 'Timeline'} view`}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 aria-live="polite" className="text-lg font-semibold">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label="Previous month"
            disabled={month === '0001-01'}
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setMonth(today.slice(0, 7))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label="Next month"
            disabled={month === '9999-12'}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {view === 'calendar'
          ? 'Tasks appear on their due date.'
          : 'Each bar spans the start date through the due date, including both days.'}{' '}
        Select a task to edit its dates.
      </p>
      {!inMonth.length && (
        <EmptyState
          compact
          title="No scheduled tasks this month"
          description={
            unscheduled.length
              ? 'Add dates to a task below, or choose another month.'
              : 'Choose another month, or open Board to add and edit task dates.'
          }
        />
      )}
      {view === 'calendar' ? (
        <div className="overflow-x-auto rounded-lg border border-card-border bg-background">
          <table className="w-full min-w-[560px] table-fixed border-collapse text-left">
            <caption className="sr-only">Tasks due in {title}</caption>
            <thead>
              <tr>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                  (day) => (
                    <th
                      key={day}
                      scope="col"
                      className="border-b border-border bg-muted p-3 text-xs font-medium"
                    >
                      {day}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from(
                { length: Math.ceil((window.weekday + window.days) / 7) },
                (_, week) => (
                  <tr key={week}>
                    {Array.from({ length: 7 }, (_, weekday) => {
                      const day = week * 7 + weekday - window.weekday;
                      const date = dates[day];
                      return (
                        <td
                          key={weekday}
                          className="h-28 border-b border-r border-border p-2 align-top last:border-r-0"
                        >
                          {date && (
                            <>
                              <time
                                dateTime={date}
                                className={cn(
                                  'mb-2 inline-flex size-7 items-center justify-center rounded-full text-xs',
                                  date === today &&
                                    'bg-primary font-semibold text-primary-foreground',
                                )}
                              >
                                {day + 1}
                              </time>
                              <ul className="space-y-1">
                                {inMonth
                                  .filter(
                                    (task) => utcDate(task.dueDate!) === date,
                                  )
                                  .map((task) => (
                                    <li key={task.id}>
                                      <button
                                        type="button"
                                        data-task-id={task.id}
                                        onClick={() => onOpen(task.id)}
                                        aria-label={`${label(task)} · Due ${date}`}
                                        className={cn(
                                          'min-h-11 w-full break-words rounded px-2 py-1.5 text-left text-xs',
                                          tone(task.column.isDone),
                                        )}
                                      >
                                        {task.title}
                                      </button>
                                    </li>
                                  ))}
                              </ul>
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-card-border bg-background">
          <div style={{ minWidth: 224 + window.days * 44 }}>
            <div className="flex border-b border-border bg-muted text-xs">
              <span className="w-56 shrink-0 p-3 font-medium">Task</span>
              <div
                className="grid min-w-0 flex-1"
                style={{
                  gridTemplateColumns: `repeat(${window.days}, minmax(0, 1fr))`,
                }}
              >
                {dates.map((date, i) => (
                  <time
                    key={date}
                    dateTime={date}
                    className={cn(
                      'py-3 text-center',
                      date === today &&
                        'bg-primary font-semibold text-primary-foreground',
                    )}
                  >
                    {i + 1}
                  </time>
                ))}
              </div>
            </div>
            <ul>
              {inMonth.map((task) => {
                const range = visibleRange(
                  utcDate(task.startDate!),
                  utcDate(task.dueDate!),
                  month,
                )!;
                return (
                  <li
                    key={task.id}
                    className="flex min-h-16 border-b border-border last:border-b-0"
                  >
                    <div className="w-56 shrink-0 p-3">
                      <button
                        type="button"
                        onClick={() => onOpen(task.id)}
                        className="min-h-11 w-full break-words text-left text-xs font-medium"
                      >
                        {task.title}
                      </button>
                      <p className="text-[11px] text-muted-foreground">
                        {utcDate(task.startDate!)} → {utcDate(task.dueDate!)}
                      </p>
                    </div>
                    <div
                      className="grid min-w-0 flex-1 items-center py-3"
                      style={{
                        gridTemplateColumns: `repeat(${window.days}, minmax(0, 1fr))`,
                      }}
                    >
                      <button
                        type="button"
                        data-task-id={task.id}
                        onClick={() => onOpen(task.id)}
                        aria-label={`${label(task)} · ${utcDate(task.startDate!)} to ${utcDate(task.dueDate!)}`}
                        className={cn(
                          'mx-0.5 min-h-11 min-w-0 rounded-md px-2 text-left text-xs',
                          tone(task.column.isDone),
                        )}
                        style={{
                          gridColumn: `${range.offset + 1} / span ${range.length}`,
                        }}
                      >
                        <span className="block truncate">{task.title}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      {unscheduled.length > 0 && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays aria-hidden="true" className="size-4" />
            {view === 'calendar'
              ? 'Without a due date'
              : 'Needs a start or due date'}{' '}
            <span className="font-normal text-muted-foreground">
              {unscheduled.length}
            </span>
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {unscheduled.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  data-task-id={task.id}
                  onClick={() => onOpen(task.id)}
                  className="min-h-11 w-full rounded-md border border-card-border bg-background p-3 text-left hover:border-primary"
                >
                  <span className="block break-words text-sm font-medium">
                    {task.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {task.column.name} · Add dates
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
