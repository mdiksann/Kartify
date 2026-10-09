import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { workspacePageAccess } from '@/lib/workspace-access';
import { readSearch } from '@/lib/search';
import { SearchControls } from '@/components/search/SearchControls';
import { TaskRow } from '@/components/task/TaskRow';
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  await workspacePageAccess(slug);
  const data = await readSearch(slug, await searchParams);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      </header>
      <SearchControls slug={slug} filters={data.filters} options={data} />
      <section aria-label="Search results" aria-live="polite">
        <h2 className="text-sm font-semibold">
          {data.count} {data.count === 1 ? 'task' : 'tasks'} found
        </h2>
        {data.count > data.items.length && (
          <p className="mt-2 text-xs text-gray-500">
            Showing the first {data.items.length}. Narrow your search to find
            more specific tasks.
          </p>
        )}
        {data.items.length ? (
          <ul className="mt-3 space-y-3">
            {data.items.map((task) => (
              <TaskRow
                key={task.id}
                outlined
                task={task}
                slug={slug}
                today={data.today}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            title={
              data.filters.q
                ? `No tasks match “${data.filters.q}”`
                : 'No tasks found'
            }
            description="Try another search or open a project board to add tasks."
            action={
              Object.values(data.filters).some(Boolean) ? (
                <Button variant="secondary" asChild className="max-md:min-h-11">
                  <Link href={`/w/${slug}/search`}>Clear filters</Link>
                </Button>
              ) : (
                <Button variant="secondary" asChild className="max-md:min-h-11">
                  <Link href={`/w/${slug}/projects`}>Go to projects</Link>
                </Button>
              )
            }
          />
        )}
      </section>
    </div>
  );
}
