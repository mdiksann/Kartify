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
      <h1 className="text-xl font-semibold">Log in to Kartify</h1>
      <AuthForm mode="login" next={next} />
      <Link
        className="mt-4 inline-block text-sm text-primary hover:underline"
        href={`/register?next=${encodeURIComponent(next)}`}
      >
        Create an account
      </Link>
    </>
  );
}
