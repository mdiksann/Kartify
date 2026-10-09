import { Brand } from '@/components/Brand';
import { ArrowUpRight, Columns3 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
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
    <div>
      <header className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-muted"
          >
            Account settings
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-8 px-5 pb-16 pt-12 md:px-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your workspaces
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a workspace, or make a new home for your team.
          </p>
        </header>
        {workspaces.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Link
                  href={`/w/${workspace.slug}`}
                  className="group flex min-h-24 items-center justify-between gap-3 rounded-lg border border-card-border p-5 text-sm font-medium hover:border-gray-400 hover:bg-muted"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Columns3
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground"
                    />
                    <span className="break-words">{workspace.name}</span>
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No workspaces yet"
            description="Create a workspace to organize projects with your team."
            action={
              <Link
                href="#create-workspace"
                className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Create workspace
              </Link>
            }
          />
        )}
        <section
          id="create-workspace"
          className="max-w-md border-t border-border pt-6"
        >
          <h2 className="text-sm font-semibold">Create workspace</h2>
          <WorkspaceForm />
        </section>
      </main>
    </div>
  );
}
