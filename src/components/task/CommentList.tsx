'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createComment } from '@/actions/comment';
import { listComments } from '@/actions/board';
import { createCommentSchema } from '@/lib/validation/comment';
import type { CommentPage, TaskDetailsData } from '@/lib/board-queries';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CommentItem } from './CommentItem';
export function CommentList({
  scope,
  initial,
  highlighted,
  actor,
  onChanged,
}: {
  scope: { slug: string; projectId: string; taskId: string };
  initial: CommentPage;
  highlighted: TaskDetailsData['highlightedComment'];
  actor: { id: string; role: string };
  onChanged: () => Promise<void>;
}) {
  const [page, setPage] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{
    field?: string;
    message: string;
  } | null>(null);
  const items =
    highlighted && !page.items.some((item) => item.id === highlighted.id)
      ? [highlighted, ...page.items]
      : page.items;
  return (
    <section className="mt-6 space-y-4">
      <h3 className="text-sm font-semibold">Comments</h3>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const form = event.currentTarget;
          const parsed = createCommentSchema.safeParse({
            ...scope,
            body: new FormData(form).get('body'),
          });
          if (!parsed.success) {
            setError({
              field: 'body',
              message: parsed.error.issues[0]?.message ?? 'Check the comment.',
            });
            form.querySelector('textarea')?.focus();
            return;
          }
          startTransition(async () => {
            try {
              const result = await createComment(parsed.data);
              if (!result.ok) {
                setError(result);
                return;
              }
              form.reset();
              toast.success('Comment added');
              await onChanged();
            } catch {
              setError({ message: 'Could not add the comment. Try again.' });
            }
          });
        }}
      >
        <Label htmlFor="comment-body">Add a comment</Label>
        <Textarea
          id="comment-body"
          name="body"
          placeholder="Write a comment…"
          required
          maxLength={5000}
          disabled={pending}
          aria-invalid={error?.field === 'body'}
          aria-describedby={
            error?.field === 'body' ? 'comment-list-error' : undefined
          }
        />
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? (
            <Loader2 className="animate-spin" aria-label="Saving" />
          ) : (
            'Add comment'
          )}
        </Button>
      </form>
      {error && (
        <p
          id="comment-list-error"
          role="alert"
          className="text-xs text-red-600"
        >
          {error.message}
        </p>
      )}
      {items.length ? (
        <ul className="space-y-3">
          {items.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              scope={scope}
              actor={actor}
              onChanged={onChanged}
            />
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-xs text-gray-500">
          No comments yet. Start the discussion above.
        </p>
      )}
      {page.nextCursor && (
        <Button
          variant="secondary"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                const result = await listComments({
                  ...scope,
                  cursor: page.nextCursor,
                });
                if (!result.ok) {
                  setError(result);
                  return;
                }
                setPage({
                  items: [
                    ...page.items,
                    ...result.data.items.filter(
                      (item) =>
                        !page.items.some((existing) => existing.id === item.id),
                    ),
                  ],
                  nextCursor: result.data.nextCursor,
                });
              } catch {
                setError({ message: 'Could not load comments. Try again.' });
              }
            })
          }
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-label="Loading comments" />
          ) : (
            'Load more comments'
          )}
        </Button>
      )}
    </section>
  );
}
