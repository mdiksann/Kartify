'use server';
import { boardMutation } from '@/lib/board-mutation';
import {
  requireProject,
  requireColumn,
  requireTask,
} from '@/lib/project-access';
import { allocatePosition } from '@/lib/positions';
import { recordActivity } from '@/lib/activity';
import { taskChangeEvents } from '@/lib/task-changes';
import { taskViewInclude } from '@/lib/task-select';
import {
  createTaskSchema,
  updateTaskSchema,
  deleteTaskSchema,
  moveTaskSchema,
} from '@/lib/validation/task';
import { ForbiddenError, ValidationError } from '@/lib/errors';
export async function createTask(input: unknown) {
  return boardMutation(
    createTaskSchema,
    input,
    async (
      {
        projectId,
        columnId,
        title,
        description,
        priority,
        assigneeId,
        dueDate,
      },
      { tx, workspace, user },
    ) => {
      await requireProject(tx, { projectId, workspaceId: workspace.id });
      await requireColumn(tx, { projectId, columnId });
      if (
        assigneeId &&
        !(await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: workspace.id,
              userId: assigneeId,
            },
          },
        }))
      )
        throw new ValidationError('Choose an active workspace member.');
      const task = await tx.task.create({
        data: {
          projectId,
          columnId,
          title,
          description: description || null,
          priority,
          assigneeId,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00Z`) : null,
          createdBy: user.id,
          position: await allocatePosition(tx, {
            kind: 'task',
            parentId: columnId,
          }),
        },
        include: taskViewInclude,
      });
      await recordActivity(tx, {
        taskId: task.id,
        actorId: user.id,
        event: { type: 'TASK_CREATED', data: { title } },
      });
      return task;
    },
  );
}
export async function updateTask(input: unknown) {
  return boardMutation(
    updateTaskSchema,
    input,
    async (values, { tx, workspace, user }) => {
      const before = await requireTask(tx, {
        ...values,
        workspaceId: workspace.id,
      });
      let assigneeName: string | null = null;
      if (values.assigneeId) {
        const member = await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: workspace.id,
              userId: values.assigneeId,
            },
          },
          select: { user: { select: { name: true } } },
        });
        if (!member)
          throw new ValidationError('Choose an active workspace member.');
        assigneeName = member.user.name;
      }
      const events = taskChangeEvents(before, values, assigneeName);
      if (!events.length) return before;
      const task = await tx.task.update({
        where: { id: before.id, projectId: before.projectId },
        data: {
          title: values.title,
          description:
            values.description === undefined
              ? undefined
              : values.description || null,
          priority: values.priority,
          assigneeId: values.assigneeId,
          dueDate:
            values.dueDate === undefined
              ? undefined
              : values.dueDate
                ? new Date(`${values.dueDate}T00:00:00Z`)
                : null,
        },
        include: taskViewInclude,
      });
      for (const event of events)
        await recordActivity(tx, { taskId: task.id, actorId: user.id, event });
      return task;
    },
  );
}
export async function deleteTask(input: unknown) {
  return boardMutation(
    deleteTaskSchema,
    input,
    async (values, { tx, workspace, user, member }) => {
      const task = await requireTask(tx, {
        ...values,
        workspaceId: workspace.id,
      });
      if (member.role === 'MEMBER' && task.createdBy !== user.id)
        throw new ForbiddenError();
      await tx.task.delete({
        where: { id: task.id, projectId: task.projectId },
      });
    },
  );
}
export async function moveTask(input: unknown) {
  return boardMutation(
    moveTaskSchema,
    input,
    async (values, { tx, workspace, user }) => {
      const task = await requireTask(tx, {
        ...values,
        workspaceId: workspace.id,
      });
      const target = await requireColumn(tx, {
        projectId: task.projectId,
        columnId: values.toColumnId,
      });
      const position = await allocatePosition(tx, {
        kind: 'task',
        parentId: target.id,
        excludeId: task.id,
        beforeId: values.beforeId,
        afterId: values.afterId,
      });
      const current = await tx.task.findUniqueOrThrow({
        where: { id: task.id, projectId: task.projectId },
        include: taskViewInclude,
      });
      if (current.columnId === target.id && current.position === position)
        return current;
      const result = await tx.task.update({
        where: { id: task.id, projectId: task.projectId },
        data: { columnId: target.id, position },
        include: taskViewInclude,
      });
      await recordActivity(tx, {
        taskId: task.id,
        actorId: user.id,
        event: {
          type: 'TASK_MOVED',
          data: {
            fromColumn: task.column.name,
            toColumn: target.name,
            position,
          },
        },
      });
      return result;
    },
  );
}
