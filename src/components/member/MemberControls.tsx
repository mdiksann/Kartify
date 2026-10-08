'use client';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { changeRole, removeMember } from '@/actions/member';
import { changeRoleSchema } from '@/lib/validation/member';
import { ConfirmDelete } from '@/components/ConfirmDelete';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
export function MemberControls({
  slug,
  member,
}: {
  slug: string;
  member: { id: string; role: 'ADMIN' | 'MEMBER'; user: { name: string } };
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  return (
    <div className="relative space-y-2">
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
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-blue-600 max-md:min-h-11"
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
          className="text-xs text-red-600"
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
      />
    </div>
  );
}
