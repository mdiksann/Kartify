import { expect, it } from 'vitest';
import { testDatabaseUrl } from '../integration/database-url';
it('accepts a dedicated public-schema test database', () => {
  expect(
    testDatabaseUrl(
      'postgresql://localhost/kartify_test?schema=public',
      'postgresql://localhost/kartify?schema=public',
    ),
  ).toContain('kartify_test');
});
it.each([
  undefined,
  'postgresql://localhost/kartify?schema=public',
  'https://localhost/kartify_test?schema=public',
  'postgresql://localhost/kartify_test?schema=other',
])('rejects unsafe test database %s', (value) => {
  expect(() => testDatabaseUrl(value, undefined)).toThrow();
});
it('rejects the application database even when credentials differ', () => {
  expect(() =>
    testDatabaseUrl(
      'postgresql://user:pass@localhost/kartify_test?schema=public',
      'postgresql://other:pass@localhost/kartify_test?schema=public',
    ),
  ).toThrow();
});
