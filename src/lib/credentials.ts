import 'server-only';
import { compare, hash } from 'bcryptjs';
import { db } from './db';
import { loginSchema } from './validation/auth';
import { allowAuthAttempt } from './rate-limit';
import { authIp } from './auth-ip';
import { log } from './logger';
// Same bcrypt cost for unknown emails prevents the obvious lookup timing leak.
const dummyHash = hash('kartify-dummy-password-never-an-account', 12);
export async function authorizeCredentials(input: unknown, request: Request) {
  const context = {
    route: '/auth',
    requestId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
  };
  if (!allowAuthAttempt(authIp(request.headers))) {
    log('warn', 'Authentication rate limited', context);
    return null;
  }
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true, passwordHash: true },
  });
  const valid = await compare(
    parsed.data.password,
    user?.passwordHash ?? (await dummyHash),
  );
  if (!user || !valid) {
    log('warn', 'Invalid credentials', context);
    return null;
  }
  log('info', 'User logged in', { ...context, userId: user.id });
  return { id: user.id, email: user.email, name: user.name };
}
