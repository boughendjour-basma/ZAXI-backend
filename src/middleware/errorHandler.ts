import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]:', err);

  // Handle Zod Validation Errors
  if (err instanceof ZodError || err?.name === 'ZodError' || Array.isArray(err?.issues)) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.issues || err.errors,
    });
  }

  // Handle Prisma Foreign Key & Not Found errors
  if (err?.code === 'P2003') {
    return res.status(401).json({
      status: 'error',
      message: 'Compte client introuvable ou session expirée. Veuillez vous reconnecter.',
    });
  }

  if (err?.code === 'P2025') {
    return res.status(404).json({
      status: 'error',
      message: 'Enregistrement introuvable.',
    });
  }

  // Define structured error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    message,
    // Only send stack in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
