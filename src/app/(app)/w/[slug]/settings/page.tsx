import { workspacePageAccess } from '@/lib/workspace-access';
import { can } from '@/lib/permissions';
import { WorkspaceForm } from '@/components/workspace/WorkspaceForm';
import { DeleteWorkspace } from '@/components/workspace/DeleteWorkspace';
export default async function Settings({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { workspace, member } = await workspacePageAccess((await params).slug);
  return (
    <div className="max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Workspace settings
        </h1>
      </header>
      <section>
        <h2 className="text-sm font-semibold">Workspace name</h2>
        {can(member.role, 'renameWorkspace') ? (
          <WorkspaceForm
            workspace={{ slug: workspace.slug, name: workspace.name }}
          />
        ) : (
          <p className="mt-3 text-sm text-gray-700">
            {workspace.name}. Ask an Owner or Admin to change workspace
            settings.
          </p>
        )}
      </section>
      {can(member.role, 'deleteWorkspace') && (
        <section className="space-y-3 border-t border-gray-200 pt-6">
          <h2 className="text-sm font-semibold">Delete workspace</h2>
          <p className="text-xs text-gray-500">
            Permanently delete this workspace and all its data.
          </p>
          <DeleteWorkspace slug={workspace.slug} name={workspace.name} />
        </section>
      )}
    </div>
  );
}
