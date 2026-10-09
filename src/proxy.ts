import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { authRedirect } from '@/lib/auth-routing';
// Next.js 16 proxy replaces middleware. This is a convenience redirect only;
// each page/action independently checks the session and current membership.
export async function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  const path = request.nextUrl.pathname;
  const guarded =
    path === '/account' ||
    path === '/workspaces' ||
    path === '/w' ||
    path.startsWith('/w/') ||
    path === '/login' ||
    path === '/register';
  const token = guarded
    ? await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
        secureCookie: process.env.NODE_ENV === 'production',
      })
    : null;
  // A deleted account must not get stuck redirecting between login and selection.
  const authenticated =
    !!token?.sub &&
    !!(await db.user.findUnique({
      where: { id: token.sub },
      select: { id: true },
    }));
  const destination = guarded
    ? authRedirect(path, request.nextUrl.search, authenticated)
    : null;
  const response = destination
    ? NextResponse.redirect(new URL(destination, request.url))
    : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('x-request-id', requestId);
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
