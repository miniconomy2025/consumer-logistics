import { Request, Response, NextFunction } from 'express';

export function certInfoMiddleware(req: Request, res: Response, next: NextFunction) {
     console.log('=== Request Object ===');
    console.log({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
        // Add more fields if needed
    });

    console.log(JSON.stringify(req.headers, null, 2));
    // API Gateway forwards client cert OU in X-Client-Cert-OU header
    const clientOuHeader = req.headers['x-client-cert-ou'];

    if (clientOuHeader) {
        const ou = Array.isArray(clientOuHeader) ? clientOuHeader[0] : clientOuHeader;
        console.log(`Client certificate OU (from API Gateway header): ${ou}`);
        (req as any).clientOU = ou;
    } else {
        console.warn('No X-Client-Cert-OU header found. Client certificate information not available via API Gateway.');
    }

    next();
}