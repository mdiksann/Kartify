'use server';
import { boardMutation } from '@/lib/board-mutation';
import { requireTask } from '@/lib/project-access';
import { recordActivity } from '@/lib/activity';
import { authorSelect } from '@/lib/task-select';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
} from '@/lib/validation/comment';
export async function createComment(input: unknown) {
  return boardMutation(
    createCommentSchema,
    input,
    async (values, { tx, workspace, user }) => {
      const task = await requireTask(tx, {
        ...values,
        workspaceId: workspace.id,
      });
      const comment = await tx.comment.create({
        data: { taskId: task.id, authorId: user.id, body: values.body },
        include: { author: { select: authorSelect } },
      });
      await recordActivity(tx, {
        taskId: task.id,
        actorId: user.id,
        event: { type: 'COMMENT_ADDED', data: { commentId: comment.id } },
      });
      return comment;
    },
  );
}
export async function updateComment(input: unknown) {
  return boardMutation(
    updateCommentSchema,
    input,
    async (values, { tx, workspace, user }) => {
      const task = await requireTask(tx, {
        ...values,
        workspaceId: workspace.id,
      });
      const comment = await tx.comment.findFirst({
        where: { id: values.commentId, taskId: task.id },
      });
      if (!comment) throw new NotFoundError();
      if (comment.authorId !== user.id) throw new ForbiddenError();
      if (comment.body === values.body)
        return tx.comment.findUniqueOrThrow({
          where: { id: comment.id },
          include: { author: { select: authorSelect } },
        });
      const result = await tx.comment.update({
        where: { id: comment.id, taskId: task.id },
        data: { body: values.body },
        include: { author: { select: authorSelect } },
      });
      await recordActivity(tx, {
        taskId: task.id,
        actorId: user.id,
        event: { type: 'COMMENT_UPDATED', data: { commentId: comment.id } },
      });
      return result;
    },
  );
}
export async function deleteComment(input: unknown) {
  return boardMutation(
    deleteCommentSchema,
    input,
    async (values, { tx, workspace, user, member }) => {
      const task = await requireTask(tx, {
        ...values,
        workspaceId: workspace.id,
      });
      const comment = await tx.comment.findFirst({
        where: { id: values.commentId, taskId: task.id },
      });
      if (!comment) throw new NotFoundError();
      if (comment.authorId !== user.id && member.role === 'MEMBER')
        throw new ForbiddenError();
      await tx.comment.delete({ where: { id: comment.id, taskId: task.id } });
      await recordActivity(tx, {
        taskId: task.id,
        actorId: user.id,
        event: { type: 'COMMENT_DELETED', data: { commentId: comment.id } },
      });
    },
  );
}
