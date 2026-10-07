import { describe, expect, it } from 'vitest';
import {
  AppError,
  AuthError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  errorStatus,
} from '@/lib/errors';
describe('errorStatus', () => {
  it.each([
    [new ValidationError(), 400],
    [new AuthError(), 401],
    [new ForbiddenError(), 403],
    [new NotFoundError(), 404],
    [new ConflictError(), 409],
  ])('maps %s to its status', (error, status) => {
    expect(error).toBeInstanceOf(AppError);
    expect(errorStatus(error)).toBe(status);
  });
  it('maps unknown failures to 500', () => {
    expect(errorStatus(new Error('internal'))).toBe(500);
    expect(errorStatus(null)).toBe(500);
  });
});
