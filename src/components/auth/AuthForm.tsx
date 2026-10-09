'use client';
import { ActionForm } from '@/components/ActionForm';
import { login, register } from '@/actions/auth';
import { loginSchema, registerSchema } from '@/lib/validation/auth';
export function AuthForm({
  mode,
  next,
}: {
  mode: 'login' | 'register';
  next: string;
}) {
  return (
    <div className="[&_button[type=submit]]:h-11 [&_button[type=submit]]:w-full [&_button[type=submit]]:text-base [&_form]:mt-4 [&_form]:space-y-4 [&_input]:h-11 [&_input]:text-base [&_label]:text-sm">
      <ActionForm
        action={mode === 'login' ? login : register}
        schema={mode === 'login' ? loginSchema : registerSchema}
        hidden={{ next }}
        label={mode === 'login' ? 'Log in' : 'Create account'}
        fields={[
          ...(mode === 'register'
            ? [
                {
                  name: 'name',
                  label: 'Name',
                  autoComplete: 'name',
                  maxLength: 80,
                },
              ]
            : []),
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            autoComplete: 'email',
            maxLength: 254,
          },
          {
            name: 'password',
            label: 'Password',
            type: 'password',
            autoComplete:
              mode === 'register' ? 'new-password' : 'current-password',
            maxLength: 72,
          },
        ]}
      >
        {mode === 'register' && (
          <p className="text-xs leading-5 text-muted-foreground">
            Use at least 8 characters and at most 72 bytes for your password.
          </p>
        )}
      </ActionForm>
    </div>
  );
}
