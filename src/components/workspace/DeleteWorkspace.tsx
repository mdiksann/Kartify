'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteWorkspace } from '@/actions/workspace';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
export function DeleteWorkspace({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
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
        <Button variant="destructive" className="rounded-lg max-md:min-h-11">
          Delete workspace
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete workspace “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            All projects, tasks and history will be permanently deleted. This
            cannot be undone.
          </AlertDialogDescription>
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
            disabled={pending}
            aria-busy={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const result = await deleteWorkspace({
                    slug,
                    confirmation: 'DELETE',
                  });
                  if (!result.ok) {
                    setError(result.message);
                    return;
                  }
                  toast.success('Workspace deleted');
                  setOpen(false);
                  router.push('/workspaces');
                  router.refresh();
                } catch {
                  setError('Could not delete the workspace. Try again.');
                }
              })
            }
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-label="Deleting" />
            ) : (
              'Delete workspace'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
