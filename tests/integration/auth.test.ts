import 'dotenv/config';
import {
  beforeAll,
  afterEach,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { hash } from 'bcryptjs';
import { testDatabaseUrl } from './database-url';
const runtime = vi.hoisted(() => ({
  ip: 'auth-test',
  cookies: new Map<
    string,
    { value: string; options: Record<string, unknown> }
  >(),
}));
vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers({
      host: 'localhost:3000',
      'x-forwarded-proto':
        process.env.NODE_ENV === 'production' ? 'https' : 'http',
      'x-forwarded-for': runtime.ip,
      'x-request-id': 'auth-integration',
      cookie: [...runtime.cookies]
        .map(([name, c]) => `${name}=${c.value}`)
        .join('; '),
    }),
  cookies: async () => ({
    set: (name: string, value: string, options: Record<string, unknown>) => {
      runtime.cookies.set(name, { value, options });
    },
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.stubEnv(
  'DATABASE_URL',
  testDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL),
);
vi.stubEnv(
  'AUTH_SECRET',
  'integration-only-stable-secret-at-least-32-characters',
);
vi.stubEnv('AUTH_TRUST_HOST', 'true');
vi.stubEnv('AUTH_TRUST_PROXY', 'true');
const { db } = await import('@/lib/db');
const { register, login, logout } = await import('@/actions/auth');
const { getCurrentUser, handlers } = await import('@/lib/auth');
const { NextRequest } = await import('next/server');
const email = `auth-${crypto.randomUUID()}@example.com`;
const password = 'valid-password123';
function form(data: Record<string, string>) {
  const result = new FormData();
  for (const [k, v] of Object.entries(data)) result.set(k, v);
  return result;
}
let baselineHash: string;
beforeEach(async () => {
  runtime.ip = crypto.randomUUID();
  runtime.cookies.clear();
  await db.user.create({
    data: { name: 'Alex', email, passwordHash: baselineHash },
  });
});
beforeAll(async () => {
  baselineHash = await hash(password, 12);
});
afterEach(async () => {
  await db.user.deleteMany({ where: { email } });
});
afterAll(async () => {
  await db.user.deleteMany({ where: { email } });
  await db.$disconnect();
  vi.unstubAllEnvs();
});
describe('registration, Auth.js JWT sessions and logout against Postgres', () => {
  it('registers with normalized email and bcrypt cost 12, automatically logs in, and returns no password', async () => {
    await db.user.deleteMany({ where: { email } });
    await expect(
      register(
        null,
        form({ name: ' Alex ', email: ` ${email.toUpperCase()} `, password }),
      ),
    ).rejects.toThrow('REDIRECT:/workspaces');
    const stored = await db.user.findUniqueOrThrow({ where: { email } });
    expect(stored.name).toBe('Alex');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(stored.passwordHash).not.toBe(password);
    const current = await getCurrentUser();
    expect(current?.id).toBe(stored.id);
    expect(current).not.toHaveProperty('passwordHash');
    const cookie = runtime.cookies.get('authjs.session-token');
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });
  });
  it('rejects duplicates generically and invalid inputs without writing users', async () => {
    const duplicate = await register(
      null,
      form({ name: 'Other', email, password }),
    );
    expect(duplicate).toEqual({
      ok: false,
      message: 'Unable to create an account with these details.',
    });
    expect(JSON.stringify(duplicate)).not.toContain('registered');
    const invalid = await register(
      null,
      form({ name: '', email, password: 'weak' }),
    );
    expect(invalid?.ok).toBe(false);
    expect(await db.user.count({ where: { email } })).toBe(1);
    const badPassword = await register(
      null,
      form({
        name: 'Alex',
        email: 'invalid-input@example.com',
        password: 'a'.repeat(73),
      }),
    );
    expect(badPassword).toMatchObject({ ok: false, field: 'password' });
  });
  it('gives the same failure for wrong passwords and unknown users', async () => {
    const wrong = await login(
      null,
      form({ email, password: 'wrong-password' }),
    );
    const unknown = await login(
      null,
      form({
        email: 'unknown-auth-user@example.com',
        password: 'wrong-password',
      }),
    );
    expect(wrong).toEqual({ ok: false, message: 'Invalid email or password.' });
    expect(unknown).toEqual(wrong);
    expect(await getCurrentUser()).toBeNull();
  });
  it('signs in, survives subsequent session reads and handlers, honors a safe next, and logs out', async () => {
    await expect(
      login(
        null,
        form({ email, password, next: '/w/alpha/settings?tab=name' }),
      ),
    ).rejects.toThrow('REDIRECT:/w/alpha/settings?tab=name');
    expect((await getCurrentUser())?.email).toBe(email);
    expect((await getCurrentUser())?.email).toBe(email);
    const response = await handlers.GET(
      new NextRequest('http://localhost:3000/api/auth/session', {
        headers: {
          cookie: [...runtime.cookies]
            .map(([name, c]) => `${name}=${c.value}`)
            .join('; '),
        },
      }),
    );
    const session = await response.json();
    expect(session.user.email).toBe(email);
    expect(session.user).not.toHaveProperty('passwordHash');
    await expect(logout()).rejects.toThrow('REDIRECT:/login');
    expect(runtime.cookies.get('authjs.session-token')?.value).toBe('');
    expect(await getCurrentUser()).toBeNull();
  });
  it('sanitizes external return URLs', async () => {
    await expect(
      login(null, form({ email, password, next: '//evil.example' })),
    ).rejects.toThrow('REDIRECT:/workspaces');
  });
  it('limits login and registration per IP and also protects direct Auth.js credential callbacks', async () => {
    for (let i = 0; i < 10; i++)
      expect(
        (await login(null, form({ email, password: 'wrong-password' })))?.ok,
      ).toBe(false);
    await expect(login(null, form({ email, password }))).resolves.toEqual({
      ok: false,
      message: 'Invalid email or password.',
    });
    expect(
      await register(
        null,
        form({ name: 'A', email: 'limited@example.com', password }),
      ),
    ).toEqual({
      ok: false,
      message: 'Too many attempts. Try again in a minute.',
    });
    expect(
      await db.user.findUnique({ where: { email: 'limited@example.com' } }),
    ).toBeNull();
    const { authorizeCredentials } = await import('@/lib/credentials');
    expect(
      await authorizeCredentials(
        { email, password },
        new Request('http://localhost:3000/api/auth/callback/credentials', {
          headers: { 'x-forwarded-for': runtime.ip },
        }),
      ),
    ).toBeNull();
  });
  it('validates login fields and rate-limits malformed requests too', async () => {
    for (let i = 0; i < 10; i++)
      expect(await login(null, form({ email, password: '' }))).toMatchObject({
        ok: false,
        field: 'password',
      });
    expect(await login(null, form({ email, password }))).toEqual({
      ok: false,
      message: 'Invalid email or password.',
    });
  });
  it('sets secure, httpOnly, lax cookies in production and can decode them with the same secret after a module reload', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const productionAuth = await import('@/lib/auth');
    const productionDb = (await import('@/lib/db')).db;
    try {
      await productionAuth.signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      expect(
        runtime.cookies.get('__Secure-authjs.session-token')?.options,
      ).toMatchObject({ secure: true, httpOnly: true, sameSite: 'lax' });
      vi.resetModules();
      const reloadedAuth = await import('@/lib/auth');
      const reloadedDb = (await import('@/lib/db')).db;
      try {
        expect((await reloadedAuth.getCurrentUser())?.email).toBe(email);
      } finally {
        await reloadedDb.$disconnect();
      }
      await productionAuth.signOut({ redirect: false });
      expect(runtime.cookies.get('__Secure-authjs.session-token')?.value).toBe(
        '',
      );
    } finally {
      await productionDb.$disconnect();
      vi.stubEnv('NODE_ENV', 'test');
    }
  });
});
