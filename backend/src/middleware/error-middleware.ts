import { NextFunction, Request, Response } from 'express';
import { APIError, InternalServerError } from '../errors/api-error';

export default (
  error: APIError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = error instanceof APIError ? error.statusCode : 500;

  const errorName = error.name || 'ServerError';

  console.error(errorName, {
    message: error.message,
    originalError:
      error instanceof InternalServerError ? error.originalError : undefined,
    url: req.url,
    method: req.method,
    stack: error.stack,
  });

  res.status(statusCode).json({
    error: {
      name: errorName,
      message: error.message || 'Something went wrong',
      statusCode,
    },
  });

  return;
};
