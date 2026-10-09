import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-10">
      <div className="space-y-3">
        <Skeleton className="size-8" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="grid grid-cols-2 gap-6 border-y py-5 md:grid-cols-4">
        {[0, 1, 2, 3].map((stat) => (
          <div key={stat} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((project) => (
          <div key={project} className="space-y-4 rounded-lg border p-4">
            <Skeleton className="size-5" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-1 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        {[0, 1, 2].map((task) => (
          <Skeleton key={task} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
