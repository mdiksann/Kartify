import { expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('next-auth/jwt', () => ({ getToken: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { user: { findUnique: vi.fn() } } }));
const { getToken } = await import('next-auth/jwt');
const { db } = await import('@/lib/db');
const { proxy } = await import('@/proxy');
beforeEach(() => {
  vi.mocked(getToken).mockReset();
  vi.mocked(db.user.findUnique).mockReset();
});
it('redirects a logged-out workspace request and preserves its full return path', async () => {
  vi.mocked(getToken).mockResolvedValue(null);
  const response = await proxy(
    new NextRequest('http://localhost:3000/w/alpha/settings?q=test'),
  );
  expect(response.headers.get('location')).toBe(
    'http://localhost:3000/login?next=%2Fw%2Falpha%2Fsettings%3Fq%3Dtest',
  );
  expect(response.headers.get('x-request-id')).toBeTruthy();
});
it('redirects signed-in auth pages to workspace selection', async () => {
  vi.mocked(getToken).mockResolvedValue({ sub: 'user' });
  vi.mocked(db.user.findUnique).mockResolvedValue({
    id: 'user',
    name: 'Alex',
    email: 'alex@example.com',
    avatar: null,
    avatarType: null,
    passwordHash: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  expect(
    (await proxy(new NextRequest('http://localhost:3000/login'))).headers.get(
      'location',
    ),
  ).toBe('http://localhost:3000/workspaces');
});
it('treats deleted-account tokens as logged out rather than creating a redirect loop', async () => {
  vi.mocked(getToken).mockResolvedValue({ sub: 'deleted' });
  vi.mocked(db.user.findUnique).mockResolvedValue(null);
  expect(
    (await proxy(new NextRequest('http://localhost:3000/login'))).headers.get(
      'location',
    ),
  ).toBeNull();
  expect(
    (
      await proxy(new NextRequest('http://localhost:3000/workspaces'))
    ).headers.get('location'),
  ).toContain('/login?next=');
});
it('leaves public and Auth.js routes alone and replaces client-supplied request IDs', async () => {
  const response = await proxy(
    new NextRequest('http://localhost:3000/api/auth/session', {
      headers: { 'x-request-id': 'forged' },
    }),
  );
  expect(getToken).not.toHaveBeenCalled();
  expect(response.headers.get('location')).toBeNull();
  expect(response.headers.get('x-request-id')).not.toBe('forged');
});
