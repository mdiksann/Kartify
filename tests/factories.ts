import type { Prisma, PrismaClient } from '@prisma/client';

// Shared by browser and integration fixtures; callers own cleanup by user/workspace IDs.
export function makeUser(db: PrismaClient, data: Prisma.UserCreateInput) {
  return db.user.create({
    data,
    select: { id: true, name: true, email: true },
  });
}
export function makeWorkspace(
  db: PrismaClient,
  data: Prisma.WorkspaceUncheckedCreateInput,
) {
  return db.workspace.create({ data });
}
export function makeProject(
  db: PrismaClient,
  data: Prisma.ProjectUncheckedCreateInput,
) {
  return db.project.create({
    data,
    include: { columns: { orderBy: { position: 'asc' } } },
  });
}
export function makeTask(
  db: PrismaClient,
  data: Prisma.TaskUncheckedCreateInput,
) {
  return db.task.create({ data });
}
