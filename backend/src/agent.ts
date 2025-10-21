import https from 'https';
import { certs } from './utils/certs';

export const agent = new https.Agent({
    // cert: certs.cert,
    // key: certs.key,
    rejectUnauthorized: false,
});
 