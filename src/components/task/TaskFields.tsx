'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { updateTask, deleteTask } from '@/actions/task';
import { updateTaskSchema, priorities } from '@/lib/validation/task';
import type { TaskDetailsData } from '@/lib/board-queries';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DueBadge } from './DueBadge';
import { PriorityBadge } from './PriorityBadge';
import { utcDate } from '@/lib/task-indicators';
import { ConfirmDelete } from '@/components/ConfirmDelete';
const selectClass =
  'mt-2 h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 max-md:min-h-11';
export function TaskFields({
  scope,
  data,
  actor,
  onChanged,
  onDeleted,
  disabled,
}: {
  scope: { slug: string; projectId: string; taskId: string };
  data: TaskDetailsData;
  actor: { id: string; role: string };
  onChanged: () => Promise<void>;
  onDeleted: () => void;
  disabled: boolean;
}) {
  const [error, setError] = useState<{
    field?: string;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const task = data.task;
  const errorProps = (field: string) => ({
    'aria-invalid': error?.field === field,
    'aria-describedby': error?.field === field ? 'task-field-error' : undefined,
  });
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DueBadge
          dueDate={task.dueDate}
          isDone={task.column.isDone}
          today={data.today}
        />
        <PriorityBadge priority={task.priority} />
      </div>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const form = event.currentTarget;
          const raw = Object.fromEntries(new FormData(form));
          const parsed = updateTaskSchema.safeParse({
            ...scope,
            ...raw,
            assigneeId: raw.assigneeId || null,
            dueDate: raw.dueDate || null,
          });
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const field = issue?.path[0]?.toString();
            setError({
              field,
              message: issue?.message ?? 'Check the task fields.',
            });
            const input = field ? form.elements.namedItem(field) : null;
            if (input instanceof HTMLElement) input.focus();
            return;
          }
          startTransition(async () => {
            try {
              const result = await updateTask(parsed.data);
              if (!result.ok) {
                setError(result);
                const input = result.field
                  ? form.elements.namedItem(result.field)
                  : null;
                if (input instanceof HTMLElement) input.focus();
                return;
              }
              toast.success('Task saved');
              await onChanged();
            } catch {
              setError({ message: 'Could not save the task. Try again.' });
            }
          });
        }}
      >
        <div>
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            name="title"
            defaultValue={task.title}
            required
            maxLength={200}
            disabled={pending || disabled}
            {...errorProps('title')}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="task-description">Description</Label>
          <Textarea
            id="task-description"
            name="description"
            defaultValue={task.description ?? ''}
            maxLength={10_000}
            disabled={pending || disabled}
            {...errorProps('description')}
            className="mt-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="task-assignee">Assignee</Label>
            <select
              id="task-assignee"
              name="assigneeId"
              defaultValue={task.assigneeId ?? ''}
              disabled={pending || disabled}
              {...errorProps('assigneeId')}
              className={selectClass}
            >
              <option value="">Unassigned</option>
              {data.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="task-priority">Priority</Label>
            <select
              id="task-priority"
              name="priority"
              defaultValue={task.priority}
              disabled={pending || disabled}
              {...errorProps('priority')}
              className={selectClass}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0) + priority.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="task-due-date">Due date</Label>
            <Input
              id="task-due-date"
              name="dueDate"
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              defaultValue={task.dueDate ? utcDate(task.dueDate) : ''}
              disabled={pending || disabled}
              {...errorProps('dueDate')}
              className="mt-2"
            />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Status</span>
            <p className="mt-2 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
              {task.column.name}
            </p>
          </div>
        </div>
        {error && (
          <p
            id="task-field-error"
            role="alert"
            className="text-xs text-red-600"
          >
            {error.message}
          </p>
        )}
        <Button
          type="submit"
          disabled={pending || disabled}
          aria-busy={pending}
          className="rounded-lg max-md:min-h-11"
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-label="Saving" />
          ) : (
            'Save task'
          )}
        </Button>
      </form>
      {(actor.role !== 'MEMBER' || task.createdBy === actor.id) && (
        <div className="mt-6">
          <ConfirmDelete
            name={task.title}
            label="Delete task"
            description="This task, its comments and history will be permanently deleted."
            disabled={pending || disabled}
            action={() => deleteTask({ ...scope, confirmation: 'DELETE' })}
            onDeleted={onDeleted}
          />
        </div>
      )}
    </>
  );
}
