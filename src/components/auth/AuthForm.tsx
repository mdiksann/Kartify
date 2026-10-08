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
        <p className="text-xs text-gray-500">
          Use at least 8 characters and at most 72 bytes for your password.
        </p>
      )}
    </ActionForm>
  );
}
