import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';
import { safeNext } from '@/lib/auth-routing';
export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  return (
    <>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        Create your account
      </h1>
      <AuthForm mode="register" next={next} />
      <Link
        className="mt-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline"
        href={`/login?next=${encodeURIComponent(next)}`}
      >
        Log in
      </Link>
    </>
  );
}
