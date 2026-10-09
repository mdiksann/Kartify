import { CheckCircle2, CircleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { Toaster } from 'sonner';
import { RequestIdProvider } from '@/components/layout/RequestIdProvider';
import './globals.css';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL ?? 'http://localhost:3000'),
  title: { default: 'Kartify', template: '%s | Kartify' },
  description: 'A collaborative project workspace.',
  icons: { icon: [{ url: '/brand/symbol.svg', type: 'image/svg+xml' }] },
  openGraph: {
    type: 'website',
    siteName: 'Kartify',
    title: 'Kartify',
    description: 'A collaborative project workspace.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kartify',
    description: 'A collaborative project workspace.',
    images: [{ url: '/opengraph-image.png', alt: 'Kartify logo' }],
  },
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestId =
    (await headers()).get('x-request-id') ?? crypto.randomUUID();
  return (
    <html
      lang="en"
      data-workspace-theme={
        (await cookies()).get('workspace-theme')?.value === 'dark'
          ? 'dark'
          : 'light'
      }
    >
      <body className={inter.variable}>
        <RequestIdProvider requestId={requestId}>{children}</RequestIdProvider>
        <Toaster
          position="bottom-right"
          icons={{
            success: (
              <CheckCircle2
                className="size-4 text-green-700"
                aria-hidden="true"
              />
            ),
            error: (
              <CircleAlert className="size-4 text-red-600" aria-hidden="true" />
            ),
          }}
          toastOptions={{
            className:
              'rounded-lg border border-border bg-background text-foreground text-sm shadow-lg',
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
