import Link from 'next/link';
export default function Login() {
  return (
    <>
      <h1 className="text-xl font-semibold">Log in to Kartify</h1>
      <p className="mt-4 text-sm text-gray-700">
        Login will be available in a future update.
      </p>
      <Link
        className="mt-4 inline-block text-sm text-primary hover:underline"
        href="/register"
      >
        Create an account
      </Link>
    </>
  );
}
