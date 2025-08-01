import { NextFunction, Request, Response } from 'express';
import { z, ZodObject } from 'zod';
import { InternalServerError, ValidationError } from '../errors/api-error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (schema: ZodObject<any>) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(
          err => `${err.path.join('.')}: ${err.message}`
        );
        next(new ValidationError(issues));
      } else {
        next(
          new InternalServerError(
            'Request processing failed',
            'Validation middleware error ' + (error as Error)?.message
          )
        );
      }
    }
  };
