import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { userWorkspaces } from '@/lib/workspace-access';
export default async function WorkspaceEntry() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const [first] = await userWorkspaces(user.id);
  redirect(first ? `/w/${first.slug}` : '/workspaces');
}
