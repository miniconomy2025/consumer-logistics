import { readFileSync } from 'fs';
import { Agent } from 'https';

const certPath = './src/certs/consumer-logistics-client.crt';
const keyPath = './src/certs/consumer-logistics-client.key';


export const agent = new Agent({
  cert: readFileSync(certPath),
  key: readFileSync(keyPath),
  rejectUnauthorized: false, 
});
 