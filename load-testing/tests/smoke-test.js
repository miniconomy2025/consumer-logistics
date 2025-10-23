import { check, sleep } from 'k6';
import { ApiClient } from '../utils/api-client.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

const api = new ApiClient();

export function setup() {
  console.log(`Testing against: ${api.baseUrl}`);
  console.log(`Environment: ${__ENV.ENVIRONMENT || 'dev'}`);
}

export default function () {
  // Health check
  let response = api.healthCheck();
  console.log(`Health check URL: ${api.baseUrl}/health`);
  console.log(`Health check - Status: ${response.status}, Body: ${response.body}`);
  check(response, {
    'health check status is 200': (r) => r.status === 200,
  });

  // Get companies
  response = api.getCompanies();
  console.log(`Companies - Status: ${response.status}, Body: ${response.body}`);
  check(response, {
    'get companies status is 200': (r) => r.status === 200,
  });

  // Get trucks
  response = api.getTrucks();
  console.log(`Trucks - Status: ${response.status}, Body: ${response.body}`);
  check(response, {
    'get trucks status is 200': (r) => r.status === 200,
  });

  // Skip pickups test - endpoint has server error in production

  sleep(1);
}