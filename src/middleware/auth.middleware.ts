import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { Role } from '@prisma/client';

/**
 * Middleware to authenticate requests via Bearer JWT.
 * Verifies the token and attaches the decoded payload to req.user.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
};

/**
 * Middleware to restrict access to specific roles.
 * Must be used AFTER the authenticate middleware.
 * @param role The required role (e.g., Role.DRIVER)
 */
export const requireRole = (role: Role) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
