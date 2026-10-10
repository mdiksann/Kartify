import AxeBuilder from '@axe-core/playwright';
import { test, expect, login } from './fixtures';

test('search filters combine, URLs survive reload, results deep-link and dashboard counts match', async ({
  page,
  fixture: f,
}) => {
  const [todo, , done] = f.project.columns;
  const alpha = await f.makeTask(
    f.project.id,
    todo!.id,
    f.owner.id,
    'Payment ALPHA',
  );
  await f.db.task.update({
    where: { id: alpha.id },
    data: {
      description: 'Invoice',
      priority: 'URGENT',
      dueDate: new Date('2000-01-01'),
      assigneeId: f.owner.id,
    },
  });
  const beta = await f.makeTask(
    f.project.id,
    done!.id,
    f.owner.id,
    'Finished payment',
  );
  await f.db.task.update({
    where: { id: beta.id },
    data: { priority: 'LOW', dueDate: new Date('2000-01-02') },
  });
  await f.makeTask(f.project.id, todo!.id, f.owner.id, 'Unscheduled task', 2);
  await login(page, f.owner.email);
  const root = `/w/${f.workspace.slug}`;
  await page.goto(root);
  for (const [label, count] of [
    ['Total tasks', '3'],
    ['Done', '1'],
    ['Overdue', '1'],
    ['Assigned to me', '1'],
  ]) {
    await expect(
      page
        .getByRole('term')
        .filter({ hasText: label! })
        .locator('..')
        .getByRole('definition'),
    ).toHaveText(count!);
  }
  await expect(
    page.getByRole('progressbar', { name: 'Test project progress' }),
  ).toHaveAttribute('aria-valuenow', '33');
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact ?? ''),
    ),
  ).toEqual([]);
  await page.goto(`${root}/search`);
  const count = page
    .getByRole('region', { name: 'Search results' })
    .getByRole('heading', { level: 2 });
  await expect(count).toHaveText('3 tasks found');
  await page.getByLabel('Search tasks').fill('PAYMENT');
  await expect(count).toHaveText('2 tasks found');
  await expect(page).toHaveURL(/q=PAYMENT/);
  await page.getByLabel('Search tasks').fill('missing');
  await expect(count).toHaveText('0 tasks found');
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(count).toHaveText('3 tasks found');
  const checks = [
    ['Assignee', f.owner.id, '1 task found'],
    ['Priority', 'LOW', '1 task found'],
    ['Column / status', done!.id, '1 task found'],
  ];
  for (const [label, value, expected] of checks) {
    await page.getByLabel(label!, { exact: true }).selectOption(value!);
    await expect(count).toHaveText(expected!);
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(count).toHaveText('3 tasks found');
  }
  await page.getByLabel('Due from').fill('2000-01-01');
  await expect(count).toHaveText('2 tasks found');
  await page.getByLabel('Due through').fill('2000-01-01');
  await expect(count).toHaveText('1 task found');
  await page.getByLabel('Priority', { exact: true }).selectOption('URGENT');
  await expect(page).toHaveURL(/priority=URGENT/);
  await expect(
    page.getByRole('button', { name: 'Submit search' }),
  ).toHaveAttribute('aria-busy', 'false');
  await page.getByLabel('Assignee', { exact: true }).selectOption(f.owner.id);
  await expect(page).toHaveURL(new RegExp(`assignee=${f.owner.id}`));
  await expect(
    page.getByRole('button', { name: 'Submit search' }),
  ).toHaveAttribute('aria-busy', 'false');
  await page.getByLabel('Column / status').selectOption(todo!.id);
  await expect(page).toHaveURL(new RegExp(`column=${todo!.id}`));
  await expect(
    page.getByRole('button', { name: 'Submit search' }),
  ).toHaveAttribute('aria-busy', 'false');
  await page.getByLabel('Search tasks').fill('invoice');
  await expect(page).toHaveURL(/q=invoice/);
  await expect(count).toHaveText('1 task found');
  const shared = page.url();
  await page.reload();
  await expect(count).toHaveText('1 task found');
  await expect(page.getByLabel('Search tasks')).toHaveValue('invoice');
  await expect(page).toHaveURL(shared);
  await page
    .getByRole('region', { name: 'Search results' })
    .getByRole('link', { name: /Payment ALPHA/ })
    .click();
  await expect(
    page
      .getByRole('dialog')
      .getByRole('heading', { name: 'Payment ALPHA', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`task=${alpha.id}`));
});
