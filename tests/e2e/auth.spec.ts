import { test, expect, login, password } from './fixtures';

test('registration, protected redirect, persistent session and logout', async ({
  page,
  context,
  fixture: f,
}) => {
  await page.goto(`/w/${f.workspace.slug}`);
  await expect(page).toHaveURL(/\/login\?next=/);
  const email = `registered-${f.suffix}@example.com`;
  try {
    await page.goto('/register');
    await page.getByLabel('Name', { exact: true }).fill('Registered user');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page
      .getByRole('button', { name: 'Create account', exact: true })
      .click();
    await expect(page).toHaveURL(/\/workspaces$/);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Your workspaces', exact: true }),
    ).toBeVisible();
    const second = await context.newPage();
    await second.goto('/workspaces');
    await expect(second).toHaveURL(/\/workspaces$/);
    await second.close();
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      (await page.request.get('/api/auth/session')).json(),
    ).resolves.toEqual(null);
    await page.goto('/workspaces');
    await expect(page).toHaveURL(/\/login/);
    await login(page, email);
    await expect(page).toHaveURL(/\/workspaces$/);
  } finally {
    await f.db.user.deleteMany({ where: { email } });
  }
});

test('Auth.js credential endpoint limits guessing and returns no password data', async ({
  context,
  fixture: f,
}) => {
  const headers = {
    'x-forwarded-for': `endpoint-${f.suffix}`,
    'x-auth-return-redirect': '1',
  };
  const csrf = await context.request.get('/api/auth/csrf', { headers });
  const { csrfToken } = await csrf.json();
  expect(typeof csrfToken).toBe('string');
  for (let attempt = 0; attempt < 11; attempt++) {
    const response = await context.request.post(
      '/api/auth/callback/credentials',
      {
        headers,
        form: {
          csrfToken,
          email: f.owner.email,
          password: attempt === 10 ? password : 'wrong-password',
          callbackUrl: '/workspaces',
        },
      },
    );
    const body = await response.json();
    expect(body.url).toContain('error=CredentialsSignin');
    expect(JSON.stringify(body)).not.toMatch(/password|\$2[aby]\$/i);
  }
  expect(
    await (await context.request.get('/api/auth/session')).json(),
  ).toBeNull();
});
