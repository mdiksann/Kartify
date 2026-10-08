'use client';
import { ActionForm } from '@/components/ActionForm';
import { createWorkspaceForm, renameWorkspaceForm } from '@/actions/workspace';
import {
  workspaceSchema,
  renameWorkspaceSchema,
} from '@/lib/validation/workspace';
export function WorkspaceForm({
  workspace,
}: {
  workspace?: { slug: string; name: string };
}) {
  return (
    <ActionForm
      action={workspace ? renameWorkspaceForm : createWorkspaceForm}
      schema={workspace ? renameWorkspaceSchema : workspaceSchema}
      fields={[
        {
          name: 'name',
          label: 'Workspace name',
          maxLength: 80,
          defaultValue: workspace?.name,
        },
      ]}
      hidden={workspace ? { slug: workspace.slug } : undefined}
      label={workspace ? 'Save changes' : 'Create workspace'}
      success={workspace ? 'Workspace renamed' : undefined}
    />
  );
}
