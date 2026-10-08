import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-24 w-full" />
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
