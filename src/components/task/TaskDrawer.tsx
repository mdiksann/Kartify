'use client';
import { useEffect, useState, useTransition } from 'react';
import { getTaskDetails } from '@/actions/board';
import type { TaskDetailsData } from '@/lib/board-queries';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TaskFields } from './TaskFields';
import { MoveTask } from './MoveTask';
import { CommentList } from './CommentList';
import { ActivityFeed } from './ActivityFeed';
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: TaskDetailsData; revision: number };
export function TaskDrawer({
  scope,
  columns,
  context,
  onClose,
  onMove,
  disabled,
}: {
  scope: { slug: string; projectId: string; taskId: string };
  columns: { id: string; name: string; tasks: { id: string }[] }[];
  context: {
    actor: { id: string; role: string };
    fallbackTitle: string;
    announcement: string;
  };
  onClose: () => void;
  onMove: (taskId: string, columnId: string, index: number) => void;
  disabled: boolean;
}) {
  const { actor, fallbackTitle } = context;
  const [state, setState] = useState<State>({ status: 'loading' });
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState('');
  const { slug, projectId, taskId } = scope;
  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        const result = await getTaskDetails({ slug, projectId, taskId });
        if (cancelled) return;
        setState(
          result.ok
            ? { status: 'ready', data: result.data, revision: 0 }
            : { status: 'error', message: result.message },
        );
      } catch {
        if (!cancelled)
          setState({
            status: 'error',
            message: 'Could not load the task. Try again.',
          });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug, projectId, taskId]);
  async function refresh(commentId?: string) {
    try {
      const result = await getTaskDetails({ ...scope, commentId });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setNotice(
        commentId && !result.data.highlightedComment
          ? 'This comment has been deleted.'
          : '',
      );
      setState((previous) => ({
        status: 'ready',
        data: result.data,
        revision: previous.status === 'ready' ? previous.revision + 1 : 0,
      }));
      if (commentId && result.data.highlightedComment)
        requestAnimationFrame(() => {
          const comment = document.getElementById(`comment-${commentId}`);
          comment?.scrollIntoView({ block: 'nearest' });
          comment?.focus();
        });
    } catch {
      setNotice('Could not refresh the task. Try again.');
    }
  }
  const ready = state.status === 'ready' ? state : null;
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        className="flex w-full flex-col p-0 sm:max-w-md [&>button]:right-3 [&>button]:top-3"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document
            .querySelector<HTMLElement>(`[data-task-id="${taskId}"]`)
            ?.focus();
        }}
      >
        <SheetHeader className="shrink-0 border-b border-gray-200 p-5 pr-16">
          <SheetTitle className="break-words text-xl tracking-tight">
            {ready?.data.task.title ?? fallbackTitle}
          </SheetTitle>
          <SheetDescription>
            Task details, discussion and history.
          </SheetDescription>
        </SheetHeader>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {context.announcement}
        </p>
        <div className="overflow-y-auto p-5">
          {state.status === 'loading' && (
            <div role="status" aria-label="Loading task" className="space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-9 w-full" />
              {['Comments', 'Activity'].map((section) => (
                <div
                  key={section}
                  role="group"
                  aria-label={`Loading ${section.toLowerCase()}`}
                  className="space-y-3 pt-6"
                >
                  <Skeleton className="h-5 w-24" />
                  {[0, 1, 2].map((entry) => (
                    <div key={entry} className="flex gap-3">
                      <Skeleton className="size-7 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {state.status === 'error' && (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-destructive-text">
                {state.message}
              </p>
              <Button
                onClick={() => startTransition(() => refresh())}
                disabled={pending}
              >
                Try again
              </Button>
            </div>
          )}
          {notice && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {notice}
            </p>
          )}
          {ready && (
            <>
              <TaskFields
                key={new Date(ready.data.task.updatedAt).toISOString()}
                scope={scope}
                data={ready.data}
                actor={actor}
                onChanged={() => refresh()}
                onDeleted={onClose}
                disabled={pending || disabled}
              />
              <MoveTask
                key={ready.data.task.columnId}
                taskId={taskId}
                currentColumn={
                  columns.find((column) =>
                    column.tasks.some((task) => task.id === taskId),
                  )?.id ?? ready.data.task.columnId
                }
                columns={columns}
                onMove={(task, column, index) => {
                  onMove(task, column, index);
                  startTransition(() => refresh());
                }}
                disabled={pending || disabled}
              />
              <CommentList
                key={`comments-${ready.data.comments.items.map((comment) => `${comment.id}:${new Date(comment.updatedAt).toISOString()}`).join(',')}-${ready.data.highlightedComment?.id ?? ''}`}
                scope={scope}
                initial={ready.data.comments}
                highlighted={ready.data.highlightedComment}
                actor={actor}
                onChanged={() => refresh()}
              />
              <ActivityFeed
                key={`activity-${ready.revision}`}
                scope={scope}
                initial={ready.data.activities}
                onComment={(id) => startTransition(() => refresh(id))}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
