import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import { testDatabaseUrl } from './tests/integration/database-url';

const databaseUrl = testDatabaseUrl(
  process.env.TEST_DATABASE_URL,
  process.env.DATABASE_URL,
);
const port = 3420;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  globalSetup: './tests/integration/setup.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm start --port ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: databaseUrl,
      AUTH_URL: `http://localhost:${port}`,
      AUTH_SECRET: 'e2e-only-stable-secret-at-least-32-characters',
      AUTH_TRUST_HOST: 'true',
      AUTH_TRUST_PROXY: 'true',
    },
  },
});
