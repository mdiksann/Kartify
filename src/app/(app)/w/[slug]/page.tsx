import Link from 'next/link';
import { workspacePageAccess } from '@/lib/workspace-access';
import { readDashboard } from '@/lib/dashboard';
import { TaskRow } from '@/components/task/TaskRow';
export default async function WorkspaceHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await workspacePageAccess(slug);
  const data = await readDashboard(slug);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">{data.workspace.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Workspace progress</p>
      </header>
      <dl className="grid grid-cols-2 divide-gray-200 rounded-lg border border-gray-200 md:grid-cols-4">
        {[
          ['Total tasks', data.total],
          ['Done', data.done],
          ['Overdue', data.overdueCount],
          ['Assigned to me', data.assignedCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-gray-200 p-4 even:border-l md:border-l md:first:border-l-0"
          >
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd
              className={`mt-1 text-xl font-semibold tabular-nums ${label === 'Overdue' ? 'text-red-600' : 'text-gray-900'}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {data.projects.length ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Project progress</h2>
          {data.projects.map((project) => (
            <div key={project.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/w/${slug}/board/${project.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {project.name}
                </Link>
                <span className="flex items-center gap-2 text-xs text-gray-500 tabular-nums">
                  {project.overdue > 0 && (
                    <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">
                      {project.overdue} overdue
                    </span>
                  )}
                  {project.done}/{project.total} · {project.percent}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${project.name} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={project.percent}
                aria-valuetext={`${project.done} of ${project.total} tasks done`}
                className="h-2 overflow-hidden rounded-full bg-gray-200"
              >
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${project.percent}%` }}
                />
              </div>
              {project.total === 0 && (
                <p className="text-xs text-gray-500">
                  No tasks yet. Open the board to add tasks.
                </p>
              )}
            </div>
          ))}
        </section>
      ) : (
        <section className="mx-auto max-w-sm px-4 py-10 text-center">
          <h2 className="text-sm font-semibold">Start your first project</h2>
          <p className="mt-2 text-xs text-gray-500">
            Create a project and add tasks to track progress. Members can ask an
            Owner or Admin to create a project.
          </p>
          <Link
            className="mt-4 inline-block text-sm text-primary hover:underline"
            href={`/w/${slug}/projects`}
          >
            Go to projects
          </Link>
        </section>
      )}
      <section>
        <h2 className="text-sm font-semibold">Assigned to me</h2>
        {data.assignedCount > data.assigned.length && (
          <p className="mt-2 text-xs text-gray-500">
            Showing the first {data.assigned.length} assigned tasks.
          </p>
        )}
        {data.assigned.length ? (
          <ul className="mt-3">
            {data.assigned.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                slug={slug}
                today={data.today}
              />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-xs text-gray-500">
            Nothing assigned to you. Assign tasks from a project board.
          </p>
        )}
      </section>
    </div>
  );
}
