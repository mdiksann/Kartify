'use client';
import { useState, useTransition } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from '@/lib/toast';
import { addMemberByEmail } from '@/actions/member';
import { addMemberSchema } from '@/lib/validation/member';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export function AddMember({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{
    field?: string;
    message: string;
  } | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="size-11 p-0"
          aria-label="Add member"
          title="Add member"
        >
          <UserPlus aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            The person must already have a Kartify account.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const form = event.currentTarget;
            const parsed = addMemberSchema.safeParse({
              slug,
              ...Object.fromEntries(new FormData(form)),
            });
            if (!parsed.success) {
              const issue = parsed.error.issues[0];
              setError({
                field: issue?.path[0]?.toString(),
                message: issue?.message ?? 'Check the member details.',
              });
              form.querySelector('input')?.focus();
              return;
            }
            startTransition(async () => {
              try {
                const result = await addMemberByEmail(parsed.data);
                if (!result.ok) {
                  setError(result);
                  return;
                }
                form.reset();
                toast.success('Member added');
                setOpen(false);
              } catch {
                setError({ message: 'Could not add this member. Try again.' });
              }
            });
          }}
        >
          <div className="min-w-0">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              disabled={pending}
              aria-invalid={error?.field === 'email'}
              aria-describedby={error ? 'add-member-error' : undefined}
              className="mt-2 max-md:min-h-11"
            />
          </div>
          <div>
            <Label htmlFor="member-role">Role</Label>
            <select
              id="member-role"
              name="role"
              aria-invalid={error?.field === 'role'}
              aria-describedby={error ? 'add-member-error' : undefined}
              disabled={pending}
              className="mt-2 block h-9 w-full rounded-lg border border-gray-300 bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary max-md:min-h-11"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Button
            disabled={pending}
            aria-busy={pending}
            className="max-md:min-h-11"
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-label="Adding member" />
            ) : (
              'Add member'
            )}
          </Button>
        </form>
        {error && (
          <p
            id="add-member-error"
            role="alert"
            className="text-sm text-destructive-text"
          >
            {error.message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
