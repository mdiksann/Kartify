import { notFound } from 'next/navigation';
import { workspacePageAccess } from '@/lib/workspace-access';
// Shell destinations only. Feature screens belong to later tickets.
export default async function WorkspaceSection({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const { slug, section } = await params;
  await workspacePageAccess(slug);
  const titles: Record<string, string> = {
    projects: 'Projects',
    search: 'Search',
    members: 'Members',
  };
  const title = titles[section];
  if (!title) notFound();
  return (
    <>
      <header>
        <h1 className="text-xl font-semibold">{title}</h1>
      </header>
      <p className="py-10 text-center text-sm text-gray-500">
        This section will be available in a future update.
      </p>
    </>
  );
}
