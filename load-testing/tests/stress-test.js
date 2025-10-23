import { check, sleep } from 'k6';
import { ApiClient } from '../utils/api-client.js';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to normal load
    { duration: '5m', target: 100 },  // Increase to stress level
    { duration: '3m', target: 200 },  // Push to breaking point
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
    checks: ['rate>0.90'],
  },
};

const api = new ApiClient();

export default function () {
  // Focus on most critical endpoints under stress
  
  // Health check (always)
  let response = api.healthCheck();
  check(response, {
    'health check under stress': (r) => r.status === 200,
  });

  // Heavy read operations
  response = api.getCompanies();
  check(response, {
    'companies under stress': (r) => r.status === 200,
  });

  response = api.getPickups();
  check(response, {
    'pickups under stress': (r) => r.status === 200,
  });

  response = api.getTrucks();
  check(response, {
    'trucks under stress': (r) => r.status === 200,
  });

  // Analytics (CPU intensive)
  response = api.getAnalytics();
  check(response, {
    'analytics under stress': (r) => r.status === 200,
  });

  sleep(0.5); // Shorter think time for stress
}