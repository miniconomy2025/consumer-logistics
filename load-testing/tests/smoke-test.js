import { check, sleep } from 'k6';
import { ApiClient } from '../utils/api-client.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

const api = new ApiClient();

export default function () {
  // Health check
  let response = api.healthCheck();
  check(response, {
    'health check status is 200': (r) => r.status === 200,
  });

  // Get companies
  response = api.getCompanies();
  check(response, {
    'get companies status is 200': (r) => r.status === 200,
  });

  // Get trucks
  response = api.getTrucks();
  check(response, {
    'get trucks status is 200': (r) => r.status === 200,
  });

  // Get pickups
  response = api.getPickups();
  check(response, {
    'get pickups status is 200': (r) => r.status === 200,
  });

  sleep(1);
}