export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
export class ValidationError extends AppError {
  constructor(message = 'Check the submitted values.') {
    super(message, 400);
  }
}
export class AuthError extends AppError {
  constructor(message = 'Please log in to continue.') {
    super(message, 401);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'This action is not allowed.') {
    super(message, 403);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 404);
  }
}
export class ConflictError extends AppError {
  constructor(message = 'This change conflicts with existing data.') {
    super(message, 409);
  }
}
export function errorStatus(error: unknown): number {
  return error instanceof AppError ? error.status : 500;
}
