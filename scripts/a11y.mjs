import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  openSync,
  closeSync,
  rmSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { testDatabaseUrl } from '../tests/integration/database-url.ts';

// Own the server so the audit and fixtures always use the same guarded test DB.
const databaseUrl = testDatabaseUrl(
  process.env.TEST_DATABASE_URL,
  process.env.DATABASE_URL,
);
const pnpm = process.env.npm_execpath;
assert(pnpm, 'Run this script with pnpm a11y.');
const port = Number(process.env.A11Y_PORT ?? 3417);
assert(
  Number.isInteger(port) && port >= 1024 && port <= 65535,
  'A11Y_PORT must be between 1024 and 65535.',
);
const base = `http://localhost:${port}`;
const db = new PrismaClient({ datasourceUrl: databaseUrl });
const temporary = mkdtempSync(join(tmpdir(), 'kartify-a11y-'));
const log = join(temporary, 'server.log');
let server;
let browser;
let user;
let extra;
let passed = false;

async function audit(page, name) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const failures = result.violations.filter(
    ({ impact }) => impact === 'critical' || impact === 'serious',
  );
  assert.deepEqual(
    failures.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target),
    })),
    [],
    `${name}: serious/critical axe violations`,
  );
  console.log(`PASS axe: ${name}`);
}
async function noOverflow(page) {
  const overflow = await page.evaluate(() => {
    if (document.documentElement.scrollWidth <= innerWidth) return [];
    return [...document.querySelectorAll('main *, header *')]
      .filter(
        (element) =>
          element.getBoundingClientRect().right > innerWidth &&
          !element.closest('.overflow-x-auto'),
      )
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
      }));
  });
  assert.deepEqual(
    overflow,
    [],
    `Page overflow at ${page.viewportSize().width}px: ${new URL(page.url()).pathname}`,
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'Horizontal page scroll is forbidden.',
  );
}
async function tabTo(page, target) {
  await expect(target).toBeVisible();
  const preferred = await target.evaluate((element) =>
    element.compareDocumentPosition(document.activeElement) &
    Node.DOCUMENT_POSITION_FOLLOWING
      ? 'Shift+Tab'
      : 'Tab',
  );
  for (let index = 0; index < 120; index++) {
    if (await target.evaluate((element) => element === document.activeElement))
      return;
    await page.keyboard.press(
      index < 60 ? preferred : preferred === 'Tab' ? 'Shift+Tab' : 'Tab',
    );
  }
  throw new Error(
    `Control unreachable by Tab: ${await target.evaluate((element) => JSON.stringify({ label: element.getAttribute('aria-label'), tabIndex: element.tabIndex, disabled: element.disabled, focusedTag: document.activeElement?.tagName, focusedLabel: document.activeElement?.getAttribute('aria-label') }))}`,
  );
}
async function activate(page, target) {
  await tabTo(page, target);
  await page.keyboard.press('Enter');
}
async function type(page, target, value) {
  await tabTo(page, target);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(value);
}
async function trap(page, dialog) {
  for (let index = 0; index < 25; index++) {
    await page.keyboard.press('Tab');
    assert(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
      'Focus escaped the dialog.',
    );
  }
}

