import type { ReactNode } from 'react';
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5">
        {children}
      </section>
    </main>
  );
}
