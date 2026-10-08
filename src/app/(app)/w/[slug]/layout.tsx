import { cookies } from 'next/headers';
import { workspacePageAccess, userWorkspaces } from '@/lib/workspace-access';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
export default async function WorkspaceLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { workspace, user, member } = await workspacePageAccess(
    (await params).slug,
  );
  const workspaces = await userWorkspaces(user.id);
  return (
    <WorkspaceShell
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      }}
      workspaces={workspaces}
      user={{ name: user.name }}
      role={member.role}
      collapsed={(await cookies()).get('sidebar-collapsed')?.value === 'true'}
    >
      {children}
    </WorkspaceShell>
  );
}