async function scrollReveals(width) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    reducedMotion: 'no-preference',
  });
  await page.goto(base);
  const sections = page.locator('main > section');
  await expect(sections).toHaveCount(4);
  await expect(sections.first()).toHaveClass(/scroll-reveal/);
  await expect(sections.last()).not.toHaveClass(/scroll-reveal/);
  for (const section of await sections.all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveClass(/scroll-reveal/);
    await expect(section).toHaveCSS('animation-name', 'section-enter');
    await expect(section).toHaveCSS('opacity', '1');
    await expect(section).toHaveCSS('transform', 'none');
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sections.last().scrollIntoViewIfNeeded();
  assert.equal(
    await sections
      .last()
      .evaluate(
        (element) =>
          element
            .getAnimations()
            .filter((animation) => animation.playState === 'running').length,
      ),
    0,
    'Returning to a revealed section must not replay the animation.',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  for (const section of await sections.all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveCSS('animation-name', 'none');
    await expect(section).toHaveCSS('opacity', '1');
    await expect(section).toHaveCSS('transform', 'none');
  }
  await noOverflow(page);
  await page.close();

  const withoutJs = await browser.newPage({
    viewport: { width, height: 900 },
    javaScriptEnabled: false,
  });
  await withoutJs.goto(base);
  await expect(withoutJs.locator('main > section')).toHaveCount(4);
  for (const section of await withoutJs.locator('main > section').all()) {
    await expect(section).toHaveCSS('opacity', '1');
    await expect(section).toHaveCSS('animation-name', 'none');
  }
  await withoutJs.close();
  console.log(
    `PASS scroll reveals, one-shot motion, reduced motion and no-JS content: ${width}px`,
  );
}

async function previewMotion(width) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    reducedMotion: 'no-preference',
  });
  await page.goto(base);
  const preview = page.getByRole('figure', { name: 'Example project board' });
  await preview.scrollIntoViewIfNeeded();
  await expect(preview).toHaveAttribute('data-demo-phase', '0');
  for (const status of ['To Do', 'In Progress', 'Done'])
    await expect(
      preview.locator(`[data-demo-column="${status}"]`),
    ).toBeVisible();
  await expect(preview).toHaveAttribute('data-demo-phase', '1', {
    timeout: 6000,
  });
  await expect(
    preview.locator('[data-demo-column="In Progress"] [data-demo-count]'),
  ).toHaveText('2');
  await expect(
    preview.locator('[data-demo-column="To Do"] [data-demo-count]'),
  ).toHaveText('1');
  await expect(preview.locator('[data-demo-task]')).toContainText(
    'Build the new homepage',
  );
  await expect(preview.getByRole('button')).toHaveCount(0);
  await expect(preview.getByRole('heading')).toHaveCount(0);
  await expect(preview.getByText('Alex is building the homepage.')).toHaveCount(
    0,
  );
  await expect(preview).toHaveAttribute('data-demo-phase', '2', {
    timeout: 6000,
  });
  await expect(
    preview.locator('[data-demo-column="Done"] [data-demo-count]'),
  ).toHaveText('2');
  await expect(preview).toHaveAttribute('data-demo-phase', '0', {
    timeout: 6000,
  });
  await page.locator('main > section').last().scrollIntoViewIfNeeded();
  await delay(200);
  const offscreen = await preview.getAttribute('data-demo-phase');
  await delay(3900);
  await expect(preview).toHaveAttribute('data-demo-phase', offscreen);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await preview.scrollIntoViewIfNeeded();
  await delay(3900);
  await expect(preview).toHaveAttribute('data-demo-phase', '0');
  assert.equal(
    await preview
      .locator('[data-demo-task]')
      .evaluate((element) => element.getAnimations().length),
    0,
    'Reduced motion must keep the automatic preview static.',
  );
  await noOverflow(page);
  await page.close();
  console.log(
    `PASS automatic Kanban cycle, counts, clean UI, offscreen pause and reduced motion: ${width}px`,
  );
}

