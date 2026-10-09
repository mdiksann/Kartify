import { expect, it } from 'vitest';
import { avatarContentType } from '@/lib/avatar';
import {
  profileSchema,
  changePasswordSchema,
  MAX_AVATAR_BYTES,
} from '@/lib/validation/account';
import { safeNext, authRedirect } from '@/lib/auth-routing';

it('limits photo uploads to 2 MB and rejects SVG or spoofed image types', () => {
  expect(
    profileSchema.safeParse({
      name: 'Alex',
      avatar: new File([new Uint8Array(MAX_AVATAR_BYTES)], 'photo.png'),
    }).success,
  ).toBe(true);
  expect(
    profileSchema.safeParse({
      name: 'Alex',
      avatar: new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], 'photo.png'),
    }).success,
  ).toBe(false);
  expect(
    avatarContentType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
  ).toBe('image/png');
  expect(avatarContentType(new Uint8Array([255, 216, 255]))).toBe('image/jpeg');
  expect(avatarContentType(new TextEncoder().encode('RIFF0000WEBP'))).toBe(
    'image/webp',
  );
  expect(() =>
    avatarContentType(new TextEncoder().encode('<svg></svg>')),
  ).toThrow('JPG, PNG or WebP');
});
it('requires matching new passwords and retains bcrypt byte limits', () => {
  const value = {
    currentPassword: 'old-password',
    newPassword: 'new-password',
    confirmPassword: 'new-password',
  };
  expect(changePasswordSchema.safeParse(value).success).toBe(true);
  expect(
    changePasswordSchema.safeParse({ ...value, confirmPassword: 'different' })
      .success,
  ).toBe(false);
  expect(
    changePasswordSchema.safeParse({
      ...value,
      newPassword: 'weak',
      confirmPassword: 'weak',
    }).success,
  ).toBe(false);
  expect(
    changePasswordSchema.safeParse({
      ...value,
      newPassword: 'é'.repeat(37),
      confirmPassword: 'é'.repeat(37),
    }).success,
  ).toBe(false);
  expect(
    changePasswordSchema.safeParse({
      ...value,
      newPassword: value.currentPassword,
      confirmPassword: value.currentPassword,
    }).success,
  ).toBe(false);
});
it('preserves the account destination through login', () => {
  expect(authRedirect('/account', '', false)).toBe('/login?next=%2Faccount');
  expect(safeNext('/account')).toBe('/account');
});
