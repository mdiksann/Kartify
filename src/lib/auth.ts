import 'server-only';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from './db';
import { log } from './logger';
import { authorizeCredentials } from './credentials';
export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: authorizeCredentials,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  useSecureCookies: process.env.NODE_ENV === 'production',
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  // Auth.js error objects may contain provider inputs; log fixed messages only.
  logger: {
    error() {
      log('error', 'Authentication failed', {
        requestId: crypto.randomUUID(),
        route: '/auth',
      });
    },
    warn() {
      log('warn', 'Authentication warning', {
        requestId: crypto.randomUUID(),
        route: '/auth',
      });
    },
    debug() {},
  },
});
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatarType: true,
      updatedAt: true,
    },
  });
}
