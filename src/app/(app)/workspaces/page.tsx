import Link from 'next/link';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { userWorkspaces } from '@/lib/workspace-access';
import { WorkspaceForm } from '@/components/workspace/WorkspaceForm';
export default async function Workspaces() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const workspaces = await userWorkspaces(user.id);
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-5 md:px-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Your workspaces</h1>
        <LogoutButton />
      </header>
      {workspaces.length ? (
        <ul className="divide-y divide-gray-100">
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              <Link
                href={`/w/${workspace.slug}`}
                className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-gray-50"
              >
                {workspace.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-8 text-center">
          <h2 className="text-sm font-semibold">No workspaces yet</h2>
          <p className="mt-2 text-xs text-gray-500">
            Create a workspace to get started.
          </p>
        </div>
      )}
      <section>
        <h2 className="text-sm font-semibold">Create workspace</h2>
        <WorkspaceForm />
      </section>
    </main>
  );
}
