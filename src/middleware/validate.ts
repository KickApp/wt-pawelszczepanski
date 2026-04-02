import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

function formatZodError(err: ZodError): string {
  const messages = err.issues.map((issue) => {
    const path = issue.path.filter((p) => p !== 'body' && p !== 'query' && p !== 'params').join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return messages.join('; ');
}

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: formatZodError(err) });
        return;
      }
      next(err);
    }
  };
}
