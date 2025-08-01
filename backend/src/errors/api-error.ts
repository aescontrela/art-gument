import { HttpStatusCode } from './http-status-codes';

export class APIError extends Error {
  constructor(
    public message: string,
    public statusCode: HttpStatusCode = 500
  ) {
    super(message);
    this.message = message;
    this.statusCode = statusCode;
    this.name = this.constructor.name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends APIError {
  constructor(issues: string[], statusCode: HttpStatusCode = 400) {
    super(`Validation failed: ${issues.join(', ')}`, statusCode);
  }
}

export class NotFoundError extends APIError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends APIError {
  constructor() {
    super('Unauthorized', 401);
  }
}

export class ForbiddenError extends APIError {
  constructor() {
    super('Forbidden', 403);
  }
}

export class InternalServerError extends APIError {
  public readonly originalError?: string;

  constructor(
    message = 'Internal server error',
    originalError?: string,
    statusCode: HttpStatusCode = 500
  ) {
    super(message, statusCode);
    this.originalError = originalError;
  }
}
