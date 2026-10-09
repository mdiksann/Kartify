import { z } from 'zod';
import { passwordSchema, registerSchema } from './auth';

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const profileSchema = z.object({
  name: registerSchema.shape.name,
  avatar: z
    .file()
    .max(MAX_AVATAR_BYTES, 'Use a photo no larger than 2 MB.')
    .optional(),
});
export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'Choose a different password.',
  });
