'use client';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
}: {
  name: string;
  label: string;
  description: string;
  action: () => Promise<ActionResult<unknown>>;
  onDeleted?: () => void;
  disabled?: boolean;
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
          variant="destructive"
          disabled={disabled}
          className="rounded-lg max-md:min-h-11"
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {label} “{name}”?
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-red-600">
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
