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
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 70,
        'src/lib/**': { branches: 90 },
      },
    },
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
          // Real cost-12 bcrypt rate-limit checks perform ten hashes on CI CPUs.
          testTimeout: 15_000,
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
