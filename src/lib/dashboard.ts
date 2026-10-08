import 'server-only';
import { db } from './db';
import { workspaceAccess } from './workspace-access';
import { taskRowSelect } from './search';
import { utcDate } from './task-indicators';
import { progressPercent } from './progress';
export async function readDashboard(slug: unknown, now: Date = new Date()) {
  const { workspace, user } = await workspaceAccess(slug);
  const today = utcDate(now);
  const scope = { project: { workspaceId: workspace.id } };
  const overdue = {
    ...scope,
    dueDate: { lt: new Date(`${today}T00:00:00Z`) },
    column: { isDone: false },
  };
  return db.$transaction(
    async (tx) => {
      const [
        projects,
        groups,
        late,
        total,
        done,
        overdueCount,
        assignedCount,
        assigned,
      ] = await Promise.all([
        tx.project.findMany({
          where: { workspaceId: workspace.id },
          select: {
            id: true,
            name: true,
            columns: { select: { id: true, isDone: true }, take: 1000 },
          },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          take: 100,
        }),
        tx.task.groupBy({
          by: ['projectId', 'columnId'],
          where: scope,
          _count: { _all: true },
          orderBy: [{ projectId: 'asc' }, { columnId: 'asc' }],
          take: 10000,
        }),
        tx.task.groupBy({
          by: ['projectId'],
          where: overdue,
          _count: { _all: true },
          orderBy: { projectId: 'asc' },
          take: 100,
        }),
        tx.task.count({ where: scope }),
        tx.task.count({ where: { ...scope, column: { isDone: true } } }),
        tx.task.count({ where: overdue }),
        tx.task.count({ where: { ...scope, assigneeId: user.id } }),
        tx.task.findMany({
          where: { ...scope, assigneeId: user.id },
          select: taskRowSelect,
          orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
          take: 100,
        }),
      ]);
      return {
        workspace,
        today,
        total,
        done,
        overdueCount,
        assignedCount,
        assigned,
        projects: projects.map((project) => {
          const counts = groups.filter((g) => g.projectId === project.id);
          const total = counts.reduce((sum, g) => sum + g._count._all, 0);
          const doneIds = new Set(
            project.columns.filter((c) => c.isDone).map((c) => c.id),
          );
          const done = counts
            .filter((g) => doneIds.has(g.columnId))
            .reduce((sum, g) => sum + g._count._all, 0);
          return {
            id: project.id,
            name: project.name,
            total,
            done,
            percent: progressPercent(done, total),
            overdue:
              late.find((g) => g.projectId === project.id)?._count._all ?? 0,
          };
        }),
      };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
