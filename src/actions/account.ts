'use server';
import { compare, hash } from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { actionFailure, authLog, type FormState } from '@/lib/action-result';
import { AuthError } from '@/lib/errors';
import { allowAuthAttempt } from '@/lib/rate-limit';
import { profileSchema, changePasswordSchema } from '@/lib/validation/account';
import { avatarContentType } from '@/lib/avatar';

export async function updateProfile(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError();
    const { name, avatar } = profileSchema.parse(Object.fromEntries(form));
    let photo;
    if (avatar?.size) {
      const bytes = new Uint8Array(await avatar.arrayBuffer());
      try {
        photo = { avatar: bytes, avatarType: avatarContentType(bytes) };
      } catch {
        return {
          ok: false,
          field: 'avatar',
          message: 'Choose a JPG, PNG or WebP photo.',
        };
      }
    } else if (form.get('removeAvatar') === 'on') {
      photo = { avatar: null, avatarType: null };
    }
    await db.user.update({ where: { id: user.id }, data: { name, ...photo } });
    revalidatePath('/', 'layout');
    return { ok: true, data: undefined };
  } catch (error) {
    return actionFailure(error, '/account');
  }
}

export async function changePassword(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError();
    if (!allowAuthAttempt(`password-change:${user.id}`))
      return {
        ok: false,
        message: 'Too many attempts. Try again in a minute.',
      };
    const values = changePasswordSchema.parse(Object.fromEntries(form));
    const stored = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!(await compare(values.currentPassword, stored.passwordHash)))
      return {
        ok: false,
        field: 'currentPassword',
        message: 'Current password is incorrect.',
      };
    const result = await db.user.updateMany({
      where: { id: user.id, passwordHash: stored.passwordHash },
      data: { passwordHash: await hash(values.newPassword, 12) },
    });
    if (result.count !== 1)
      return {
        ok: false,
        message: 'Your password changed during this request. Try again.',
      };
    await authLog('Password changed', user.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return actionFailure(error, '/account');
  }
}
