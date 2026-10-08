'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Pencil, Loader2 } from 'lucide-react';
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
export function NewProject({ slug }: { slug: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="rounded-lg max-md:min-h-11">New project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Start with To Do, In Progress and Done columns.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={createProjectForm}
          schema={createProjectSchema}
          hidden={{ slug }}
          fields={[{ name: 'name', label: 'Project name', maxLength: 80 }]}
          label="Create project"
          success="Project created"
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
          <Button variant="secondary" aria-label={`Rename ${project.name}`}>
            <Pencil />
            Rename
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
                className="text-xs text-red-600"
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
