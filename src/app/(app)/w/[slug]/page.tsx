import Link from 'next/link';
import { workspacePageAccess } from '@/lib/workspace-access';
export default async function WorkspaceHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { workspace } = await workspacePageAccess((await params).slug);
  return (
    <>
      <header>
        <h1 className="text-xl font-semibold">{workspace.name}</h1>
      </header>
      <div className="mx-auto max-w-sm px-4 py-10 text-center">
        <h2 className="text-sm font-semibold">Your workspace is ready</h2>
        <p className="mt-2 text-xs text-gray-500">
          Manage your workspace name and settings.
        </p>
        <Link
          className="mt-4 inline-block text-sm text-primary hover:underline"
          href={`/w/${workspace.slug}/settings`}
        >
          Workspace settings
        </Link>
      </div>
    </>
  );
}
