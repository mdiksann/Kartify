import Link from 'next/link';
import { ArrowUpRight, Columns3, Home } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { NewProject } from '@/components/project/ProjectControls';
import { workspacePageAccess } from '@/lib/workspace-access';
import { readDashboard } from '@/lib/dashboard';
import { can } from '@/lib/permissions';
import { TaskRow } from '@/components/task/TaskRow';

export default async function WorkspaceHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user, member } = await workspacePageAccess(slug);
  const data = await readDashboard(slug);
  const base = `/w/${slug}`;
  const manage = can(member.role, 'createProject');
  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Home
            aria-hidden="true"
            className="mb-5 size-8 text-muted-foreground"
          />
          <h1 className="text-3xl font-semibold tracking-tight">Home</h1>
          <p className="mt-2 break-words text-sm text-muted-foreground">
            Welcome back, {user.name}. Here’s what’s happening in your
            workspace.
          </p>
        </div>
        {manage && <NewProject slug={slug} />}
      </header>
      <dl className="grid grid-cols-2 gap-y-6 border-y border-border py-5 md:grid-cols-4">
        {[
          ['Total tasks', data.total],
          ['Done', data.done],
          ['Overdue', data.overdueCount],
          ['Assigned to me', data.assignedCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="px-3 first:pl-0 md:border-l md:first:border-l-0"
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd
              className={`mt-2 text-2xl font-medium tabular-nums ${label === 'Overdue' && data.overdueCount > 0 ? 'text-destructive-text' : 'text-foreground'}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Your projects</h2>
          <Link
            href={`${base}/projects`}
            className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            View all projects
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
        {data.projects.length ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.projects.slice(0, 6).map((project) => (
                <Link
                  key={project.id}
                  href={`${base}/board/${project.id}`}
                  className="group min-w-0 rounded-lg border border-card-border p-4 transition-colors hover:border-gray-400 hover:bg-muted"
                >
                  <Columns3
                    aria-hidden="true"
                    className="mb-4 size-5 text-muted-foreground"
                  />
                  <h3 className="line-clamp-2 min-h-10 break-words text-sm font-medium">
                    {project.name}
                  </h3>
                  <div className="mb-3 mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {project.done} of {project.total} tasks done
                    </span>
                    <span className="tabular-nums">{project.percent}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${project.name} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={project.percent}
                    aria-valuetext={`${project.done} of ${project.total} tasks done`}
                    className="h-1 overflow-hidden rounded-full bg-border"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${project.percent}%` }}
                    />
                  </div>
                  {project.overdue > 0 && (
                    <p className="mt-3 text-xs text-destructive-text">
                      {project.overdue} overdue
                    </p>
                  )}
                  {project.total === 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Open the board to add your first task.
                    </p>
                  )}
                </Link>
              ))}
            </div>
            {data.projects.length > 6 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Showing your first 6 projects. View all projects to see the
                rest.
              </p>
            )}
          </>
        ) : (
          <EmptyState
            title="Start your first project"
            description={
              manage
                ? 'Give your work a home. Create a project and add your first task.'
                : 'Ask an Owner or Admin to create a project for your team.'
            }
            action={
              manage ? (
                <NewProject slug={slug} label="Create project" />
              ) : (
                <Link
                  className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm hover:bg-muted"
                  href={`${base}/projects`}
                >
                  Go to projects
                </Link>
              )
            }
          />
        )}
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Assigned to me</h2>
          <Link
            href={`${base}/search?assignee=${user.id}`}
            className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            View my tasks
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
        {data.assignedCount > data.assigned.length && (
          <p className="mb-3 text-xs text-muted-foreground">
            Showing the first {data.assigned.length} assigned tasks.
          </p>
        )}
        {data.assigned.length ? (
          <ul className="border-y border-border">
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
          <EmptyState
            compact
            title="Nothing assigned to you"
            description="Assign a task to yourself from a project board. It will appear here."
            action={
              <Link
                className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm hover:bg-muted"
                href={`${base}/projects`}
              >
                Browse projects
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
