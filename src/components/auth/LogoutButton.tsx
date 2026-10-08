'use client';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { logout } from '@/actions/auth';
import { Button } from '@/components/ui/button';
export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  return (
    <div>
      <Button
        variant="secondary"
        disabled={pending}
        aria-busy={pending}
        className="rounded-lg max-md:min-h-11"
        onClick={() =>
          startTransition(async () => {
            try {
              await logout();
            } catch {
              setError('Could not log out. Try again.');
            }
          })
        }
      >
        {pending ? (
          <Loader2 className="animate-spin" aria-label="Logging out" />
        ) : (
          'Log out'
        )}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
