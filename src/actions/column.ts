'use server';
import { boardMutation } from '@/lib/board-mutation';
import { requireProject, requireColumn } from '@/lib/project-access';
import { allocatePosition } from '@/lib/positions';
import { permissionRoles } from '@/lib/permissions';
import {
  createColumnSchema,
  renameColumnSchema,
  reorderColumnSchema,
  setColumnDoneSchema,
  deleteColumnSchema,
} from '@/lib/validation/column';
export async function createColumn(input: unknown) {
  return boardMutation(
    createColumnSchema,
    input,
    async ({ projectId, name }, { tx, workspace }) => {
      await requireProject(tx, { projectId, workspaceId: workspace.id });
      return tx.column.create({
        data: {
          projectId,
          name,
          position: await allocatePosition(tx, {
            kind: 'column',
            parentId: projectId,
          }),
        },
      });
    },
    permissionRoles.createColumn,
  );
}
export async function renameColumn(input: unknown) {
  return boardMutation(
    renameColumnSchema,
    input,
    async ({ projectId, columnId, name }, { tx, workspace }) => {
      await requireProject(tx, { projectId, workspaceId: workspace.id });
      await requireColumn(tx, { projectId, columnId });
      return tx.column.update({
        where: { id: columnId, projectId },
        data: { name },
      });
    },
    permissionRoles.editColumn,
  );
}
export async function reorderColumn(input: unknown) {
  return boardMutation(
    reorderColumnSchema,
    input,
    async ({ projectId, columnId, beforeId, afterId }, { tx, workspace }) => {
      await requireProject(tx, { projectId, workspaceId: workspace.id });
      await requireColumn(tx, { projectId, columnId });
      const position = await allocatePosition(tx, {
        kind: 'column',
        parentId: projectId,
        excludeId: columnId,
        beforeId,
        afterId,
      });
      return tx.column.update({
        where: { id: columnId, projectId },
        data: { position },
      });
    },
    permissionRoles.reorderColumn,
  );
}
export async function setColumnDone(input: unknown) {
  return boardMutation(
    setColumnDoneSchema,
    input,
    async ({ projectId, columnId, isDone }, { tx, workspace }) => {
      await requireProject(tx, { projectId, workspaceId: workspace.id });
      await requireColumn(tx, { projectId, columnId });
      return tx.column.update({
        where: { id: columnId, projectId },
        data: { isDone },
      });
    },
    permissionRoles.markColumnDone,
  );
}
export async function deleteColumn(input: unknown) {
  return boardMutation(
    deleteColumnSchema,
    input,
    async ({ projectId, columnId }, { tx, workspace }) => {
      await requireProject(tx, { projectId, workspaceId: workspace.id });
      await requireColumn(tx, { projectId, columnId });
      await tx.column.delete({ where: { id: columnId, projectId } });
    },
    permissionRoles.deleteColumn,
  );
}
