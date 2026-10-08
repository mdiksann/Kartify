import { notFound } from 'next/navigation';
import { z } from 'zod';
import { readBoard } from '@/lib/board-queries';
import { NotFoundError } from '@/lib/errors';
import { Board } from '@/components/board/Board';
export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string }>;
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
  return (
    <Board
      data={data}
      slug={scope.slug}
      today={new Date().toISOString().slice(0, 10)}
    />
  );
}
