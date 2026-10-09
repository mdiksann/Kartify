import { activityPayloadSchema } from './validation/activity';
export function activitySentence(input: unknown): string {
  const result = activityPayloadSchema.safeParse(input);
  if (!result.success) return 'An activity entry is unavailable.';
  const event = result.data;
  switch (event.type) {
    case 'TASK_CREATED':
      return `created “${event.data.title}”`;
    case 'TASK_UPDATED':
      return `updated ${event.data.changes.map((change) => (change.field === 'startDate' ? 'start date' : change.field)).join(' and ')}`;
    case 'TASK_MOVED':
      return `moved from ${event.data.fromColumn} to ${event.data.toColumn}`;
    case 'TASK_ASSIGNED':
      return event.data.to
        ? `assigned to ${event.data.to}`
        : 'removed the assignee';
    case 'TASK_PRIORITY_CHANGED':
      return `changed priority to ${event.data.to?.toLowerCase()}`;
    case 'TASK_DUE_DATE_CHANGED':
      return event.data.to
        ? `set the due date to ${event.data.to}`
        : 'removed the due date';
    case 'COMMENT_ADDED':
      return 'added a comment';
    case 'COMMENT_UPDATED':
      return 'edited a comment';
    case 'COMMENT_DELETED':
      return 'deleted a comment';
  }
}
export function relativeTime(date: Date | string, now: Date | string): string {
  const seconds = Math.max(
    0,
    Math.floor((new Date(now).getTime() - new Date(date).getTime()) / 1000),
  );
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
