import Link from 'next/link';
import { Brand } from '@/components/Brand';
import { AccountSettings } from '@/components/account/AccountSettings';
export default function AccountPage() {
  return (
    <div>
      <header className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
        <Brand />
        <Link
          href="/workspaces"
          className="inline-flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-muted"
        >
          Back to workspaces
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        <AccountSettings />
      </main>
    </div>
  );
}
