import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { Toaster } from 'sonner';
import { RequestIdProvider } from '@/components/layout/RequestIdProvider';
import './globals.css';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
export const metadata: Metadata = {
  title: { default: 'Kartify', template: '%s | Kartify' },
  description: 'A collaborative project workspace.',
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestId =
    (await headers()).get('x-request-id') ?? crypto.randomUUID();
  return (
    <html lang="en">
      <body className={inter.variable}>
        <RequestIdProvider requestId={requestId}>{children}</RequestIdProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className:
              'rounded-lg border border-gray-200 bg-white text-sm shadow-sm',
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
