'use client';
import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import { useRequestId } from '@/components/layout/RequestIdProvider';
import { Button } from '@/components/ui/button';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const requestId = useRequestId();
  return (
    <section className="mx-auto max-w-md px-4 py-16 text-center">
      <CircleAlert
        aria-hidden="true"
        className="mx-auto size-10 rounded-lg bg-red-50 p-2 text-red-600"
      />
      <h1 className="mt-4 text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-600">
        Please try again. If the problem continues, share this reference.
      </p>
      <p className="mt-3 text-xs text-gray-600">
        Reference:{' '}
        <code className="rounded bg-gray-100 px-2 py-1 font-mono">
          {requestId}
        </code>
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </section>
  );
}
