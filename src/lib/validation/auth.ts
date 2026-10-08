import { z } from 'zod';
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long.')
  .pipe(z.email('Enter a valid email address.'));
// bcrypt processes at most 72 bytes; reject rather than silently truncate.
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use at most 72 bytes.')
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'Use at most 72 bytes.',
  )
  .refine((value) => value.trim().length > 0, 'Enter a password.');
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export const registerSchema = loginSchema.extend({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name.')
    .max(80, 'Use at most 80 characters.'),
});
