import 'server-only';
import { db } from './db';
import { workspaceAccess, requireCurrentUser } from './workspace-access';
import { requireProject, requireTask } from './project-access';
import { taskViewInclude, authorSelect } from './task-select';
import { projectTargetSchema } from './validation/project';
import { taskDetailsSchema } from './validation/task';
import { taskPageSchema } from './validation/comment';
import { activityPayloadSchema } from './validation/activity';
import { utcDate } from './task-indicators';
import { NotFoundError } from './errors';
export async function readBoard(input: unknown) {
  await requireCurrentUser();
  const values = projectTargetSchema.parse(input);
  const { workspace, user, member } = await workspaceAccess(values.slug);
  const project = await requireProject(db, {
    ...values,
    workspaceId: workspace.id,
  });
  const columns = await db.column.findMany({
    where: { projectId: project.id },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    take: 100,
    include: {
      tasks: {
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        take: 1000,
        include: taskViewInclude,
      },
    },
  });
  return { project, columns, userId: user.id, role: member.role };
}
export type BoardData = Awaited<ReturnType<typeof readBoard>>;
export async function readComments(input: unknown) {
  await requireCurrentUser();
  const values = taskPageSchema.parse(input);
  const { workspace } = await workspaceAccess(values.slug);
  const task = await requireTask(db, { ...values, workspaceId: workspace.id });
  const cursor = values.cursor
    ? await db.comment.findFirst({
        where: { id: values.cursor, taskId: task.id },
        select: { createdAt: true, id: true },
      })
    : null;
  if (values.cursor && !cursor) throw new NotFoundError();
  const rows = await db.comment.findMany({
    where: {
      taskId: task.id,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    include: { author: { select: authorSelect } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 51,
  });
  return {
    items: rows.slice(0, 50),
    nextCursor: rows.length > 50 ? rows[49]!.id : null,
  };
}
export type CommentPage = Awaited<ReturnType<typeof readComments>>;
export async function readActivities(input: unknown) {
  await requireCurrentUser();
  const values = taskPageSchema.parse(input);
  const { workspace } = await workspaceAccess(values.slug);
  const task = await requireTask(db, { ...values, workspaceId: workspace.id });
  const cursor = values.cursor
    ? await db.activity.findFirst({
        where: { id: values.cursor, taskId: task.id },
        select: { createdAt: true, id: true },
      })
    : null;
  if (values.cursor && !cursor) throw new NotFoundError();
  const rows = await db.activity.findMany({
    where: {
      taskId: task.id,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    include: { actor: { select: authorSelect } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 51,
  });
  return {
    items: rows.slice(0, 50).map((row) => ({
      ...row,
      event: activityPayloadSchema.parse({ type: row.type, data: row.data }),
    })),
    nextCursor: rows.length > 50 ? rows[49]!.id : null,
  };
}
export type ActivityPage = Awaited<ReturnType<typeof readActivities>>;
export async function readTaskDetails(input: unknown) {
  await requireCurrentUser();
  const values = taskDetailsSchema.parse(input);
  const { workspace } = await workspaceAccess(values.slug);
  const task = await requireTask(db, { ...values, workspaceId: workspace.id });
  const [members, comments, activities, highlightedComment] = await Promise.all(
    [
      db.workspaceMember.findMany({
        where: { workspaceId: workspace.id },
        select: { user: { select: authorSelect } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 1000,
      }),
      readComments(values),
      readActivities(values),
      values.commentId
        ? db.comment.findFirst({
            where: { id: values.commentId, taskId: task.id },
            include: { author: { select: authorSelect } },
          })
        : null,
    ],
  );
  return {
    task,
    members: members.map((member) => member.user),
    comments,
    activities,
    highlightedComment,
    today: utcDate(new Date()),
  };
}
export type TaskDetailsData = Awaited<ReturnType<typeof readTaskDetails>>;
