import { Agent } from 'https';
import { certs } from './utils/certs';

export const agent = new Agent({
  cert: certs.cert,
  key: certs.key,
  rejectUnauthorized: false, 
});
 