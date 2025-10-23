import { check, sleep } from 'k6';
import { ApiClient } from '../utils/api-client.js';
import { getRandomCompany, getRandomPickup, getRandomCompanyName } from '../utils/test-data.js';

export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
  },
};

const api = new ApiClient();

export default function () {
  // Simulate user journey
  
  // 1. Check system health
  let response = api.healthCheck();
  check(response, {
    'health check OK': (r) => r.status === 200,
  });

  // 2. Browse companies (70% of users)
  if (Math.random() < 0.7) {
    response = api.getCompanies();
    check(response, {
      'companies loaded': (r) => r.status === 200,
    });
  }

  // 3. Create new company (20% of users)
  if (Math.random() < 0.2) {
    const companyData = getRandomCompany();
    response = api.createCompany(companyData);
    check(response, {
      'company created': (r) => r.status === 201 || r.status === 200,
    });
  }

  // 4. View pickups (80% of users)
  if (Math.random() < 0.8) {
    const companyName = getRandomCompanyName();
    response = api.getPickups(companyName);
    check(response, {
      'pickups loaded': (r) => r.status === 200,
    });
  }

  // 5. Create pickup (30% of users)
  if (Math.random() < 0.3) {
    const pickupData = getRandomPickup();
    response = api.createPickup(pickupData);
    check(response, {
      'pickup created': (r) => r.status === 201 || r.status === 200,
    });
  }

  // 6. Check dashboard analytics (30% of users)
  if (Math.random() < 0.3) {
    response = api.getDashboardAnalytics();
    check(response, {
      'dashboard analytics loaded': (r) => r.status === 200,
    });
  }

  // 7. Check KPI analytics (20% of users)
  if (Math.random() < 0.2) {
    response = api.getKPIAnalytics();
    check(response, {
      'KPI analytics loaded': (r) => r.status === 200,
    });
  }

  sleep(Math.random() * 3 + 1); // 1-4 seconds think time
}