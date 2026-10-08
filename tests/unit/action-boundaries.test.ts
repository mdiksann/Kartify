import { afterEach, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AuthError } from '@/lib/errors';
import { actionFailure, authLog } from '@/lib/action-result';
import { authIp } from '@/lib/auth-ip';
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-request-id': 'unit-request' }),
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it('trusts an IP only from an explicitly configured proxy and otherwise uses a shared bucket', () => {
  const headers = new Headers({ 'x-forwarded-for': ' 192.0.2.1, 192.0.2.2' });
  vi.stubEnv('AUTH_TRUST_PROXY', 'false');
  expect(authIp(headers)).toBe('unknown');
  vi.stubEnv('AUTH_TRUST_PROXY', 'true');
  expect(authIp(headers)).toBe('192.0.2.1');
  expect(authIp(new Headers())).toBe('unknown');
  expect(authIp(new Headers({ 'x-forwarded-for': ' ' }))).toBe('unknown');
});
it('returns field errors and safe app/Prisma messages', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const parsed = z
    .object({ name: z.string().min(1, 'Enter a name.') })
    .safeParse({ name: '' });
  if (parsed.success) throw new Error('Expected invalid input');
  expect(await actionFailure(parsed.error, '/test')).toEqual({
    ok: false,
    field: 'name',
    message: 'Enter a name.',
  });
  expect(await actionFailure(new AuthError(), '/test')).toEqual({
    ok: false,
    message: 'Please log in to continue.',
  });
  for (const [code, message] of [
    ['P2002', 'This change conflicts with existing data.'],
    ['P2025', 'The requested resource was not found.'],
    ['P2034', 'Another change happened. Try again.'],
  ]) {
    expect(
      await actionFailure(
        new Prisma.PrismaClientKnownRequestError('private database text', {
          code: code!,
          clientVersion: '6',
        }),
        '/test',
      ),
    ).toEqual({ ok: false, message });
  }
});
it('logs and sanitizes unexpected errors with a reference, never their private contents', async () => {
  const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(
    actionFailure(new Error('private password and DB query'), '/test'),
  ).rejects.toThrow('Reference: unit-request');
  expect(JSON.stringify(logger.mock.calls)).not.toContain('private password');
  expect(JSON.stringify(logger.mock.calls)).toContain('unit-request');
});
it('auth logs contain user IDs and correlation IDs only', async () => {
  const logger = vi.spyOn(console, 'info').mockImplementation(() => {});
  await authLog('User logged out', 'user-id');
  expect(JSON.stringify(logger.mock.calls)).toContain('user-id');
  expect(JSON.stringify(logger.mock.calls)).toContain('unit-request');
});
