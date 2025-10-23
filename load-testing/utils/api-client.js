import http from 'k6/http';
import { check } from 'k6';
import { getEnvironment } from '../config/environments.js';

const env = getEnvironment();

export class ApiClient {
  constructor() {
    this.baseUrl = env.baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'Clinet-Id': 'consumer-logistics'
    };
  }

  // Company endpoints
  createCompany(companyData) {
    return http.post(`${this.baseUrl}/api/companies`, JSON.stringify(companyData), {
      headers: this.headers
    });
  }

  getCompanies() {
    return http.get(`${this.baseUrl}/api/companies`, { headers: this.headers });
  }

  // Pickup endpoints
  createPickup(pickupData) {
    return http.post(`${this.baseUrl}/api/pickups`, JSON.stringify(pickupData), {
      headers: this.headers
    });
  }

  getPickups(companyName) {
    return http.get(`${this.baseUrl}/api/pickups?company_name=${companyName}`, { headers: this.headers });
  }

  // Truck endpoints
  getTrucks() {
    return http.get(`${this.baseUrl}/api/trucks`, { headers: this.headers });
  }

  // Analytics endpoints
  getDashboardAnalytics() {
    return http.get(`${this.baseUrl}/api/analytics/dashboard`, { headers: this.headers });
  }

  getKPIAnalytics() {
    return http.get(`${this.baseUrl}/api/analytics/kpis`, { headers: this.headers });
  }

  // Health check
  healthCheck() {
    return http.get(`${this.baseUrl}/health`);
  }
}