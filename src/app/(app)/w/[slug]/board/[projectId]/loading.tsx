import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading board">
      <Skeleton className="h-6 w-40" />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((lane) => (
          <div
            key={lane}
            className="w-[300px] shrink-0 space-y-3 rounded-lg bg-gray-50 p-3"
          >
            <Skeleton className="h-6 w-32" />
            {[0, 1, 2].map((card) => (
              <div
                key={card}
                className="space-y-3 rounded-lg border border-gray-200 bg-background p-3"
              >
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
