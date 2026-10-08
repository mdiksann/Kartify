import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div role="status" aria-label="Loading members" className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-20 w-full" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
