import Link from 'next/link';
export default function Register() {
  return (
    <>
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="mt-4 text-sm text-gray-700">
        Registration will be available in a future update.
      </p>
      <Link
        className="mt-4 inline-block text-sm text-primary hover:underline"
        href="/login"
      >
        Log in
      </Link>
    </>
  );
}
