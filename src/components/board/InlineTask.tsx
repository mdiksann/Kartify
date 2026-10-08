'use client';
import { useState, useRef, useId, useEffect, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createTaskSchema } from '@/lib/validation/task';
export function InlineTask({
  scope,
  disabled,
  onCreate,
}: {
  scope: { slug: string; projectId: string; columnId: string };
  disabled: boolean;
  onCreate: (title: string) => Promise<string | null>;
}) {
  const errorId = useId();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!editing && !disabled && restoreFocus.current) {
      addButton.current?.focus();
      restoreFocus.current = false;
    }
  }, [editing, disabled]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createTaskSchema.safeParse({
      ...scope,
      title: new FormData(event.currentTarget).get('title'),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a title.');
      return;
    }
    setSaving(true);
    const failure = await onCreate(parsed.data.title);
    setSaving(false);
    if (failure) {
      setError(failure);
      form.current?.querySelector('textarea')?.focus();
    } else {
      restoreFocus.current = true;
      setEditing(false);
      setError('');
    }
  }
  return editing ? (
    <form ref={form} onSubmit={submit}>
      <Textarea
        disabled={saving}
        autoFocus
        name="title"
        aria-label="New task title"
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        maxLength={200}
        className="border-blue-600 ring-2 ring-blue-600/20"
        onBlur={() => {
          if (saving) return;
          setEditing(false);
          setError('');
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            restoreFocus.current = true;
            setEditing(false);
            setError('');
          } else if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            form.current?.requestSubmit();
          }
        }}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-gray-500">
        {saving ? 'Creating task…' : 'Enter to create · Esc to cancel'}
      </p>
    </form>
  ) : (
    <Button
      ref={addButton}
      variant="ghost"
      disabled={disabled}
      className="w-full justify-start rounded-lg max-md:min-h-11"
      onClick={() => setEditing(true)}
    >
      <Plus />
      Add task
    </Button>
  );
}
