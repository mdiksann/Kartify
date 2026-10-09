'use client';
import { useRouter } from 'next/navigation';
import { deleteWorkspace } from '@/actions/workspace';
import { ConfirmDelete } from '@/components/ConfirmDelete';
export function DeleteWorkspace({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const router = useRouter();
  return (
    <ConfirmDelete
      name={name}
      label="Delete workspace"
      description="All projects, tasks and history will be permanently deleted. This cannot be undone."
      action={() => deleteWorkspace({ slug, confirmation: 'DELETE' })}
      onDeleted={() => {
        router.push('/workspaces');
        router.refresh();
      }}
    />
  );
}
