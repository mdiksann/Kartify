import AxeBuilder from '@axe-core/playwright';
import { test, expect, password } from './fixtures';

test('onboards, edits, mouse and keyboard moves, comments, audits and deletes a task', async ({
  page,
  fixture: f,
}) => {
  const email = `journey-${f.suffix}@example.com`;
  try {
    await page.goto('/register');
    await page.getByLabel('Name', { exact: true }).fill('Journey owner');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/workspaces$/);
    await page
      .getByRole('link', { name: 'Create workspace', exact: true })
      .first()
      .click();
    await page
      .getByLabel('Workspace name', { exact: true })
      .fill(`Journey ${f.suffix}`);
    await page
      .getByRole('button', { name: 'Create workspace', exact: true })
      .click();
    await expect(page).toHaveURL(/\/w\//);
    await page
      .getByRole('button', { name: 'Create project', exact: true })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByLabel('Project name', { exact: true })
      .fill('Journey project');
    await dialog
      .getByRole('button', { name: 'Create project', exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await page
      .getByRole('main')
      .getByRole('link', { name: /Journey project/ })
      .click();
    await page.getByRole('button', { name: 'Manage column To Do' }).click();
    await dialog.getByLabel('Column name').fill('Backlog');
    await dialog.getByRole('button', { name: 'Save column' }).click();
    await expect(dialog).toBeHidden();
    const backlog = page.getByRole('region', { name: /^Column: Backlog,/ });
    await backlog
      .getByRole('button', { name: 'Add task', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'New task title' })
      .fill('Journey task');
    await page.getByRole('textbox', { name: 'New task title' }).press('Enter');
    const card = page.getByRole('button', {
      name: /^Open task Journey task\./,
    });
    await expect(card).not.toHaveAttribute('data-task-id', /^optimistic-/);
    await card.click();
    await dialog
      .getByLabel('Assignee', { exact: true })
      .selectOption({ label: 'Journey owner' });
    await dialog.getByLabel('Priority', { exact: true }).selectOption('URGENT');
    await dialog.getByLabel('Due date', { exact: true }).fill('2099-01-01');
    await dialog
      .getByRole('button', { name: 'Save task', exact: true })
      .click();
    await expect(
      dialog.getByRole('button', { name: 'Save task' }),
    ).toBeEnabled();
    await page.keyboard.press('Escape');
    const source = await card.boundingBox();
    const target = await page
      .getByRole('region', { name: /^Column: In Progress,/ })
      .boundingBox();
    if (!source || !target) throw new Error('Missing drag target');
    await page.mouse.move(
      source.x + source.width / 2,
      source.y + source.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + 100, {
      steps: 20,
    });
    await page.mouse.up();
    await expect(
      page
        .getByRole('region', { name: /^Column: In Progress, 1 tasks/ })
        .getByRole('button', { name: /^Open task Journey task\./ }),
    ).toBeVisible();
    await expect(card).toBeEnabled();
    await card.focus();
    await page.keyboard.press('Space');
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('status').filter({ hasText: 'Over In Progress.' }),
    ).toHaveText('Over In Progress. Press Space to drop.');
    await page.keyboard.press('ArrowRight');
    await expect(
      page.getByRole('status').filter({ hasText: 'Over Done.' }),
    ).toHaveText('Over Done. Press Space to drop.');
    await page.keyboard.press('Space');
    await expect(
      page
        .getByRole('region', { name: /^Column: Done, 1 tasks/ })
        .getByRole('button', { name: /^Open task Journey task\./ }),
    ).toBeVisible();
    await expect(card).toBeEnabled();
    await card.click();
    await dialog
      .getByLabel('Title', { exact: true })
      .fill('Edited journey task');
    await dialog
      .getByRole('button', { name: 'Save task', exact: true })
      .click();
    await expect(
      dialog.getByRole('heading', { name: 'Edited journey task', exact: true }),
    ).toBeVisible();
    await dialog
      .getByLabel('Add a comment', { exact: true })
      .fill('Ready for review');
    await dialog
      .getByRole('button', { name: 'Add comment', exact: true })
      .click();
    await expect(
      dialog.getByText('Ready for review', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText('added a comment', { exact: false }),
    ).toBeVisible();
    await expect(
      dialog.getByText(/moved from In Progress to Done/),
    ).toBeVisible();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      ),
    ).toEqual([]);
    await dialog
      .getByRole('button', { name: 'Delete task', exact: true })
      .click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Delete task', exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole('button', { name: /^Open task Edited journey task\./ }),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(backlog).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    const user = await f.db.user.findUnique({ where: { email } });
    if (user) {
      await f.db.workspace.deleteMany({ where: { createdBy: user.id } });
      await f.db.user.delete({ where: { id: user.id } });
    }
  }
});
