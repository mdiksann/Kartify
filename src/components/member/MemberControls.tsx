'use client';
import { useState, useTransition } from 'react';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { toast } from '@/lib/toast';
import { changeRole, removeMember } from '@/actions/member';
import { changeRoleSchema } from '@/lib/validation/member';
import { ConfirmDelete } from '@/components/ConfirmDelete';
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
export function MemberControls({
  slug,
  member,
}: {
  slug: string;
  member: { id: string; role: 'ADMIN' | 'MEMBER'; user: { name: string } };
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
        <Button
          variant="secondary"
          className="size-11 p-0"
          aria-label={`Manage member ${member.user.name}`}
          title={`Manage member ${member.user.name}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="pr-10">
          <DialogTitle className="break-words">
            Manage {member.user.name}
          </DialogTitle>
          <DialogDescription>
            Change their role or remove their workspace access.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = changeRoleSchema.safeParse({
              slug,
              memberId: member.id,
              role: new FormData(event.currentTarget).get('role'),
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? 'Choose a role.');
              return;
            }
            setError('');
            startTransition(async () => {
              try {
                const result = await changeRole(parsed.data);
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                toast.success('Role updated');
                setOpen(false);
              } catch {
                setError('Could not change this role. Try again.');
              }
            });
          }}
        >
          <div>
            <Label htmlFor={`role-${member.id}`} className="sr-only">
              Role for {member.user.name}
            </Label>
            <select
              id={`role-${member.id}`}
              name="role"
              defaultValue={member.role}
              disabled={pending}
              aria-invalid={!!error}
              aria-describedby={error ? `member-error-${member.id}` : undefined}
              className="h-9 rounded-lg border border-gray-300 bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary max-md:min-h-11"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Button
            variant="secondary"
            disabled={pending}
            aria-busy={pending}
            className="max-md:min-h-11"
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-label="Saving role" />
            ) : (
              'Save role'
            )}
          </Button>
        </form>
        {error && (
          <p
            id={`member-error-${member.id}`}
            role="alert"
            className="text-xs text-destructive-text"
          >
            {error}
          </p>
        )}
        <ConfirmDelete
          name={member.user.name}
          label="Remove member"
          description="They will lose workspace access. Their assigned tasks will become unassigned; comments and history remain."
          disabled={pending}
          action={() => removeMember({ slug, memberId: member.id })}
          onDeleted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