try {
  execFileSync(
    process.execPath,
    [pnpm, 'exec', 'prisma', 'migrate', 'deploy'],
    { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'inherit' },
  );
  const suffix = randomUUID();
  const password = randomUUID();
  user = await db.user.create({
    data: {
      name: 'Maya Chen',
      email: `a11y-${suffix}@example.test`,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  extra = await db.user.create({
    data: {
      name: 'M'.repeat(80),
      email: `a11y-member-${suffix}@example.test`,
      passwordHash: user.passwordHash,
    },
  });
  const workspace = await db.workspace.create({
    data: {
      name: 'W'.repeat(80),
      slug: `a11y-${suffix}`,
      createdBy: user.id,
      members: {
        create: [
          { userId: user.id, role: 'OWNER' },
          { userId: extra.id, role: 'MEMBER' },
        ],
      },
    },
  });
  const project = await db.project.create({
    data: {
      name: 'P'.repeat(80),
      workspaceId: workspace.id,
      position: 0,
      columns: {
        create: [
          { name: 'To Do', position: 0 },
          { name: 'In Progress', position: 1 },
          { name: 'Done', position: 2, isDone: true },
        ],
      },
    },
    include: { columns: { orderBy: { position: 'asc' } } },
  });
  const task = await db.task.create({
    data: {
      title: 'A'.repeat(200),
      description: 'D'.repeat(300),
      projectId: project.id,
      columnId: project.columns[0].id,
      position: 0,
      createdBy: user.id,
      priority: 'URGENT',
      assigneeId: user.id,
      dueDate: new Date('2020-01-01'),
    },
  });
  const output = openSync(log, 'a');
  server = spawn(process.execPath, [pnpm, 'dev', '--port', String(port)], {
    detached: process.platform !== 'win32',
    stdio: ['ignore', output, output],
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: randomUUID() + randomUUID(),
      AUTH_URL: base,
      AUTH_TRUST_HOST: 'true',
    },
  });
  closeSync(output);
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    assert(server.exitCode === null, `Audit server stopped. See ${log}`);
    try {
      ready = (
        await fetch(`${base}/login`, { signal: AbortSignal.timeout(1000) })
      ).ok;
    } catch {
      /* Server is still starting. */
    }
    if (ready) break;
    await delay(500);
  }
  assert(ready, `Audit server did not start. See ${log}`);
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  for (const width of [1280, 375]) {
    await scrollReveals(width);
    await previewMotion(width);
  }
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'A clear place for your team’s work.',
    );
    await expect(
      page.getByRole('link', { name: 'Create your workspace', exact: true }),
    ).toHaveAttribute('href', '/register');
    await noOverflow(page);
    await audit(page, `landing ${width}px`);
    await page.goto(`${base}/login`);
    await noOverflow(page);
    await audit(page, `login ${width}px`);
    await page.goto(`${base}/register`);
    await noOverflow(page);
    await audit(page, `register ${width}px`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/login`);
  await type(page, page.getByLabel('Email', { exact: true }), user.email);
  await type(page, page.getByLabel('Password', { exact: true }), password);
  await activate(
    page,
    page.getByRole('button', { name: 'Log in', exact: true }),
  );
  await page.waitForURL('**/workspaces');
  const root = `/w/${workspace.slug}`;
  const board = `${root}/board/${project.id}`;
  await page.goto(`${base}${root}`);
  const themeToggle = page.getByRole('button', {
    name: 'Dark mode',
    exact: true,
  });
  await activate(page, themeToggle);
  await expect(themeToggle).toHaveAttribute('aria-pressed', 'true');
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      root,
      board,
      `${root}/projects`,
      `${root}/search`,
      `${root}/members`,
      `${root}/settings`,
      `${root}/account`,
    ]) {
      await page.goto(`${base}${path}`);
      await expect(themeToggle).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('body')).toHaveCSS(
        'background-color',
        'rgb(24, 24, 24)',
      );
      await noOverflow(page);
      await audit(page, `dark ${path} ${width}px`);
    }
    await page.goto(`${base}${root}/projects`);
    await activate(
      page,
      page.getByRole('button', { name: `Rename ${project.name}`, exact: true }),
    );
    await expect(page.getByRole('dialog')).toHaveCSS(
      'background-color',
      'rgb(24, 24, 24)',
    );
    await audit(page, `dark project dialog ${width}px`);
    await page.keyboard.press('Escape');
  }
  await page.reload();
  await expect(themeToggle).toHaveAttribute('aria-pressed', 'true');
  await page.goto(base);
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await page.goto(`${base}${root}`);
  await expect(themeToggle).toHaveAttribute('aria-pressed', 'true');
  await activate(page, themeToggle);
  await page.reload();
  await expect(themeToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  console.log(
    'PASS dark mode, keyboard toggle, persistence, portal colours and workspace scope',
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}${root}`);
  await activate(
    page,
    page.getByRole('button', { name: 'Account menu', exact: true }),
  );
  await activate(
    page,
    page.getByRole('menuitem', { name: 'Account settings', exact: true }),
  );
  await page.waitForURL(`**${root}/account`);
  const photoInput = page.getByLabel('Profile photo', { exact: true });
  const imageBytes = readFileSync('src/app/apple-icon.png');
  const photoLimit = 2 * 1024 * 1024;
  await photoInput.setInputFiles({
    name: 'too-large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(photoLimit + 1),
  });
  await activate(
    page,
    page.getByRole('button', { name: 'Save profile', exact: true }),
  );
  await expect(page.locator('main').getByRole('alert')).toContainText('2 MB');
  await audit(page, 'oversized profile photo error');
  await photoInput.setInputFiles({
    name: 'profile.png',
    mimeType: 'image/png',
    buffer: Buffer.concat([
      imageBytes,
      Buffer.alloc(photoLimit - imageBytes.length),
    ]),
  });
  await type(page, page.getByLabel('Name', { exact: true }), 'Updated profile');
  await activate(
    page,
    page.getByRole('button', { name: 'Save profile', exact: true }),
  );
  await expect
    .poll(
      async () =>
        (await db.user.findUniqueOrThrow({ where: { id: user.id } })).name,
    )
    .toBe('Updated profile');
  const photoImage = page.getByRole('img', {
    name: 'Your profile photo',
    exact: true,
  });
  await expect(photoImage).toBeVisible();
  await expect
    .poll(() => photoImage.evaluate((element) => element.naturalWidth))
    .toBeGreaterThan(0);
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: user.id } })).avatar.length,
    photoLimit,
  );
  await page.reload();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(
    'Updated profile',
  );
  await expect(photoImage).toBeVisible();
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [`${root}/account`, '/account']) {
      await page.goto(`${base}${path}`);
      await noOverflow(page);
      await audit(page, `account ${width}px ${path}`);
    }
  }
  await page.goto(`${base}${root}/account`);
  await page.getByLabel('Remove current photo', { exact: true }).check();
  await activate(
    page,
    page.getByRole('button', { name: 'Save profile', exact: true }),
  );
  await expect(photoImage).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await db.user.findUniqueOrThrow({ where: { id: user.id } })).avatar,
    )
    .toBeNull();
  const newPassword = randomUUID();
  await type(
    page,
    page.getByLabel('Current password', { exact: true }),
    'wrong-password',
  );
  await type(
    page,
    page.getByLabel('New password', { exact: true }),
    newPassword,
  );
  await type(
    page,
    page.getByLabel('Confirm new password', { exact: true }),
    newPassword,
  );
  await activate(
    page,
    page.getByRole('button', { name: 'Change password', exact: true }),
  );
  await expect(page.locator('main').getByRole('alert')).toHaveText(
    'Current password is incorrect.',
  );
  await audit(page, 'current password error');
  await type(
    page,
    page.getByLabel('Current password', { exact: true }),
    password,
  );
  await type(
    page,
    page.getByLabel('New password', { exact: true }),
    newPassword,
  );
  await type(
    page,
    page.getByLabel('Confirm new password', { exact: true }),
    newPassword,
  );
  await activate(
    page,
    page.getByRole('button', { name: 'Change password', exact: true }),
  );
  await expect(
    page.getByLabel('Current password', { exact: true }),
  ).toHaveValue('');
  await expect
    .poll(async () =>
      bcrypt.compare(
        newPassword,
        (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
          .passwordHash,
      ),
    )
    .toBe(true);
  const loginContext = await browser.newContext();
  const loginPage = await loginContext.newPage();
  await loginPage.goto(`${base}/login?next=${encodeURIComponent('/account')}`);
  await loginPage.getByLabel('Email', { exact: true }).fill(user.email);
  await loginPage.getByLabel('Password', { exact: true }).fill(password);
  await loginPage.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(loginPage.locator('main').getByRole('alert')).toHaveText(
    'Invalid email or password.',
  );
  await loginPage.getByLabel('Email', { exact: true }).fill(user.email);
  await loginPage.getByLabel('Password', { exact: true }).fill(newPassword);
  await loginPage.getByRole('button', { name: 'Log in', exact: true }).click();
  await loginPage.waitForURL('**/account');
  await expect(loginPage.getByLabel('Name', { exact: true })).toHaveValue(
    'Updated profile',
  );
  await loginContext.close();
  console.log(
    'PASS account navigation, exact 2 MB upload, oversize rejection, persistence, removal, current password check and login with new password',
  );
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, name] of [
      [root, 'dashboard'],
      [board, 'board'],
      [`${root}/search?q=no-matches`, 'search'],
      [`${root}/members`, 'members'],
      [`${root}/projects`, 'projects'],
      [`${root}/settings`, 'settings'],
    ]) {
      await page.goto(`${base}${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (name === 'projects' || name === 'board') {
        const labels =
          name === 'projects'
            ? ['New project', `Rename ${project.name}`, 'Delete project']
            : [
                'Add column',
                'Add task',
                `Rename ${project.name}`,
                'Delete project',
              ];
        for (const label of labels) {
          const control = page
            .getByRole('button', { name: label, exact: true })
            .first();
          await expect(control).toHaveText('');
          await expect(control.locator('svg')).toHaveCount(1);
          await expect(control).toHaveAttribute('title', /.+/);
          const box = await control.boundingBox();
          assert(
            box.width >= 44 && box.height >= 44,
            `${label}: icon control needs a 44px target`,
          );
        }
        if (name === 'projects') {
          const rename = page.getByRole('button', {
            name: `Rename ${project.name}`,
            exact: true,
          });
          await activate(page, rename);
          await expect(
            page
              .getByRole('dialog')
              .getByRole('heading', { name: 'Rename project' }),
          ).toBeVisible();
          await expect(
            page.getByLabel('Project name', { exact: true }),
          ).toHaveValue(project.name);
          await page.keyboard.press('Escape');
          await expect(rename).toBeFocused();
          const remove = page.getByRole('button', {
            name: 'Delete project',
            exact: true,
          });
          await activate(page, remove);
          await expect(
            page
              .getByRole('alertdialog')
              .getByRole('button', { name: 'Cancel' }),
          ).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(remove).toBeFocused();
        }
        console.log(
          `PASS ${name} icon actions, labels, touch targets and confirmation focus: ${width}px`,
        );
      }
      if (name === 'members') {
        await expect(
          page.getByRole('button', { name: 'Save role', exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Remove member', exact: true }),
        ).toHaveCount(0);
        const add = page.getByRole('button', {
          name: 'Add member',
          exact: true,
        });
        await activate(page, add);
        await trap(page, page.getByRole('dialog'));
        await page
          .getByLabel('Email', { exact: true })
          .fill(`missing-${randomUUID()}@example.test`);
        await page
          .getByRole('dialog')
          .getByRole('button', { name: 'Add member', exact: true })
          .click();
        await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
          'No account found',
        );
        await audit(page, `add member error ${width}px`);
        await page.keyboard.press('Escape');
        await expect(add).toBeFocused();
        const manage = page.getByRole('button', {
          name: `Manage member ${extra.name}`,
          exact: true,
        });
        for (const role of ['ADMIN', 'MEMBER']) {
          await activate(page, manage);
          const dialog = page.getByRole('dialog');
          await trap(page, dialog);
          await dialog.getByRole('combobox').selectOption(role);
          await dialog
            .getByRole('button', { name: 'Save role', exact: true })
            .click();
          await expect(dialog).toBeHidden();
          await expect(manage).toBeFocused();
          const row = page.getByRole('row').filter({ has: manage });
          await expect(row).toContainText(
            role === 'ADMIN' ? 'Admin' : 'Member',
          );
        }
        await activate(page, manage);
        await page
          .getByRole('dialog')
          .getByRole('button', { name: 'Remove member', exact: true })
          .click();
        await expect(
          page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }),
        ).toBeFocused();
        await trap(page, page.getByRole('alertdialog'));
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(manage).toBeFocused();
        console.log(
          `PASS compact member controls, add errors, role updates, confirmation cancellation and dialog focus: ${width}px`,
        );
      }
      await noOverflow(page);
      await audit(page, `${name} ${width}px`);
    }
    await page.goto(`${base}${board}`);
    await activate(
      page,
      page.getByRole('button', { name: /^Open task / }).first(),
    );
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByLabel('Title', { exact: true })).toBeVisible();
    await expect(
      drawer.getByRole('heading', { name: 'No comments yet' }),
    ).toBeVisible();
    await expect(
      drawer.getByRole('heading', { name: 'No activity yet' }),
    ).toBeVisible();
    await noOverflow(page);
    await audit(page, `task detail ${width}px`);
    await trap(page, drawer);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(
      page.getByRole('button', { name: /^Open task / }).first(),
    ).toBeFocused();
    if (width === 375) {
      const nav = page.getByRole('button', { name: 'Open navigation' });
      await activate(page, nav);
      await trap(page, page.getByRole('dialog'));
      await audit(page, 'mobile navigation');
      await page.keyboard.press('Escape');
      await expect(nav).toBeFocused();
      const tooSmall = await page
        .locator(
          'main button:visible, header button:visible, main input:visible, main select:visible, main textarea:visible',
        )
        .evaluateAll((elements) =>
          elements
            .filter((element) => {
              const box = element.getBoundingClientRect();
              return box.width < 44 || box.height < 44;
            })
            .map(
              (element) =>
                element.getAttribute('aria-label') || element.textContent,
            ),
        );
      assert.deepEqual(tooSmall, [], 'Mobile controls must be at least 44px.');
    }
  }
  console.log(
    'PASS responsive views, empty comments/activity, modal focus traps and restoration',
  );

  const scheduleMonth = new Date().toISOString().slice(0, 7);
  await db.workspace.update({
    where: { id: workspace.id },
    data: { background: 'mint' },
  });
  await db.task.update({
    where: { id: task.id },
    data: {
      startDate: new Date(`${scheduleMonth}-02T00:00:00Z`),
      dueDate: new Date(`${scheduleMonth}-08T00:00:00Z`),
    },
  });
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ['timeline', 'calendar']) {
      await page.goto(`${base}${board}?view=${view}`);
      await expect(
        page.getByRole('link', {
          name: view === 'timeline' ? 'Timeline' : 'Calendar',
          exact: true,
        }),
      ).toHaveAttribute('aria-current', 'page');
      await expect(
        page.locator(`[data-task-id="${task.id}"]`).first(),
      ).toBeVisible();
      await noOverflow(page);
      await audit(page, `${view} ${width}px`);
      await page
        .getByRole('button', { name: 'Next month', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: 'No scheduled tasks this month' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Today', exact: true }).click();
      await expect(
        page.locator(`[data-task-id="${task.id}"]`).first(),
      ).toBeVisible();
    }
    await page.locator(`[data-task-id="${task.id}"]`).first().click();
    const detail = page.getByRole('dialog');
    await detail
      .getByLabel('Start date', { exact: true })
      .fill(`${scheduleMonth}-09`);
    await detail
      .getByLabel('Due date', { exact: true })
      .fill(`${scheduleMonth}-08`);
    await detail
      .getByRole('button', { name: 'Save task', exact: true })
      .click();
    await expect(detail.getByRole('alert')).toHaveText(
      'Due date must be on or after the start date.',
    );
    await detail
      .getByLabel('Start date', { exact: true })
      .fill(`${scheduleMonth}-05`);
    await detail
      .getByLabel('Due date', { exact: true })
      .fill(`${scheduleMonth}-15`);
    await detail
      .getByRole('button', { name: 'Save task', exact: true })
      .click();
    await expect(detail.getByRole('alert')).toHaveCount(0);
    await expect
      .poll(async () =>
        (await db.task.findUniqueOrThrow({ where: { id: task.id } })).startDate
          ?.toISOString()
          .slice(0, 10),
      )
      .toBe(`${scheduleMonth}-05`);
    await page.keyboard.press('Escape');
    await page.goto(`${base}${root}/settings`);
    await expect(page.locator('main').locator('..')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    await expect(
      page.getByRole('button', { name: 'Save background', exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.locator('main').locator('..')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    assert.equal(
      (await db.workspace.findUniqueOrThrow({ where: { id: workspace.id } }))
        .background,
      'mint',
      'Restoring the UI must preserve stored preferences.',
    );
    await noOverflow(page);
    await audit(page, `restored workspace settings ${width}px`);
  }
  const memberContext = await browser.newContext({
    viewport: { width: 375, height: 900 },
    reducedMotion: 'reduce',
  });
  const memberPage = await memberContext.newPage();
  await memberPage.goto(`${base}/login`);
  await memberPage.getByLabel('Email', { exact: true }).fill(extra.email);
  await memberPage.getByLabel('Password', { exact: true }).fill(password);
  await memberPage.getByRole('button', { name: 'Log in', exact: true }).click();
  await memberPage.waitForURL('**/workspaces');
  await memberPage.goto(`${base}${root}/settings`);
  await expect(memberPage.locator('main').locator('..')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await expect(
    memberPage.getByRole('button', { name: 'Save background', exact: true }),
  ).toHaveCount(0);
  await memberContext.close();
  console.log(
    'PASS calendar/timeline, month navigation, date validation and restored neutral UI with preserved preferences',
  );

  if (process.env.A11Y_SCREENSHOT_DIR) {
    const directory = process.env.A11Y_SCREENSHOT_DIR;
    mkdirSync(directory, { recursive: true });
    await db.workspace.update({
      where: { id: workspace.id },
      data: { name: 'Studio workspace' },
    });
    await db.project.update({
      where: { id: project.id },
      data: { name: 'Website launch' },
    });
    await db.user.update({
      where: { id: extra.id },
      data: { name: 'Alex Morgan' },
    });
    await db.task.update({
      where: { id: task.id },
      data: {
        title: 'Build the new homepage',
        description: 'Bring the first draft to our next design review.',
        priority: 'HIGH',
      },
    });
    for (const [index, title] of [
      'Write the launch announcement',
      'Prepare the help guide',
      'Review the onboarding flow',
      'Agree on the launch plan',
    ].entries()) {
      await db.task.create({
        data: {
          title,
          projectId: project.id,
          columnId: project.columns[index % 3].id,
          position: index + 1,
          createdBy: user.id,
          assigneeId: user.id,
          priority: 'MEDIUM',
        },
      });
    }
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [path, name] of [
        ['/', 'landing'],
        [root, 'dashboard'],
        [`${root}/projects`, 'projects'],
        [`${root}/members`, 'members'],
        [`${root}/search`, 'search'],
        [board, 'board'],
        [`${board}?view=timeline`, 'timeline'],
        [`${board}?view=calendar`, 'calendar'],
      ]) {
        const preview =
          path === '/'
            ? await browser.newPage({
                viewport: { width, height: 1000 },
                reducedMotion: 'reduce',
              })
            : page;
        await preview.goto(`${base}${path}`);
        await expect(preview.getByRole('heading', { level: 1 })).toBeVisible();
        await noOverflow(preview);
        await preview.addStyleTag({
          content: 'nextjs-portal { display: none !important; }',
        });
        await preview.screenshot({
          path: join(directory, `${name}-${width}.png`),
          fullPage: true,
        });
        if (preview !== page) await preview.close();
      }
    }
    console.log(`PASS visual previews saved to ${directory}`);
  }

  // Demonstrate the complete task workflow using Tab and keyboard input only.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}${board}`);
  await activate(
    page,
    page.getByRole('button', { name: 'Add task', exact: true }).first(),
  );
  await page.keyboard.insertText('Keyboard workflow');
  await page.keyboard.press('Enter');
  const card = page.getByRole('button', {
    name: /^Open task Keyboard workflow\./,
  });
  await expect(
    page.getByRole('textbox', { name: 'New task title' }),
  ).toBeHidden();
  await expect(card).not.toHaveAttribute('data-task-id', /^optimistic-/);
  await expect(card).toBeEnabled();
  await tabTo(page, card);
  await page.keyboard.press('Space');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('status').filter({ hasText: 'Over To Do.' }),
  ).toHaveText('Over To Do. Press Space to drop.');
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('status').filter({ hasText: 'Over In Progress.' }),
  ).toHaveText('Over In Progress. Press Space to drop.');
  await page.keyboard.press('Space');
  await expect(
    page.getByRole('status').filter({ hasText: /Moved to In Progress/ }),
  ).toBeVisible();
  await expect(card).toBeEnabled();
  await activate(page, card);
  const drawer = page.getByRole('dialog');
  await type(
    page,
    drawer.getByLabel('Title', { exact: true }),
    'Keyboard updated',
  );
  await activate(
    page,
    drawer.getByRole('button', { name: 'Save task', exact: true }),
  );
  await expect(
    drawer.getByRole('heading', { name: 'Keyboard updated', exact: true }),
  ).toBeVisible();
  await expect(
    drawer.getByRole('button', { name: 'Save task', exact: true }),
  ).toBeEnabled();
  await type(
    page,
    drawer.getByLabel('Add a comment', { exact: true }),
    'Keyboard discussion',
  );
  await activate(
    page,
    drawer.getByRole('button', { name: 'Add comment', exact: true }),
  );
  await expect(
    drawer.getByText('Keyboard discussion', { exact: true }),
  ).toBeVisible();
  await audit(page, 'updated task and comment');
  await activate(
    page,
    drawer.getByRole('button', { name: 'Edit comment', exact: true }),
  );
  await audit(page, 'comment form');
  await activate(
    page,
    drawer.getByRole('button', { name: 'Cancel', exact: true }),
  );
  await activate(
    page,
    drawer.getByRole('button', { name: 'Delete task', exact: true }),
  );
  const confirmation = page.getByRole('alertdialog');
  await expect(
    confirmation.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused();
  await trap(page, confirmation);
  await audit(page, 'destructive confirmation');
  await activate(
    page,
    confirmation.getByRole('button', { name: 'Cancel', exact: true }),
  );
  await expect(
    drawer.getByRole('button', { name: 'Delete task', exact: true }),
  ).toBeFocused();
  await activate(
    page,
    drawer.getByRole('button', { name: 'Delete task', exact: true }),
  );
  await activate(
    page,
    page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Delete task', exact: true }),
  );
  await expect(drawer).toBeHidden();
  await expect(
    page.getByRole('button', { name: /^Open task Keyboard updated\./ }),
  ).toHaveCount(0);
  assert.equal(
    await db.task.count({
      where: { projectId: project.id, title: 'Keyboard updated' },
    }),
    0,
  );
  assert.equal(await db.task.count({ where: { id: task.id } }), 1);
  console.log(
    'PASS keyboard create, drag move, detail edit, comment, cancel and confirmed delete',
  );
  // Remaining board dialogs and first-run actions share the same keyboard/focus audit.
  await activate(
    page,
    page.getByRole('button', { name: 'Manage column To Do' }),
  );
  await audit(page, 'column form');
  await activate(
    page,
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete column', exact: true }),
  );
  await expect(
    page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }),
  ).toBeFocused();
  await audit(page, 'column confirmation');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.goto(`${base}${root}/members`);
  await activate(
    page,
    page.getByRole('button', {
      name: process.env.A11Y_SCREENSHOT_DIR
        ? 'Manage member Alex Morgan'
        : `Manage member ${extra.name}`,
      exact: true,
    }),
  );
  await activate(
    page,
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Remove member', exact: true }),
  );
  await expect(
    page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }),
  ).toBeFocused();
  await audit(page, 'member confirmation');
  await page.keyboard.press('Escape');
  await page.goto(`${base}${root}/projects`);
  await activate(
    page,
    page.getByRole('button', { name: 'Delete project', exact: true }),
  );
  await activate(
    page,
    page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Delete project', exact: true }),
  );
  await expect(
    page.getByRole('heading', { name: 'No projects yet' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 900 });
  await activate(
    page,
    page.getByRole('button', { name: 'Create project', exact: true }),
  );
  await trap(page, page.getByRole('dialog'));
  await type(page, page.getByLabel('Project name', { exact: true }), '   ');
  await activate(
    page,
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create project', exact: true }),
  );
  await expect(
    page.getByLabel('Project name', { exact: true }),
  ).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Project name', { exact: true })).toBeFocused();
  await noOverflow(page);
  await audit(page, 'project field validation');
  await type(
    page,
    page.getByLabel('Project name', { exact: true }),
    'Created by keyboard',
  );
  await activate(
    page,
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create project', exact: true }),
  );
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { name: 'Created by keyboard', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(`${base}${root}/settings`);
  await activate(
    page,
    page.getByRole('button', { name: 'Delete workspace', exact: true }),
  );
  await expect(
    page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }),
  ).toBeFocused();
  await noOverflow(page);
  await audit(page, 'workspace confirmation');
  await activate(
    page,
    page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Delete workspace', exact: true }),
  );
  await page.waitForURL('**/workspaces');
  await expect(
    page.getByRole('heading', { name: 'No workspaces yet' }),
  ).toBeVisible();
  await audit(page, 'no workspaces');
  await activate(
    page,
    page.getByRole('link', { name: 'Create workspace', exact: true }),
  );
  await type(
    page,
    page.getByLabel('Workspace name', { exact: true }),
    'Keyboard workspace',
  );
  await activate(
    page,
    page.getByRole('button', { name: 'Create workspace', exact: true }),
  );
  await page.waitForURL('**/w/*');
  await expect(
    page.getByRole('heading', { name: 'Start your first project' }),
  ).toBeVisible();
  await noOverflow(page);
  console.log(
    'PASS inline errors, project creation, destructive dialogs and first-run empty states',
  );
  passed = true;
} finally {
  await browser?.close();
  if (server?.pid) {
    if (process.platform === 'win32') server.kill();
    else {
      try {
        process.kill(-server.pid, 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
    await delay(500);
  }
  try {
    if (user) {
      await db.workspace.deleteMany({ where: { createdBy: user.id } });
      await db.user.delete({ where: { id: user.id } });
      if (extra) await db.user.delete({ where: { id: extra.id } });
    }
  } finally {
    await db.$disconnect();
  }
  if (passed) rmSync(temporary, { recursive: true, force: true });
  else console.error(`Accessibility server log: ${log}`);
}
