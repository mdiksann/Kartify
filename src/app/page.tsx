import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Columns3,
  MessageSquare,
  Users,
} from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { ProductPreview } from '@/components/marketing/ProductPreview';
import { RevealSection } from '@/components/marketing/RevealSection';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const user = await getCurrentUser();
  const start = user ? '/workspaces' : '/register';
  const action = user ? 'Open workspace' : 'Get started';
  return (
    <div>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 text-sm md:flex"
        >
          <Link
            href="#product"
            className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground"
          >
            Product
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground"
          >
            How it works
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {!user && (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center px-2 text-sm hover:underline"
            >
              Log in
            </Link>
          )}
          <Button asChild className="min-h-11 rounded-md">
            <Link href={start}>{action}</Link>
          </Button>
        </div>
      </header>
      <main id="main-content">
        <RevealSection className="mx-auto grid min-h-[calc(100svh-4.75rem)] max-w-7xl items-center gap-12 px-5 pb-16 pt-12 md:px-8 md:pb-24 md:pt-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          <div>
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-tight md:text-6xl lg:text-7xl">
              A clear place for your team’s work.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed md:text-xl text-muted-foreground">
              Bring your projects, tasks, and conversations together. Give every
              task an owner and every project a shared direction.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild className="h-12 rounded-md px-5 text-base">
                <Link href={start}>
                  {user ? 'Open your workspace' : 'Create your workspace'}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Link
                href="#product"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline underline-offset-4"
              >
                Take a look around
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Made for small teams with work to do.
            </p>
          </div>
          <ProductPreview />
        </RevealSection>
        <RevealSection
          id="product"
          className="flex min-h-svh items-center border-y border-border bg-muted"
        >
          <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-8 md:py-20">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                From a first idea to a finished project.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                Keep the plan easy to find and the next step easy to see.
                Kartify gives your team one place to follow the work.
              </p>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {[
                {
                  icon: Columns3,
                  title: 'See the work take shape',
                  text: 'Organize tasks on a board that fits your process. Move a task as the work moves forward.',
                },
                {
                  icon: MessageSquare,
                  title: 'Keep the context close',
                  text: 'Discuss decisions in task comments. Follow the activity history when you need to catch up.',
                },
                {
                  icon: Users,
                  title: 'Know who’s doing what',
                  text: 'Assign an owner, set a priority, and add a due date. Your workspace keeps everyone on the same page.',
                },
              ].map((feature) => (
                <div key={feature.title}>
                  <feature.icon
                    aria-hidden="true"
                    className="mb-5 size-6 text-foreground"
                  />
                  <h3 className="text-xl font-semibold md:text-2xl">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>
        <RevealSection
          id="how-it-works"
          className="mx-auto grid min-h-svh max-w-7xl items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-2 lg:gap-24"
        >
          <div>
            <h2 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Start with a workspace. Make it yours.
            </h2>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground md:text-xl">
              A shared home for the team, with projects that stay organized as
              your work grows.
            </p>
            <Button asChild className="mt-6 min-h-11 rounded-md">
              <Link href={start}>
                {action}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <ol className="divide-y divide-border">
            {[
              [
                'Create your workspace',
                'Give your team a home and invite members by email.',
              ],
              [
                'Set up a project',
                'Start with To Do, In Progress, and Done. Adapt the columns to your workflow.',
              ],
              [
                'Move the work forward',
                'Add tasks, share updates, and follow your progress from the dashboard.',
              ],
            ].map(([title, text], index) => (
              <li key={title} className="flex gap-5 py-6 first:pt-0">
                <span className="mt-0.5 text-lg text-muted-foreground">
                  {index + 1}.
                </span>
                <div>
                  <h3 className="text-lg font-semibold md:text-xl">{title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground md:text-lg">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </RevealSection>
        <RevealSection className="flex flex-col items-center justify-center border-t border-border px-5 py-16 text-center md:py-20">
          <Check aria-hidden="true" className="mx-auto mb-5 size-8" />
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Good work starts with a clear next step.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
            Create a workspace and put your first project in motion.
          </p>
          <Button asChild className="mt-7 h-12 rounded-md px-6">
            <Link href={start}>{action}</Link>
          </Button>
        </RevealSection>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-border px-5 py-6 md:px-8">
        <Brand />
        <p className="text-xs text-muted-foreground">
          A shared place for your team’s work.
        </p>
        <Link
          href={start}
          className="inline-flex min-h-11 items-center text-sm hover:underline"
        >
          {user ? 'Your workspaces' : 'Create an account'}
        </Link>
      </footer>
    </div>
  );
}
