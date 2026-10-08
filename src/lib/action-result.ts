import 'server-only';
import { headers } from 'next/headers';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AppError, ConflictError, NotFoundError } from './errors';
import { log } from './logger';
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; field?: string; message: string };
export type FormState = ActionResult | null;
export async function actionFailure(
  error: unknown,
  route: string,
): Promise<{ ok: false; field?: string; message: string }> {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return {
      ok: false,
      field: issue?.path[0]?.toString(),
      message: issue?.message ?? 'Check the submitted values.',
    };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') error = new ConflictError();
    else if (error.code === 'P2025') error = new NotFoundError();
    else if (error.code === 'P2034')
      error = new ConflictError('Another change happened. Try again.');
  }
  const requestId =
    (await headers()).get('x-request-id') ?? crypto.randomUUID();
  if (error instanceof AppError) {
    log('warn', 'Action rejected', { route, requestId });
    return { ok: false, message: error.message };
  }
  log('error', 'Unexpected action failure', { route, requestId });
  // Keep raw DB/request values out of the error boundary and client payload.
  throw new Error(`Unable to complete this request. Reference: ${requestId}`);
}
export async function authLog(event: string, userId?: string) {
  log('info', event, {
    route: '/auth',
    requestId: (await headers()).get('x-request-id') ?? crypto.randomUUID(),
    userId,
  });
}
