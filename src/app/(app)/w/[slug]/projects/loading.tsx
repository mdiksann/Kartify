import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div
      className="mx-auto max-w-2xl space-y-4 p-6"
      role="status"
      aria-label="Loading projects"
    >
      <Skeleton className="h-6 w-40" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}
