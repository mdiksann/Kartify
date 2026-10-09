import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';
import { db } from '@/lib/db';
import { workspacePageAccess } from '@/lib/workspace-access';
import { can } from '@/lib/permissions';
import {
  NewProject,
  ProjectControls,
} from '@/components/project/ProjectControls';
export default async function Projects({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { workspace, member } = await workspacePageAccess(slug);
  const projects = await db.project.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    take: 100,
  });
  const manage = can(member.role, 'createProject');
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A place for every project your team is working on.
          </p>
        </div>
        {manage && <NewProject slug={slug} iconOnly />}
      </header>
      {projects.length ? (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-card-border bg-background px-4 py-3"
            >
              <Link
                href={`/w/${slug}/board/${project.id}`}
                className="min-w-0 flex-1 break-words text-sm font-medium text-primary hover:underline max-md:block max-md:min-h-11 max-md:py-3"
              >
                {project.name}
              </Link>
              {manage && (
                <ProjectControls slug={slug} project={project} stayOnList />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No projects yet"
          description={
            manage
              ? 'Create a project to start organizing tasks.'
              : 'Ask an Owner or Admin to create a project.'
          }
          action={
            manage ? (
              <NewProject slug={slug} label="Create project" />
            ) : undefined
          }
        />
      )}
    </div>
  );
}
