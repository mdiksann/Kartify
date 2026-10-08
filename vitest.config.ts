import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  'server-only': fileURLToPath(
    new URL('./tests/server-only.ts', import.meta.url),
  ),
};
export default defineConfig({
  test: {
    // Real Postgres SSI can conflict on unrelated fixtures in small tables.
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          // Auth.js uses extensionless Next imports resolved by the framework.
          server: { deps: { inline: ['next-auth'] } },
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['./tests/integration/setup.ts'],
        },
      },
    ],
  },
});
