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
      <h1 className="text-xl font-semibold">Create your account</h1>
      <AuthForm mode="register" next={next} />
      <Link
        className="mt-4 inline-block text-sm text-primary hover:underline"
        href={`/login?next=${encodeURIComponent(next)}`}
      >
        Log in
      </Link>
    </>
  );
}
