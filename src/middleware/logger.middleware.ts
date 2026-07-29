import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to log HTTP API requests for system auditing and monitoring.
 * Logs method, endpoint, user ID, status, execution duration, and IP address.
 */
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const userId = req.user?.userId ? `user=${req.user.userId}` : 'anonymous';

    // Format: METHOD /path user=xyz status=200 time=45ms ip=127.0.0.1
    console.log(
      `[HTTP] ${method} ${originalUrl} ${userId} status=${statusCode} time=${durationMs}ms ip=${ip || 'unknown'}`
    );
  });

  next();
};
