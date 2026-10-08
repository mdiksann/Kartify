'use client';
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { FormState } from '@/lib/action-result';
type Field = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  defaultValue?: string;
};
export function ActionForm({
  action,
  schema,
  fields,
  hidden,
  label,
  success,
  children,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  schema: z.ZodType;
  fields: Field[];
  hidden?: Record<string, string>;
  label: string;
  success?: string;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [clientError, setClientError] = useState<FormState>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const error = clientError ?? (state?.ok === false ? state : null);
  useEffect(() => {
    if (state?.ok && success) toast.success(success);
    if (state?.ok === false) {
      const target = state.field
        ? formRef.current?.elements.namedItem(state.field)
        : null;
      if (target instanceof HTMLElement) target.focus();
      else
        formRef.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
    }
  }, [state, success]);
  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        setClientError(null);
        const parsed = schema.safeParse(
          Object.fromEntries(new FormData(event.currentTarget)),
        );
        if (!parsed.success) {
          event.preventDefault();
          const issue = parsed.error.issues[0];
          const field = issue?.path[0]?.toString();
          setClientError({
            ok: false,
            field,
            message: issue?.message ?? 'Check the submitted values.',
          });
          const control = field
            ? event.currentTarget.elements.namedItem(field)
            : null;
          if (control instanceof HTMLElement) control.focus();
        }
      }}
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {fields.map((field) => (
        <div key={field.name}>
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            {...field}
            id={field.name}
            required
            disabled={pending}
            className="mt-2 max-md:min-h-11"
            aria-invalid={error?.ok === false && error.field === field.name}
            aria-describedby={
              error?.ok === false && error.field === field.name
                ? `${field.name}-error`
                : undefined
            }
          />
          {error?.ok === false && error.field === field.name && (
            <p
              id={`${field.name}-error`}
              role="alert"
              className="mt-2 text-xs text-red-600"
            >
              {error.message}
            </p>
          )}
        </div>
      ))}
      {error?.ok === false &&
        !fields.some((field) => field.name === error.field) && (
          <p
            role="alert"
            tabIndex={-1}
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error.message}
          </p>
        )}
      {children}
      <Button
        disabled={pending}
        aria-busy={pending}
        className="min-w-32 rounded-lg max-md:min-h-11"
        type="submit"
      >
        {pending ? (
          <Loader2 className="animate-spin" aria-label="Saving" />
        ) : (
          label
        )}
      </Button>
    </form>
  );
}
