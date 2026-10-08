import 'server-only';
import type { Prisma } from '@prisma/client';
import { taskViewInclude } from './task-select';
import { NotFoundError } from './errors';
export async function requireProject(
  tx: Prisma.TransactionClient,
  options: { workspaceId: string; projectId: string },
) {
  const project = await tx.project.findFirst({
    where: { id: options.projectId, workspaceId: options.workspaceId },
  });
  if (!project) throw new NotFoundError();
  return project;
}
export async function requireColumn(
  tx: Prisma.TransactionClient,
  options: { projectId: string; columnId: string },
) {
  const column = await tx.column.findFirst({
    where: { id: options.columnId, projectId: options.projectId },
  });
  if (!column) throw new NotFoundError();
  return column;
}
export async function requireTask(
  tx: Prisma.TransactionClient,
  options: { workspaceId: string; projectId: string; taskId: string },
) {
  await requireProject(tx, options);
  const task = await tx.task.findFirst({
    where: { id: options.taskId, projectId: options.projectId },
    include: taskViewInclude,
  });
  if (!task) throw new NotFoundError();
  return task;
}
