export function testDatabaseUrl(
  value: string | undefined,
  applicationUrl: string | undefined,
): string {
  if (!value)
    throw new Error(
      'Set TEST_DATABASE_URL to a dedicated database ending in _test.',
    );
  const test = new URL(value);
  if (
    !['postgresql:', 'postgres:'].includes(test.protocol) ||
    !test.pathname.endsWith('_test') ||
    test.searchParams.get('schema') !== 'public'
  )
    throw new Error(
      'Test database must use Postgres, end in _test, and use schema=public.',
    );
  if (applicationUrl) {
    const app = new URL(applicationUrl);
    if (
      test.hostname === app.hostname &&
      test.port === app.port &&
      test.pathname === app.pathname
    )
      throw new Error('Test and application databases must differ.');
  }
  return test.toString();
}
