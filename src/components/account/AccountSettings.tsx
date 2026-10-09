import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AccountForms } from './AccountForms';

export async function AccountSettings() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className="max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Account settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Update your profile and password.
        </p>
      </header>
      <div className="flex items-center gap-4">
        {user.avatarType ? (
          <Image
            src={`/api/account/avatar?v=${user.updatedAt.getTime()}`}
            alt="Your profile photo"
            width={64}
            height={64}
            unoptimized
            className="size-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-medium"
          >
            {user.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="break-words font-medium">{user.name}</p>
          <p className="break-words text-sm text-muted-foreground">
            {user.email}
          </p>
        </div>
      </div>
      <AccountForms name={user.name} hasAvatar={!!user.avatarType} />
    </div>
  );
}
