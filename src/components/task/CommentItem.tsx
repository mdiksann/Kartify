'use client';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { updateComment, deleteComment } from '@/actions/comment';
import { updateCommentSchema } from '@/lib/validation/comment';
import type { CommentPage } from '@/lib/board-queries';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ConfirmDelete } from '@/components/ConfirmDelete';
export function CommentItem({
  comment,
  scope,
  actor,
  onChanged,
}: {
  comment: CommentPage['items'][number];
  scope: { slug: string; projectId: string; taskId: string };
  actor: { id: string; role: string };
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  return (
    <li
      id={`comment-${comment.id}`}
      tabIndex={-1}
      className="space-y-3 rounded-lg border border-card-border p-3 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{comment.author.name}</span>
        <time
          dateTime={new Date(comment.createdAt).toISOString()}
          className="text-xs text-gray-500"
        >
          {new Date(comment.createdAt).toISOString().slice(0, 10)}
        </time>
      </div>
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = updateCommentSchema.safeParse({
              ...scope,
              commentId: comment.id,
              body: new FormData(event.currentTarget).get('body'),
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? 'Check the comment.');
              return;
            }
            startTransition(async () => {
              try {
                const result = await updateComment(parsed.data);
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                toast.success('Comment saved');
                setEditing(false);
                await onChanged();
              } catch {
                setError('Could not save the comment. Try again.');
              }
            });
          }}
          className="space-y-3"
        >
          <Label htmlFor={`edit-comment-${comment.id}`}>Edit comment</Label>
          <Textarea
            id={`edit-comment-${comment.id}`}
            name="body"
            defaultValue={comment.body}
            required
            maxLength={5000}
            disabled={pending}
            aria-invalid={!!error}
            aria-describedby={error ? `comment-error-${comment.id}` : undefined}
          />
          <div className="flex gap-2">
            <Button disabled={pending} aria-busy={pending}>
              {pending ? (
                <Loader2 className="animate-spin" aria-label="Saving comment" />
              ) : (
                'Save comment'
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setError('');
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm text-gray-700">
          {comment.body}
        </p>
      )}
      {error && (
        <p
          id={`comment-error-${comment.id}`}
          role="alert"
          className="text-xs text-destructive-text"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {comment.authorId === actor.id && !editing && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => setEditing(true)}
          >
            Edit comment
          </Button>
        )}
        {(comment.authorId === actor.id || actor.role !== 'MEMBER') && (
          <ConfirmDelete
            name="comment"
            label="Delete comment"
            description="This comment will be permanently deleted."
            disabled={pending}
            action={() =>
              deleteComment({
                ...scope,
                commentId: comment.id,
                confirmation: 'DELETE',
              })
            }
            onDeleted={() => {
              void onChanged();
            }}
          />
        )}
      </div>
    </li>
  );
}
