'use client';
import { toast as sonner } from 'sonner';

// Replace repeated feedback of the same type instead of stacking notifications.
export const toast = {
  success: (message: string) =>
    sonner.success(message, { id: 'mutation-success' }),
  error: (message: string) =>
    sonner.error(message, { id: 'mutation-error', duration: 6000 }),
};
