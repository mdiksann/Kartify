import { beforeEach, afterEach, afterAll, expect, it, vi } from 'vitest';
import {
  db,
  actor,
  createDomainFixture,
  dataOf,
  type DomainFixture,
} from './board-fixture';
const { listProjects, renameProject, deleteProject } =
  await import('@/actions/project');
const {
  renameColumn,
  deleteColumn,
  setColumnDone,
  reorderColumn,
  createColumn,
} = await import('@/actions/column');
const { createTask, updateTask, deleteTask, moveTask } =
  await import('@/actions/task');
const { createComment, updateComment, deleteComment } =
  await import('@/actions/comment');
const { getTaskDetails, listComments, listActivities } =
  await import('@/actions/board');
const { listMembers, changeRole, removeMember, addMemberByEmail } =
  await import('@/actions/member');
const { readBoard } = await import('@/lib/board-queries');
let f: DomainFixture;
let taskId: string;
let commentId: string;
let activityId: string;
let membershipId: string;
beforeEach(async () => {
  f = await createDomainFixture();
  const scope = { slug: f.otherSlug, projectId: f.otherProject.id };
  actor(f.owner);
  taskId = dataOf(
    await createTask({
      ...scope,
      columnId: f.otherColumn.id,
      title: 'Foreign task',
    }),
  ).id;
  commentId = dataOf(
    await createComment({ ...scope, taskId, body: 'Foreign comment' }),
  ).id;
  activityId = (await db.activity.findFirstOrThrow({ where: { taskId } })).id;
  membershipId = (
    await db.workspaceMember.findFirstOrThrow({
      where: { workspaceId: f.otherId },
    })
  ).id;
  actor(f.admin); // privileged in A, no membership in B
});
afterEach(async () => {
  await f.cleanup();
});
afterAll(() => vi.unstubAllEnvs());
const denied = { ok: false, message: 'The requested resource was not found.' };
it('projects in B cannot be read, updated or deleted by A', async () => {
  expect(await listProjects({ slug: f.otherSlug })).toMatchObject(denied);
  await expect(
    readBoard({ slug: f.slug, projectId: f.otherProject.id }),
  ).rejects.toThrow('not found');
  expect(
    await renameProject({
      slug: f.slug,
      projectId: f.otherProject.id,
      name: 'Hacked',
    }),
  ).toMatchObject(denied);
  expect(
    await deleteProject({
      slug: f.slug,
      projectId: f.otherProject.id,
      confirmation: 'DELETE',
    }),
  ).toMatchObject(denied);
  expect(
    (await db.project.findUniqueOrThrow({ where: { id: f.otherProject.id } }))
      .name,
  ).toBe('Other board');
});
it('columns in B cannot be read, created, updated, reordered or deleted by A', async () => {
  const scope = {
    slug: f.slug,
    projectId: f.otherProject.id,
    columnId: f.otherColumn.id,
  };
  await expect(readBoard(scope)).rejects.toThrow('not found');
  for (const result of [
    await createColumn({ ...scope, name: 'Hacked' }),
    await renameColumn({ ...scope, name: 'Hacked' }),
    await setColumnDone({ ...scope, isDone: true }),
    await reorderColumn(scope),
    await deleteColumn({ ...scope, confirmation: 'DELETE' }),
  ])
    expect(result).toMatchObject(denied);
  expect(await db.column.count({ where: { id: f.otherColumn.id } })).toBe(1);
});
it('tasks in B cannot be read, created, updated, moved or deleted by A', async () => {
  const scope = { slug: f.slug, projectId: f.otherProject.id, taskId };
  for (const result of [
    await getTaskDetails(scope),
    await createTask({ ...scope, columnId: f.otherColumn.id, title: 'Hacked' }),
    await updateTask({ ...scope, title: 'Hacked' }),
    await moveTask({ ...scope, toColumnId: f.columns[0]!.id }),
    await deleteTask({ ...scope, confirmation: 'DELETE' }),
  ])
    expect(result).toMatchObject(denied);
  expect(
    (await db.task.findUniqueOrThrow({ where: { id: taskId } })).title,
  ).toBe('Foreign task');
});
it('comments in B cannot be read, created, edited or deleted by A', async () => {
  const scope = {
    slug: f.slug,
    projectId: f.otherProject.id,
    taskId,
    commentId,
  };
  for (const result of [
    await listComments(scope),
    await createComment({ ...scope, body: 'Hacked' }),
    await updateComment({ ...scope, body: 'Hacked' }),
    await deleteComment({ ...scope, confirmation: 'DELETE' }),
  ])
    expect(result).toMatchObject(denied);
  expect(
    (await db.comment.findUniqueOrThrow({ where: { id: commentId } })).body,
  ).toBe('Foreign comment');
});
it('activities in B cannot be read or used as cursors by A and remain append-only', async () => {
  expect(
    await listActivities({
      slug: f.otherSlug,
      projectId: f.otherProject.id,
      taskId,
      cursor: activityId,
    }),
  ).toMatchObject(denied);
  expect(
    await listActivities({
      slug: f.slug,
      projectId: f.otherProject.id,
      taskId,
    }),
  ).toMatchObject(denied);
  expect(await db.activity.count({ where: { id: activityId } })).toBe(1);
});
it('members in B cannot be read, added, changed or removed by A', async () => {
  for (const result of [
    await listMembers({ slug: f.otherSlug }),
    await addMemberByEmail({
      slug: f.otherSlug,
      email: f.outsider.email,
      role: 'MEMBER',
    }),
    await changeRole({ slug: f.slug, memberId: membershipId, role: 'MEMBER' }),
    await removeMember({ slug: f.slug, memberId: membershipId }),
  ])
    expect(result).toMatchObject(denied);
  expect(
    (
      await db.workspaceMember.findUniqueOrThrow({
        where: { id: membershipId },
      })
    ).role,
  ).toBe('OWNER');
});
it('successful public actions never disclose password fields or hashes', async () => {
  actor(f.owner);
  const scope = { slug: f.otherSlug, projectId: f.otherProject.id, taskId };
  const results = [
    await listProjects(scope),
    await getTaskDetails(scope),
    await listComments(scope),
    await listActivities(scope),
    await listMembers(scope),
    await updateTask({ ...scope, title: 'Updated' }),
    await createComment({ ...scope, body: 'Public comment' }),
  ];
  for (const result of results) {
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/password|\$2[aby]\$/i);
  }
});
