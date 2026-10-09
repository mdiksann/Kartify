'use client';
import { useState, useTransition } from 'react';
import { toast } from '@/lib/toast';
import { Pencil, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  createProjectForm,
  renameProject,
  deleteProject,
} from '@/actions/project';
import {
  createProjectSchema,
  renameProjectSchema,
} from '@/lib/validation/project';
import { ActionForm } from '@/components/ActionForm';
import { ConfirmDelete } from '@/components/ConfirmDelete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export function NewProject({
  slug,
  label = 'New project',
  iconOnly = false,
}: {
  slug: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          aria-label={iconOnly ? label : undefined}
          title={iconOnly ? label : undefined}
          className={
            iconOnly ? 'size-11 rounded-md p-0' : 'rounded-lg max-md:min-h-11'
          }
        >
          {iconOnly ? <Plus aria-hidden="true" /> : label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Start with To Do, In Progress and Done columns.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={async (state, form) => {
            const result = await createProjectForm(state, form);
            if (result?.ok) {
              toast.success('Project created');
              setOpen(false);
            }
            return result;
          }}
          schema={createProjectSchema}
          hidden={{ slug }}
          fields={[{ name: 'name', label: 'Project name', maxLength: 80 }]}
          label="Create project"
        />
      </DialogContent>
    </Dialog>
  );
}
export function ProjectControls({
  slug,
  project,
  stayOnList,
}: {
  slug: string;
  project: { id: string; name: string };
  stayOnList?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="secondary"
            className="size-11 shrink-0 p-0"
            aria-label={`Rename ${project.name}`}
            title={`Rename ${project.name}`}
          >
            <Pencil aria-hidden="true" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              Choose a name for this project.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = renameProjectSchema.safeParse({
                slug,
                projectId: project.id,
                name: new FormData(event.currentTarget).get('name'),
              });
              if (!data.success) {
                setError(data.error.issues[0]?.message ?? 'Check the name.');
                return;
              }
              startTransition(async () => {
                try {
                  const result = await renameProject(data.data);
                  if (!result.ok) {
                    setError(result.message);
                    return;
                  }
                  toast.success('Project renamed');
                  setOpen(false);
                } catch {
                  setError('Could not rename the project. Try again.');
                }
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor={`project-name-${project.id}`}>Project name</Label>
              <Input
                id={`project-name-${project.id}`}
                name="name"
                defaultValue={project.name}
                maxLength={80}
                required
                disabled={pending}
                aria-invalid={!!error}
                aria-describedby={error ? 'project-name-error' : undefined}
              />
            </div>
            {error && (
              <p
                id="project-name-error"
                role="alert"
                className="text-xs text-destructive-text"
              >
                {error}
              </p>
            )}
            <Button disabled={pending} aria-busy={pending}>
              {pending ? (
                <Loader2 className="animate-spin" aria-label="Saving" />
              ) : (
                'Save changes'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDelete
        name={project.name}
        label="Delete project"
        iconOnly
        description="All columns, tasks, comments and history will be permanently deleted."
        action={() =>
          deleteProject({ slug, projectId: project.id, confirmation: 'DELETE' })
        }
        onDeleted={() => {
          if (!stayOnList) router.push(`/w/${slug}/projects`);
        }}
      />
    </div>
  );
}
