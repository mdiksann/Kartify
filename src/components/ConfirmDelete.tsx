'use client';
import { useState, useTransition } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from './ui/alert-dialog';
import type { ActionResult } from '@/lib/action-result';
export function ConfirmDelete({
  name,
  label,
  description,
  action,
  onDeleted,
  disabled,
  iconOnly = false,
}: {
  name: string;
  label: string;
  description: string;
  action: () => Promise<ActionResult<unknown>>;
  onDeleted?: () => void;
  disabled?: boolean;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError('');
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant={iconOnly ? 'outline' : 'destructive'}
          disabled={disabled}
          aria-label={iconOnly ? label : undefined}
          aria-description={iconOnly ? name : undefined}
          title={iconOnly ? `${label} ${name}` : undefined}
          className={
            iconOnly
              ? 'size-11 shrink-0 rounded-md p-0 text-destructive hover:bg-destructive-subtle hover:text-destructive'
              : 'rounded-lg max-md:min-h-11'
          }
        >
          {iconOnly ? <Trash2 aria-hidden="true" /> : label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">
            {label} “{name}”?
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive-text">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            aria-busy={pending}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const result = await action();
                  if (!result.ok) {
                    setError(result.message);
                    return;
                  }
                  toast.success(
                    `${label.replace('Delete', 'Deleted').replace('Remove', 'Removed')}`,
                  );
                  setOpen(false);
                  onDeleted?.();
                } catch {
                  setError('Could not delete this item. Try again.');
                }
              })
            }
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-label="Deleting" />
            ) : (
              label
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
