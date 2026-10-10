import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  allow: vi.fn(),
  compare: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ db: { user: { findUnique: mocks.find } } }));
vi.mock('@/lib/rate-limit', () => ({ allowAuthAttempt: mocks.allow }));
vi.mock('bcryptjs', () => ({
  hash: async () => 'dummy-hash',
  compare: mocks.compare,
}));
vi.mock('@/lib/logger', () => ({ log: vi.fn() }));
import { authorizeCredentials } from '@/lib/credentials';
const input = { email: 'alex@example.com', password: 'valid-password' };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.allow.mockReturnValue(true);
  mocks.find.mockResolvedValue({
    id: 'user',
    name: 'Alex',
    email: input.email,
    passwordHash: 'private-hash',
  });
  mocks.compare.mockResolvedValue(true);
});
it('returns only public user fields on valid credentials', async () => {
  expect(
    await authorizeCredentials(
      input,
      new Request('http://localhost', { headers: { 'x-request-id': 'known' } }),
    ),
  ).toEqual({ id: 'user', name: 'Alex', email: input.email });
});
it('uses the dummy hash for missing users and rejects wrong passwords', async () => {
  mocks.find.mockResolvedValueOnce(null);
  expect(
    await authorizeCredentials(input, new Request('http://localhost')),
  ).toBeNull();
  expect(mocks.compare).toHaveBeenLastCalledWith(input.password, 'dummy-hash');
  mocks.compare.mockResolvedValue(false);
  expect(
    await authorizeCredentials(input, new Request('http://localhost')),
  ).toBeNull();
});
it('denies rate-limited or invalid inputs before querying users', async () => {
  mocks.allow.mockReturnValueOnce(false);
  expect(
    await authorizeCredentials(input, new Request('http://localhost')),
  ).toBeNull();
  expect(
    await authorizeCredentials({}, new Request('http://localhost')),
  ).toBeNull();
  expect(mocks.find).not.toHaveBeenCalled();
});
