import { Request, Response, NextFunction } from 'express';
import { TLSSocket } from 'tls'; // Import TLSSocket for type checking

export function certInfoMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.socket instanceof TLSSocket) {
        const tlsSocket = req.socket as TLSSocket;
        const cert = tlsSocket.getPeerCertificate();

        if (cert && Object.keys(cert).length > 0) {
            const ou = cert.subject?.OU || 'Unknown';
            console.log(`Client certificate OU: ${ou}`);
            (req as any).clientOU = ou;
        } else {
            console.warn('TLS connection, but no client certificate provided or certificate is empty.');
        }
    } else {
        console.warn('Request received over non-TLS (HTTP) connection. Skipping client certificate check.');
    }

    next(); 
}