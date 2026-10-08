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
        <h1 className="text-xl font-semibold">Search</h1>
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
          <ul className="mt-3">
            {data.items.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                slug={slug}
                today={data.today}
              />
            ))}
          </ul>
        ) : (
          <div className="mx-auto max-w-sm px-4 py-10 text-center">
            <h3 className="text-sm font-semibold">
              {data.filters.q
                ? `No tasks match “${data.filters.q}”`
                : 'No tasks found'}
            </h3>
            <p className="mt-2 text-xs text-gray-500">
              Try another search or clear the filters. Create tasks on a project
              board to see them here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
