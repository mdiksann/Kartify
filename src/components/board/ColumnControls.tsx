'use client';
import { useState, useTransition } from 'react';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createColumn,
  renameColumn,
  setColumnDone,
  deleteColumn,
} from '@/actions/column';
import {
  createColumnSchema,
  renameColumnSchema,
} from '@/lib/validation/column';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConfirmDelete } from '@/components/ConfirmDelete';
export function ColumnControls({
  scope,
  column,
  disabled,
  onReorder,
}: {
  scope: { slug: string; projectId: string };
  column?: { id: string; name: string; isDone: boolean };
  disabled?: boolean;
  onReorder?: (direction: 'left' | 'right') => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError('');
        }
      }}
    >
      <DialogTrigger asChild>
        {column ? (
          <Button
            variant="ghost"
            size="icon"
            className="max-md:size-11"
            aria-label={`Manage column ${column.name}`}
            disabled={disabled}
          >
            <MoreHorizontal />
          </Button>
        ) : (
          <Button variant="secondary" disabled={disabled}>
            Add column
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{column ? 'Manage column' : 'Add column'}</DialogTitle>
          <DialogDescription>
            {column
              ? 'Rename, reorder or mark this column as done.'
              : 'Choose a name for the new column.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const values = {
              ...scope,
              columnId: column?.id,
              name: new FormData(event.currentTarget).get('name'),
            };
            const parsed = (
              column ? renameColumnSchema : createColumnSchema
            ).safeParse(values);
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? 'Check the name.');
              return;
            }
            startTransition(async () => {
              try {
                const result = column
                  ? await renameColumn(parsed.data)
                  : await createColumn(parsed.data);
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                toast.success(column ? 'Column renamed' : 'Column created');
                setOpen(false);
              } catch {
                setError('Could not save the column. Try again.');
              }
            });
          }}
        >
          <div>
            <Label htmlFor={`column-name-${column?.id ?? 'new'}`}>
              Column name
            </Label>
            <Input
              id={`column-name-${column?.id ?? 'new'}`}
              name="name"
              defaultValue={column?.name}
              maxLength={80}
              required
              disabled={pending}
              aria-invalid={!!error}
              aria-describedby={error ? 'column-error' : undefined}
            />
          </div>
          {error && (
            <p id="column-error" role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          <Button disabled={pending} aria-busy={pending}>
            {pending ? (
              <Loader2 className="animate-spin" aria-label="Saving" />
            ) : (
              'Save column'
            )}
          </Button>
        </form>
        {column && (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <Button
              variant="secondary"
              disabled={pending || disabled}
              aria-busy={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    const result = await setColumnDone({
                      ...scope,
                      columnId: column.id,
                      isDone: !column.isDone,
                    });
                    if (!result.ok) {
                      setError(result.message);
                      return;
                    }
                    toast.success('Column updated');
                    setOpen(false);
                  } catch {
                    setError('Could not update the column. Try again.');
                  }
                })
              }
            >
              {pending ? (
                <Loader2
                  className="animate-spin"
                  aria-label="Updating column"
                />
              ) : column.isDone ? (
                'Mark as not done'
              ) : (
                'Mark as done'
              )}
            </Button>
            {onReorder && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={pending || disabled}
                  onClick={() => {
                    onReorder('left');
                    setOpen(false);
                  }}
                >
                  Move left
                </Button>
                <Button
                  variant="secondary"
                  disabled={pending || disabled}
                  onClick={() => {
                    onReorder('right');
                    setOpen(false);
                  }}
                >
                  Move right
                </Button>
              </div>
            )}
            <ConfirmDelete
              name={column.name}
              label="Delete column"
              description="All tasks, comments and history in this column will be permanently deleted."
              disabled={pending || disabled}
              action={() =>
                deleteColumn({
                  ...scope,
                  columnId: column.id,
                  confirmation: 'DELETE',
                })
              }
              onDeleted={() => setOpen(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
