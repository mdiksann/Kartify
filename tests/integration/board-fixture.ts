import 'dotenv/config';
import { vi } from 'vitest';
import { testDatabaseUrl } from './database-url';
const runtime = vi.hoisted(() => ({
  user: null as { id: string; name: string; email: string } | null,
}));
vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => runtime.user }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-request-id': 'board-integration' }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.stubEnv(
  'DATABASE_URL',
  testDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL),
);
export const { db } = await import('@/lib/db');
const { createFixture } = await import('./workspace-fixture');
const { createProject } = await import('@/actions/project');
export function actor(user: typeof runtime.user) {
  runtime.user = user;
}
export function dataOf<T>(
  result: { ok: true; data: T } | { ok: false; message: string },
): T {
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
export async function createDomainFixture() {
  const base = await createFixture(actor);
  const project = dataOf(
    await createProject({ slug: base.slug, name: 'Board project' }),
  );
  const otherProject = dataOf(
    await createProject({ slug: base.otherSlug, name: 'Other board' }),
  );
  const columns = await db.column.findMany({
    where: { projectId: project.id },
    orderBy: { position: 'asc' },
  });
  const otherColumn = await db.column.findFirstOrThrow({
    where: { projectId: otherProject.id },
  });
  return {
    ...base,
    project,
    otherProject,
    columns,
    otherColumn,
    scope: { slug: base.slug, projectId: project.id },
  };
}
export type DomainFixture = Awaited<ReturnType<typeof createDomainFixture>>;
