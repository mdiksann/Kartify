import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  db,
  actor,
  createDomainFixture,
  dataOf,
  type DomainFixture,
} from './board-fixture';
const { createTask, updateTask, moveTask } = await import('@/actions/task');
const { createComment, updateComment, deleteComment } =
  await import('@/actions/comment');
const { listComments, listActivities, getTaskDetails } =
  await import('@/actions/board');
let f: DomainFixture;
let taskId: string;
beforeEach(async () => {
  f = await createDomainFixture();
  actor(f.member);
  taskId = dataOf(
    await createTask({
      ...f.scope,
      columnId: f.columns[0]!.id,
      title: 'Discussion task',
    }),
  ).id;
});
afterEach(async () => {
  await f.cleanup();
});
const scope = () => ({ ...f.scope, taskId });
describe('comments and activity feed', () => {
  it('creates trimmed comments, records addition and updates/deletes author-owned comments', async () => {
    actor(f.member);
    const comment = dataOf(
      await createComment({ ...scope(), body: ' First comment ' }),
    );
    expect(comment.body).toBe('First comment');
    expect(comment.authorId).toBe(f.member.id);
    expect(
      dataOf(
        await updateComment({
          ...scope(),
          commentId: comment.id,
          body: ' Edited ',
        }),
      ).body,
    ).toBe('Edited');
    dataOf(
      await deleteComment({
        ...scope(),
        commentId: comment.id,
        confirmation: 'DELETE',
      }),
    );
    expect(
      await db.comment.findUnique({ where: { id: comment.id } }),
    ).toBeNull();
    const events = dataOf(await listActivities(scope())).items;
    expect(events.map((row) => row.type)).toEqual([
      'COMMENT_DELETED',
      'COMMENT_UPDATED',
      'COMMENT_ADDED',
      'TASK_CREATED',
    ]);
    expect(events[2]?.event.data).toMatchObject({ commentId: comment.id });
  });
  it('allows privileged deletion but never editing another author’s comment', async () => {
    actor(f.member);
    const first = dataOf(
      await createComment({ ...scope(), body: 'Member comment' }),
    );
    actor(f.admin);
    expect(
      await updateComment({
        ...scope(),
        commentId: first.id,
        body: 'Not allowed',
      }),
    ).toMatchObject({ ok: false, message: 'This action is not allowed.' });
    dataOf(
      await deleteComment({
        ...scope(),
        commentId: first.id,
        confirmation: 'DELETE',
      }),
    );
    actor(f.owner);
    const ownerComment = dataOf(
      await createComment({ ...scope(), body: 'Owner comment' }),
    );
    actor(f.member);
    expect(
      (
        await updateComment({
          ...scope(),
          commentId: ownerComment.id,
          body: 'Not allowed',
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await deleteComment({
          ...scope(),
          commentId: ownerComment.id,
          confirmation: 'DELETE',
        })
      ).ok,
    ).toBe(false);
    actor(f.owner);
    dataOf(
      await deleteComment({
        ...scope(),
        commentId: ownerComment.id,
        confirmation: 'DELETE',
      }),
    );
  });
  it('rejects empty, over-limit and malformed inputs without comments or audit writes', async () => {
    actor(f.member);
    const count = await db.comment.count({ where: { taskId } });
    const events = await db.activity.count({ where: { taskId } });
    for (const body of ['', ' ', 'b'.repeat(5001), 123])
      expect((await createComment({ ...scope(), body })).ok).toBe(false);
    const valid = dataOf(
      await createComment({ ...scope(), body: 'Validation target' }),
    );
    expect(
      (await updateComment({ ...scope(), commentId: valid.id, body: '' })).ok,
    ).toBe(false);
    expect(
      (
        await deleteComment({
          ...scope(),
          commentId: valid.id,
          confirmation: '',
        })
      ).ok,
    ).toBe(false);
    expect(await db.comment.count({ where: { taskId } })).toBe(count + 1);
    expect(await db.activity.count({ where: { taskId } })).toBe(events + 1);
  });
  it('blocks non-member/anonymous actions and foreign task, comment and cursor IDs', async () => {
    actor(f.owner);
    const foreign = dataOf(
      await createTask({
        slug: f.otherSlug,
        projectId: f.otherProject.id,
        columnId: f.otherColumn.id,
        title: 'Foreign task',
      }),
    );
    const foreignScope = {
      slug: f.otherSlug,
      projectId: f.otherProject.id,
      taskId: foreign.id,
    };
    const comment = dataOf(
      await createComment({ ...foreignScope, body: 'Foreign comment' }),
    );
    const activity = await db.activity.findFirstOrThrow({
      where: { taskId: foreign.id },
    });
    for (const user of [f.outsider, null]) {
      actor(user);
      for (const result of [
        await createComment({ ...scope(), body: 'Denied' }),
        await updateComment({
          ...scope(),
          commentId: comment.id,
          body: 'Denied',
        }),
        await deleteComment({
          ...scope(),
          commentId: comment.id,
          confirmation: 'DELETE',
        }),
        await listComments(scope()),
        await listActivities(scope()),
      ])
        expect(result.ok).toBe(false);
    }
    actor(f.owner);
    for (const result of [
      await createComment({ ...scope(), taskId: foreign.id, body: 'Foreign' }),
      await updateComment({
        ...scope(),
        commentId: comment.id,
        body: 'Foreign',
      }),
      await deleteComment({
        ...scope(),
        commentId: comment.id,
        confirmation: 'DELETE',
      }),
      await listComments({ ...scope(), cursor: comment.id }),
      await listActivities({ ...scope(), cursor: activity.id }),
    ])
      expect(result).toMatchObject({
        ok: false,
        message: 'The requested resource was not found.',
      });
    expect(
      (await db.comment.findUniqueOrThrow({ where: { id: comment.id } })).body,
    ).toBe('Foreign comment');
  });
  it('paginates stable reverse-chronological pages of 50 with no duplicates for equal timestamps', async () => {
    actor(f.member);
    const pageTask = dataOf(
      await createTask({
        ...f.scope,
        columnId: f.columns[1]!.id,
        title: 'Pagination task',
      }),
    );
    const pageScope = { ...f.scope, taskId: pageTask.id };
    const time = new Date('2026-01-01T00:00:00Z');
    await db.comment.createMany({
      data: Array.from({ length: 55 }, (_, index) => ({
        taskId: pageTask.id,
        authorId: f.member.id,
        body: `Comment ${index}`,
        createdAt: time,
      })),
    });
    await db.activity.createMany({
      data: Array.from({ length: 55 }, () => ({
        taskId: pageTask.id,
        actorId: f.member.id,
        type: 'TASK_CREATED' as const,
        data: { title: 'Pagination' },
        createdAt: time,
      })),
    });
    const first = dataOf(await listComments(pageScope));
    const next = dataOf(
      await listComments({ ...pageScope, cursor: first.nextCursor }),
    );
    expect(first.items).toHaveLength(50);
    expect(next.items).toHaveLength(5);
    expect(next.nextCursor).toBeNull();
    expect(
      new Set([...first.items, ...next.items].map((row) => row.id)).size,
    ).toBe(55);
    const activityFirst = dataOf(await listActivities(pageScope));
    const activityNext = dataOf(
      await listActivities({ ...pageScope, cursor: activityFirst.nextCursor }),
    );
    expect(activityFirst.items).toHaveLength(50);
    expect(activityNext.items).toHaveLength(6);
    expect(activityNext.nextCursor).toBeNull();
    expect(
      new Set(
        [...activityFirst.items, ...activityNext.items].map((row) => row.id),
      ).size,
    ).toBe(56);
    const oldComment = next.items[0]!;
    expect(
      dataOf(await getTaskDetails({ ...pageScope, commentId: oldComment.id }))
        .highlightedComment?.id,
    ).toBe(oldComment.id);
    expect(JSON.stringify(first)).not.toContain('passwordHash');
  });
  it('shows task edits, assignment/priority/due changes, moves and comments in the task-scoped feed', async () => {
    actor(f.member);
    dataOf(
      await updateTask({
        ...scope(),
        title: 'Updated discussion',
        description: 'Details',
        assigneeId: f.admin.id,
        priority: 'HIGH',
        dueDate: '2026-10-09',
      }),
    );
    dataOf(await moveTask({ ...scope(), toColumnId: f.columns[2]!.id }));
    const prior = dataOf(
      await createComment({ ...scope(), body: 'Earlier comment' }),
    );
    dataOf(
      await updateComment({
        ...scope(),
        commentId: prior.id,
        body: 'Edited comment',
      }),
    );
    dataOf(
      await deleteComment({
        ...scope(),
        commentId: prior.id,
        confirmation: 'DELETE',
      }),
    );
    const comment = dataOf(
      await createComment({ ...scope(), body: 'Feed link' }),
    );
    const feed = dataOf(await listActivities(scope()));
    const types = feed.items.map((row) => row.type);
    for (const type of [
      'TASK_CREATED',
      'TASK_UPDATED',
      'TASK_ASSIGNED',
      'TASK_PRIORITY_CHANGED',
      'TASK_DUE_DATE_CHANGED',
      'TASK_MOVED',
      'COMMENT_ADDED',
      'COMMENT_UPDATED',
      'COMMENT_DELETED',
    ])
      expect(types).toContain(type);
    expect(feed.items.every((row) => row.taskId === taskId)).toBe(true);
    expect(feed.items[0]?.event).toMatchObject({
      type: 'COMMENT_ADDED',
      data: { commentId: comment.id },
    });
    for (let i = 1; i < feed.items.length; i++)
      expect(feed.items[i - 1]!.createdAt.getTime()).toBeGreaterThanOrEqual(
        feed.items[i]!.createdAt.getTime(),
      );
    expect(
      dataOf(await getTaskDetails(scope())).task._count.comments,
    ).toBeGreaterThan(0);
  });
});
