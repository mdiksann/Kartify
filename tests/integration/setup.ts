import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { testDatabaseUrl } from './database-url';
export default async function setup() {
  const url = testDatabaseUrl(
    process.env.TEST_DATABASE_URL,
    process.env.DATABASE_URL,
  );
  // The dedicated test database must exist; deploy applies committed migrations.
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
  const client = new PrismaClient({ datasourceUrl: url });
  try {
    await client.$connect();
  } finally {
    await client.$disconnect();
  }
}
