import { Request, Response, NextFunction } from 'express';

export function clientInfoMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientHeader = req.headers['client-id'];
  const clientId = Array.isArray(clientHeader) ? clientHeader[0] : clientHeader;

  if (!clientId || typeof clientId !== 'string') {
    res.status(403).json({
      error: 'Missing Client-Id header. Access denied.',
    });
    return; 
  }

  console.log(`Client-Id: ${clientId}`);
  (req as any).clientName = clientId;
  next();
}
