import { Request, Response, NextFunction } from 'express';

export function certInfoMiddleware(req: Request, res: Response, next: NextFunction): void {

  const subjectHeader = req.headers['x-client-cert-subject'];
  const subjectString = Array.isArray(subjectHeader) ? subjectHeader[0] : subjectHeader;

  if (!subjectString || typeof subjectString !== 'string') {
    res.status(403).json({
      error: 'Missing client certificate subject. Organizational Unit (OU) is required.',
    });
    return
  }

  const ouMatch = subjectString.match(/OU=([^,]+)/);
  if (!ouMatch || !ouMatch[1]) {
    res.status(403).json({
      error: 'Organizational Unit (OU) not found in client certificate subject.',
    });
    return
  }

  const clientOU = ouMatch[1];
  console.log(`✔️ Client certificate OU: ${clientOU}`);
  (req as any).clientName = clientOU;

  next();
}
