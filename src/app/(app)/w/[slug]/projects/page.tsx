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
        <h1 className="text-xl font-semibold">Projects</h1>
        {manage && <NewProject slug={slug} />}
      </header>
      {projects.length ? (
        <ul className="divide-y divide-gray-100">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <Link
                href={`/w/${slug}/board/${project.id}`}
                className="text-sm font-medium text-primary hover:underline"
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
        <div className="py-10 text-center">
          <h2 className="text-sm font-semibold">No projects yet</h2>
          <p className="mt-2 text-xs text-gray-500">
            {manage
              ? 'Create a project to start organizing tasks.'
              : 'Ask an Owner or Admin to create a project.'}
          </p>
        </div>
      )}
    </div>
  );
}
