import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div
      className="mx-auto max-w-3xl space-y-8 px-5 pb-16 pt-12 md:px-8"
      role="status"
      aria-label="Loading workspaces"
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <div className="max-w-md space-y-4 border-t border-border pt-6">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-36" />
      </div>
    </div>
  );
}
