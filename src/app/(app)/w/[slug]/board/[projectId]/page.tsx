import { notFound } from 'next/navigation';
import { z } from 'zod';
import { readBoard } from '@/lib/board-queries';
import { NotFoundError } from '@/lib/errors';
import { db } from '@/lib/db';
import { zId } from '@/lib/validation/workspace';
import { Board } from '@/components/board/Board';
export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const scope = await params;
  let data;
  try {
    data = await readBoard(scope);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof z.ZodError)
      notFound();
    throw error;
  }
  const query = await searchParams;
  const view = z
    .enum(['board', 'timeline', 'calendar'])
    .catch('board')
    .parse(query.view);
  const target = zId.safeParse(query.task);
  const task = target.success
    ? await db.task.findFirst({
        where: { id: target.data, projectId: data.project.id },
        select: { id: true },
      })
    : null;
  return (
    <Board
      key={task?.id ?? data.project.id}
      initialTaskId={task?.id}
      view={view}
      data={data}
      slug={scope.slug}
      today={new Date().toISOString().slice(0, 10)}
    />
  );
}
