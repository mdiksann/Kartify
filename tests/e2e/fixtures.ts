import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { test as base, expect, type Page } from '@playwright/test';
import {
  makeUser as createUser,
  makeWorkspace as createWorkspace,
  makeProject as createProject,
  makeTask as createTask,
} from '../factories';
import { testDatabaseUrl } from '../integration/database-url';

export const password = 'test-password123';
export async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/workspaces$/);
}
async function makeFixture() {
  const db = new PrismaClient({
    datasourceUrl: testDatabaseUrl(
      process.env.TEST_DATABASE_URL,
      process.env.DATABASE_URL,
    ),
  });
  const suffix = randomUUID();
  const users: string[] = [];
  async function makeUser(name: string) {
    const user = await createUser(db, {
      name,
      email: `${name.toLowerCase()}-${suffix}@example.com`,
      passwordHash: await hash(password, 12),
    });
    users.push(user.id);
    return user;
  }
  async function makeWorkspace(
    userId: string,
    name = 'Test workspace',
    role: 'OWNER' | 'ADMIN' = 'OWNER',
  ) {
    return createWorkspace(db, {
      name,
      slug: `${name.toLowerCase().replaceAll(' ', '-')}-${suffix}`,
      createdBy: userId,
      members: { create: { userId, role } },
    });
  }
  async function makeProject(workspaceId: string) {
    const project = await createProject(db, {
      workspaceId,
      name: 'Test project',
      position: 1,
      columns: {
        create: [
          { name: 'To Do', position: 1 },
          { name: 'In Progress', position: 2 },
          { name: 'Done', position: 3, isDone: true },
        ],
      },
    });
    return project;
  }
  async function makeTask(
    projectId: string,
    columnId: string,
    createdBy: string,
    title: string,
    position = 1,
  ) {
    return createTask(db, { projectId, columnId, createdBy, title, position });
  }
  const owner = await makeUser('Owner');
  const admin = await makeUser('Admin');
  const member = await makeUser('Member');
  const outsider = await makeUser('Outsider');
  const workspace = await makeWorkspace(owner.id);
  await db.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: admin.id, role: 'ADMIN' },
  });
  const project = await makeProject(workspace.id);
  return {
    db,
    suffix,
    owner,
    admin,
    member,
    outsider,
    workspace,
    project,
    makeUser,
    makeWorkspace,
    makeProject,
    makeTask,
    async cleanup() {
      await db.workspace.deleteMany({ where: { createdBy: { in: users } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
    },
  };
}
type Fixture = Awaited<ReturnType<typeof makeFixture>>;
export const test = base.extend<{ fixture: Fixture }>({
  fixture: async ({ page }, runFixture) => {
    const fixture = await makeFixture();
    // The test server explicitly trusts this header; each fixture has its own auth bucket.
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': fixture.suffix });
    try {
      await runFixture(fixture);
    } finally {
      await fixture.cleanup();
    }
  },
});
export { expect };
