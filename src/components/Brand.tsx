import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Kartify home"
      className={cn(
        'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md',
        className,
      )}
    >
      <Image
        src="/brand/symbol.svg"
        alt=""
        aria-hidden="true"
        width={40}
        height={40}
        unoptimized
      />
    </Link>
  );
}
