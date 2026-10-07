type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type LogContext = {
  requestId: string;
  route: string;
  userId?: string;
  workspaceId?: string;
  durationMs?: number;
};
// Call sites supply fixed event messages, never request bodies or error messages.
export function log(level: LogLevel, msg: string, context: LogContext): void {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;
  const fields = {
    level,
    msg,
    requestId: context.requestId,
    route: context.route,
    userId: context.userId,
    workspaceId: context.workspaceId,
    durationMs: context.durationMs,
  };
  const output =
    process.env.NODE_ENV === 'production'
      ? JSON.stringify(fields)
      : `[${level}] ${msg} ${JSON.stringify(fields)}`;
  console[level](output);
}
