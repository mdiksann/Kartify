import { test, expect, login } from './fixtures';

test('owner adds member, member is read-only, admin changes roles and removal clears assignments', async ({
  page,
  fixture: f,
}) => {
  const root = `/w/${f.workspace.slug}`;
  await login(page, f.owner.email);
  await page.goto(`${root}/members`);
  await expect(
    page.getByText('Owner cannot be changed', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Manage member Owner' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Add member', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email', { exact: true }).fill(f.member.email);
  await dialog.getByRole('button', { name: 'Add member', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('cell', { name: f.member.email, exact: false }),
  ).toBeVisible();
  const task = await f.makeTask(
    f.project.id,
    f.project.columns[0]!.id,
    f.owner.id,
    'Assigned task',
  );
  await f.db.task.update({
    where: { id: task.id },
    data: { assigneeId: f.member.id },
  });
  await login(page, f.member.email);
  await page.goto(`${root}/members`);
  await expect(
    page.getByRole('button', { name: 'Add member', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /^Manage member/ }),
  ).toHaveCount(0);
  await page.goto(`${root}/projects`);
  await expect(
    page.getByRole('button', { name: /Create project|Delete project/ }),
  ).toHaveCount(0);
  await login(page, f.admin.email);
  for (const role of ['ADMIN', 'MEMBER']) {
    await page.goto(`${root}/members`);
    await page
      .getByRole('button', { name: 'Manage member Member', exact: true })
      .click();
    await dialog.getByLabel('Role for Member').selectOption(role);
    await dialog.getByRole('button', { name: 'Save role' }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole('row').filter({ hasText: f.member.email }),
    ).toContainText(role === 'ADMIN' ? 'Admin' : 'Member');
    expect(
      (
        await f.db.workspaceMember.findUniqueOrThrow({
          where: {
            workspaceId_userId: {
              workspaceId: f.workspace.id,
              userId: f.member.id,
            },
          },
        })
      ).role,
    ).toBe(role);
  }
  await page
    .getByRole('button', { name: 'Manage member Member', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Remove member', exact: true })
    .click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Remove member', exact: true })
    .click();
  await expect(page.getByText('Removed member', { exact: true })).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('row').filter({ hasText: f.member.email }),
  ).toHaveCount(0);
  expect(
    (await f.db.task.findUniqueOrThrow({ where: { id: task.id } })).assigneeId,
  ).toBeNull();
  await login(page, f.member.email);
  const response = await page.goto(root);
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
});

test('last admin receives an actionable denial for legacy data without an Owner', async ({
  page,
  fixture: f,
}) => {
  const legacy = await f.makeWorkspace(f.admin.id, 'Legacy', 'ADMIN');
  await login(page, f.admin.email);
  await page.goto(`/w/${legacy.slug}/members`);
  await page.getByRole('button', { name: 'Manage member Admin' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Role for Admin')
    .selectOption('MEMBER');
  await page.getByRole('button', { name: 'Save role' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'At least one Owner or Admin must remain.',
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Remove member', exact: true })
    .click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Remove member', exact: true })
    .click();
  await expect(page.getByRole('alertdialog').getByRole('alert')).toHaveText(
    'At least one Owner or Admin must remain.',
  );
});
