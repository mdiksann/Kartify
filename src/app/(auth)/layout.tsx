import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Brand } from '@/components/Brand';
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="px-5 py-4 md:px-8">
        <Brand />
      </header>
      <main className="mx-auto flex min-h-[calc(100svh-4.75rem)] w-full max-w-lg flex-col justify-center px-5 py-4 sm:px-8 sm:py-6 [@media(max-height:700px)]:py-2">
        <Link
          href="/"
          className="mb-2 inline-flex min-h-11 w-fit items-center gap-2 text-base text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to home
        </Link>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground [@media(max-height:700px)]:hidden">
          A shared place for your team’s work.
        </p>
        <section className="w-full">{children}</section>
      </main>
    </div>
  );
}
