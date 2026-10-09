import 'dotenv/config';
import { beforeAll, afterAll, beforeEach, expect, it, vi } from 'vitest';
import { compare, hash } from 'bcryptjs';
import { testDatabaseUrl } from './database-url';
const runtime = vi.hoisted(() => ({
  user: null as { id: string; name: string; email: string } | null,
}));
vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => runtime.user }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-request-id': 'account-test' }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.stubEnv(
  'DATABASE_URL',
  testDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL),
);
const { db } = await import('@/lib/db');
const { updateProfile, changePassword } = await import('@/actions/account');
const { GET } = await import('@/app/api/account/avatar/route');
const { MAX_AVATAR_BYTES } = await import('@/lib/validation/account');
let user: { id: string; name: string; email: string };
let other: typeof user;
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
function form(values: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
beforeAll(async () => {
  user = await db.user.create({
    data: {
      name: 'Alex',
      email: `account-${crypto.randomUUID()}@example.test`,
      passwordHash: await hash('old-password', 12),
    },
  });
  other = await db.user.create({
    data: {
      name: 'Other',
      email: `account-${crypto.randomUUID()}@example.test`,
      passwordHash: await hash('other-password', 12),
    },
  });
});
beforeEach(() => {
  runtime.user = user;
});
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: [user.id, other.id] } } });
  await db.$disconnect();
  vi.unstubAllEnvs();
});
it('updates only the signed-in profile, stores photos and serves them privately', async () => {
  expect(
    await updateProfile(
      null,
      form({
        name: ' Updated ',
        userId: other.id,
        avatar: new File([png], 'photo.png', { type: 'image/png' }),
      }),
    ),
  ).toMatchObject({ ok: true });
  const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(saved.name).toBe('Updated');
  expect(saved.avatarType).toBe('image/png');
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: other.id } })).name,
  ).toBe('Other');
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/png');
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(png);
  runtime.user = other;
  expect((await GET()).status).toBe(404);
});
it('rejects oversized and non-raster uploads without changing the profile', async () => {
  expect(
    await updateProfile(
      null,
      form({
        name: 'Rejected',
        avatar: new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], 'large.png'),
      }),
    ),
  ).toMatchObject({ ok: false, field: 'avatar' });
  expect(
    await updateProfile(
      null,
      form({
        name: 'Rejected',
        avatar: new File(['<svg></svg>'], 'spoof.png', { type: 'image/png' }),
      }),
    ),
  ).toMatchObject({ ok: false, field: 'avatar' });
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: user.id } })).name,
  ).toBe('Updated');
  expect(
    await updateProfile(null, form({ name: 'Updated', removeAvatar: 'on' })),
  ).toMatchObject({ ok: true });
  expect((await GET()).status).toBe(404);
});
it('requires the current password, updates its hash and does not alter another account', async () => {
  const values = {
    currentPassword: 'wrong-password',
    newPassword: 'new-password',
    confirmPassword: 'new-password',
    userId: other.id,
  };
  expect(await changePassword(null, form(values))).toMatchObject({
    ok: false,
    field: 'currentPassword',
  });
  expect(
    await changePassword(
      null,
      form({
        ...values,
        currentPassword: 'old-password',
        confirmPassword: 'mismatch',
      }),
    ),
  ).toMatchObject({ ok: false, field: 'confirmPassword' });
  expect(
    await changePassword(
      null,
      form({ ...values, currentPassword: 'old-password' }),
    ),
  ).toMatchObject({ ok: true });
  const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(await compare('new-password', saved.passwordHash)).toBe(true);
  expect(await compare('old-password', saved.passwordHash)).toBe(false);
  expect(
    await compare(
      'other-password',
      (await db.user.findUniqueOrThrow({ where: { id: other.id } }))
        .passwordHash,
    ),
  ).toBe(true);
});
it('requires authentication for every update and photo response', async () => {
  runtime.user = null;
  expect(
    await updateProfile(null, form({ name: 'Unauthorized' })),
  ).toMatchObject({ ok: false, message: 'Please log in to continue.' });
  expect(await changePassword(null, form({}))).toMatchObject({
    ok: false,
    message: 'Please log in to continue.',
  });
  expect((await GET()).status).toBe(401);
});
it('limits repeated password guessing per user', async () => {
  runtime.user = other;
  let result;
  for (let attempt = 0; attempt < 11; attempt++)
    result = await changePassword(
      null,
      form({
        currentPassword: 'weak',
        newPassword: 'new-password',
        confirmPassword: 'new-password',
      }),
    );
  expect(result).toMatchObject({
    ok: false,
    message: 'Too many attempts. Try again in a minute.',
  });
});
