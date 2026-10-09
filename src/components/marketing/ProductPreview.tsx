'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Columns3, MessageSquare } from 'lucide-react';
import type { TaskPriority } from '@prisma/client';
import { PriorityBadge } from '@/components/task/PriorityBadge';

const columns = [
  {
    name: 'To Do',
    color: 'bg-gray-100 text-gray-700',
    title: 'Prepare the help guide',
    owner: 'J',
    priority: 'LOW',
    comments: 0,
  },
  {
    name: 'In Progress',
    color: 'bg-amber-100 text-amber-800',
    title: 'Review the onboarding flow',
    owner: 'M',
    priority: 'MEDIUM',
    comments: 1,
  },
  {
    name: 'Done',
    color: 'bg-green-100 text-green-800',
    title: 'Agree on the launch plan',
    owner: 'J',
    priority: 'MEDIUM',
    comments: 3,
  },
] satisfies {
  name: string;
  color: string;
  title: string;
  owner: string;
  priority: TaskPriority;
  comments: number;
}[];

function PreviewTask({
  title,
  owner,
  priority,
  comments,
}: {
  title: string;
  owner: string;
  priority: TaskPriority;
  comments: number;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-5">{title}</p>
        <span
          aria-label={`Assigned to ${owner}`}
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px]"
        >
          {owner}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MessageSquare aria-hidden="true" className="size-3" />
          {comments}
          <span className="sr-only"> comments</span>
        </span>
        <PriorityBadge priority={priority} />
      </div>
    </>
  );
}

export function ProductPreview() {
  const [phase, setPhase] = useState(0);
  const board = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const previous = useRef<DOMRect | null>(null);
  const animation = useRef<Animation | null>(null);

  const advance = useCallback(() => {
    animation.current?.cancel();
    previous.current = card.current?.getBoundingClientRect() ?? null;
    setPhase((current) => (current + 1) % columns.length);
  }, []);

  useLayoutEffect(() => {
    if (
      !card.current ||
      !previous.current ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const next = card.current.getBoundingClientRect();
    const from = previous.current;
    previous.current = null;
    animation.current = card.current.animate(
      phase === 0
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            {
              transform: `translate(${from.left - next.left}px, ${from.top - next.top}px)`,
              opacity: 1,
            },
            { transform: 'translate(0, 0)', opacity: 1 },
          ],
      { duration: 850, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
    return () => animation.current?.cancel();
  }, [phase]);

  useEffect(() => {
    if (!board.current) return;
    let visible = false;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
      },
      { threshold: 0.2 },
    );
    observer.observe(board.current);
    const timer = window.setInterval(() => {
      if (visible && !document.hidden && !motion.matches) advance();
    }, 3600);
    const stopMotion = () => {
      if (motion.matches) animation.current?.cancel();
    };
    motion.addEventListener('change', stopMotion);
    return () => {
      observer.disconnect();
      clearInterval(timer);
      motion.removeEventListener('change', stopMotion);
    };
  }, [advance]);

  return (
    <figure
      ref={board}
      aria-label="Example project board"
      data-demo-phase={phase}
      className="overflow-hidden rounded-xl border border-card-border bg-white text-left shadow-xl shadow-black/5"
    >
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3 text-xs">
          <span className="inline-flex items-center gap-2 font-medium">
            <Columns3 aria-hidden="true" className="size-3.5" />
            Board
          </span>
          <span className="text-muted-foreground">
            {phase === 2 ? 2 : 1} of 4 complete
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {columns.map((column, index) => (
            <div
              key={column.name}
              className="min-w-0 rounded-lg bg-gray-100 p-2.5"
              data-demo-column={column.name}
            >
              <div className="mb-3 flex items-center gap-2 text-xs">
                <span
                  className={`rounded px-2 py-1 font-medium ${column.color}`}
                >
                  {column.name}
                </span>
                <span className="text-muted-foreground" data-demo-count>
                  {phase === index ? 2 : 1}
                </span>
              </div>
              <div className="relative flex h-[100px] items-center justify-center rounded-md border border-dashed border-border sm:h-[132px]">
                <span className="text-xs text-muted-foreground">
                  {index === 2
                    ? 'Ready to ship'
                    : index === 1
                      ? 'Work in motion'
                      : 'Next up'}
                </span>
                {phase === index && (
                  <div
                    ref={card}
                    data-demo-task
                    className="absolute inset-[-1px] z-10 flex flex-col justify-between rounded-md border border-card-border bg-white p-3 shadow-md"
                  >
                    <PreviewTask
                      title="Build the new homepage"
                      owner="A"
                      priority="HIGH"
                      comments={4}
                    />
                  </div>
                )}
              </div>
              <div className="mt-2 hidden min-h-[132px] rounded-md border border-card-border bg-white p-3 shadow-sm sm:flex sm:flex-col sm:justify-between">
                <PreviewTask {...column} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}
