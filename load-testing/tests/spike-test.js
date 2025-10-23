import { check, sleep } from 'k6';
import { ApiClient } from '../utils/api-client.js';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Normal load
    { duration: '30s', target: 500 }, // Sudden spike
    { duration: '1m', target: 10 },   // Back to normal
    { duration: '30s', target: 1000 }, // Bigger spike
    { duration: '1m', target: 0 },    // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.2'],
  },
};

const api = new ApiClient();

export default function () {
  // Test system recovery during traffic spikes
  
  let response = api.healthCheck();
  check(response, {
    'health during spike': (r) => r.status === 200,
  });

  // Focus on read-heavy operations during spikes
  response = api.getCompanies();
  check(response, {
    'companies during spike': (r) => r.status === 200,
  });

  sleep(0.1); // Minimal think time for spike
}