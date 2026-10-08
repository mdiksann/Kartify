'use client';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { listActivities } from '@/actions/board';
import { activitySentence, relativeTime } from '@/lib/activity-format';
import type { ActivityPage } from '@/lib/board-queries';
import { Button } from '@/components/ui/button';
export function ActivityFeed({
  scope,
  initial,
  onComment,
}: {
  scope: { slug: string; projectId: string; taskId: string };
  initial: ActivityPage;
  onComment: (id: string) => void;
}) {
  const [page, setPage] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [now] = useState(() => new Date().toISOString());
  return (
    <section className="mt-6 space-y-4">
      <h3 className="text-sm font-semibold">Activity</h3>
      {page.items.length ? (
        <ul className="divide-y divide-gray-100">
          {page.items.map((activity) => (
            <li key={activity.id} className="py-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{activity.actor.name}</span>{' '}
                {activitySentence(activity.event)}
                {activity.event.type === 'COMMENT_ADDED' && (
                  <a
                    className="ml-2 text-primary hover:underline"
                    href={`#comment-${activity.event.data.commentId}`}
                    onClick={(event) => {
                      event.preventDefault();
                      if (activity.event.type === 'COMMENT_ADDED')
                        onComment(activity.event.data.commentId);
                    }}
                  >
                    View comment
                  </a>
                )}
              </p>
              <time
                dateTime={new Date(activity.createdAt).toISOString()}
                title={new Date(activity.createdAt).toISOString()}
                className="text-xs text-gray-500"
              >
                {relativeTime(activity.createdAt, now)}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-xs text-gray-500">
          No activity yet.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      {page.nextCursor && (
        <Button
          variant="secondary"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () => {
              setError('');
              try {
                const result = await listActivities({
                  ...scope,
                  cursor: page.nextCursor,
                });
                if (!result.ok) {
                  setError(result.message);
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
                setError('Could not load activity. Try again.');
              }
            })
          }
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-label="Loading activity" />
          ) : (
            'Load more activity'
          )}
        </Button>
      )}
    </section>
  );
}
