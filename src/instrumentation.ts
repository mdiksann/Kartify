import type { Instrumentation } from 'next';
import { log } from '@/lib/logger';
export const onRequestError: Instrumentation.onRequestError = (
  _error,
  request,
) => {
  const requestId = request.headers['x-request-id'];
  log('error', 'Unexpected request failure', {
    requestId: typeof requestId === 'string' ? requestId : crypto.randomUUID(),
    route: request.path.split('?')[0] ?? '/',
  });
};
