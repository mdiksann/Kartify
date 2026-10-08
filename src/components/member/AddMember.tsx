'use client';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { addMemberByEmail } from '@/actions/member';
import { addMemberSchema } from '@/lib/validation/member';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
export function AddMember({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{
    field?: string;
    message: string;
  } | null>(null);
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Add member</h2>
      <p className="text-xs text-gray-500">
        The person must already have a Kartify account.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
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
            } catch {
              setError({ message: 'Could not add this member. Try again.' });
            }
          });
        }}
      >
        <div className="min-w-0 flex-1">
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
            className="mt-2 h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-blue-600 max-md:min-h-11"
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
        <p id="add-member-error" role="alert" className="text-sm text-red-600">
          {error.message}
        </p>
      )}
    </section>
  );
}
