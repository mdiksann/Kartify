'use server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { hash } from 'bcryptjs';
import { AuthError as NextAuthError } from 'next-auth';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { signIn, signOut, getCurrentUser } from '@/lib/auth';
import { loginSchema, registerSchema } from '@/lib/validation/auth';
import { actionFailure, authLog, type FormState } from '@/lib/action-result';
import { allowAuthAttempt } from '@/lib/rate-limit';
import { authIp } from '@/lib/auth-ip';
import { safeNext } from '@/lib/auth-routing';
import { ConflictError } from '@/lib/errors';
export async function register(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  let credentials;
  try {
    if (!allowAuthAttempt(authIp(await headers())))
      return {
        ok: false,
        message: 'Too many attempts. Try again in a minute.',
      };
    credentials = registerSchema.parse(Object.fromEntries(form));
    const user = await db.user.create({
      data: {
        email: credentials.email,
        name: credentials.name,
        passwordHash: await hash(credentials.password, 12),
      },
      select: { id: true },
    });
    await authLog('User registered', user.id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      error = new ConflictError(
        'Unable to create an account with these details.',
      );
    return actionFailure(error, '/register');
  }
  try {
    await signIn('credentials', {
      email: credentials.email,
      password: credentials.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof NextAuthError && error.type === 'CredentialsSignin')
      return { ok: false, message: 'Account created. Log in to continue.' };
    return actionFailure(error, '/register');
  }
  redirect(safeNext(form.get('next')));
}
export async function login(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const credentials = loginSchema.parse(Object.fromEntries(form));
    await signIn('credentials', { ...credentials, redirect: false });
  } catch (error) {
    if (
      error instanceof z.ZodError &&
      !allowAuthAttempt(authIp(await headers()))
    )
      return { ok: false, message: 'Invalid email or password.' };
    if (error instanceof NextAuthError && error.type === 'CredentialsSignin')
      return { ok: false, message: 'Invalid email or password.' };
    return actionFailure(error, '/login');
  }
  redirect(safeNext(form.get('next')));
}
export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  await signOut({ redirect: false });
  await authLog('User logged out', user?.id);
  redirect('/login');
}
