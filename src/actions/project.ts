'use server';
import { headers } from 'next/headers';
import { log } from '@/lib/logger';
import { db } from '@/lib/db';
import { boardMutation } from '@/lib/board-mutation';
import { workspaceAccess, requireCurrentUser } from '@/lib/workspace-access';
import { requireProject } from '@/lib/project-access';
import { allocatePosition } from '@/lib/positions';
import { renumberPositions } from '@/lib/ordering';
import { actionFailure, type FormState } from '@/lib/action-result';
import { workspaceTargetSchema } from '@/lib/validation/workspace';
import {
  createProjectSchema,
  renameProjectSchema,
  deleteProjectSchema,
} from '@/lib/validation/project';
import { permissionRoles } from '@/lib/permissions';
export async function createProject(input: unknown) {
  return boardMutation(
    createProjectSchema,
    input,
    async (values, { tx, workspace }) =>
      tx.project.create({
        data: {
          workspaceId: workspace.id,
          name: values.name,
          description: values.description || null,
          position: await allocatePosition(tx, {
            kind: 'project',
            parentId: workspace.id,
          }),
          columns: {
            create: renumberPositions([
              { id: 'todo', name: 'To Do', isDone: false },
              { id: 'progress', name: 'In Progress', isDone: false },
              { id: 'done', name: 'Done', isDone: true },
            ]).map(({ name, position, isDone }) => ({
              name,
              position,
              isDone,
            })),
          },
        },
      }),
    permissionRoles.createProject,
  );
}
export async function createProjectForm(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const result = await createProject(Object.fromEntries(form));
  return result.ok ? { ok: true, data: undefined } : result;
}
export async function renameProject(input: unknown) {
  return boardMutation(
    renameProjectSchema,
    input,
    async ({ projectId, name }, { tx, workspace }) => {
      await requireProject(tx, { projectId, workspaceId: workspace.id });
      return tx.project.update({
        where: { id: projectId, workspaceId: workspace.id },
        data: { name },
      });
    },
    permissionRoles.renameProject,
  );
}
export async function deleteProject(input: unknown) {
  const result = await boardMutation(
    deleteProjectSchema,
    input,
    async ({ projectId }, { tx, workspace, user }) => {
      await requireProject(tx, { projectId, workspaceId: workspace.id });
      await tx.project.delete({
        where: { id: projectId, workspaceId: workspace.id },
      });
      return { userId: user.id, workspaceId: workspace.id };
    },
    permissionRoles.deleteProject,
  );
  if (!result.ok) return result;
  log('info', 'Project deleted', {
    ...result.data,
    route: '/w/projects',
    requestId: (await headers()).get('x-request-id') ?? crypto.randomUUID(),
  });
  return { ok: true as const, data: undefined };
}
export async function listProjects(input: unknown) {
  try {
    await requireCurrentUser();
    const { slug } = workspaceTargetSchema.parse(input);
    const { workspace } = await workspaceAccess(slug);
    return {
      ok: true as const,
      data: await db.project.findMany({
        where: { workspaceId: workspace.id },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        take: 100,
      }),
    };
  } catch (error) {
    return actionFailure(error, '/w/projects');
  }
}
