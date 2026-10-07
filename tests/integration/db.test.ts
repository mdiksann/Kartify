import 'dotenv/config';
import { expect, it, vi } from 'vitest';
import { testDatabaseUrl } from './database-url';

it('connects with the singleton after dedicated database migrations are applied', async () => {
  const url = testDatabaseUrl(
    process.env.TEST_DATABASE_URL,
    process.env.DATABASE_URL,
  );
  vi.stubEnv('DATABASE_URL', url);
  const { db } = await import('@/lib/db');
  try {
    expect((await import('@/lib/db')).db).toBe(db);
    await expect(db.$connect()).resolves.toBeUndefined();
  } finally {
    await db.$disconnect();
    vi.unstubAllEnvs();
  }
});
