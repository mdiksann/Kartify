import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';
import { safeNext } from '@/lib/auth-routing';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  return (
    <>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        Log in to Kartify
      </h1>
      <AuthForm mode="login" next={next} />
      <Link
        className="mt-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline"
        href={`/register?next=${encodeURIComponent(next)}`}
      >
        Create an account
      </Link>
    </>
  );
}
