# Consumer Logistics Load Testing

## 📋 Overview

K6-based load testing suite for the Consumer Logistics platform, ensuring system reliability and performance under various traffic conditions.

---

## 🎯 Testing Strategy

### Test Types Implemented

| Test Type | Virtual Users | Duration | Purpose | Thresholds |
|-----------|---------------|----------|---------|------------|
| **Smoke** | 1 | 30s | Basic functionality validation | 95th percentile < 500ms |
| **Load** | 10-50 | 9min | Normal traffic simulation | 95th percentile < 1000ms |
| **Stress** | 50-200 | 12min | Breaking point identification | 95th percentile < 2000ms |
| **Spike** | 10-1000 | 5min | Traffic burst handling | Custom thresholds |

### Performance Targets

- **Response Time**: 95th percentile < 1000ms
- **Error Rate**: < 5% for normal load, < 10% for stress
- **Availability**: > 99%
- **Success Rate**: > 95% for load tests, > 90% for stress tests

---

## 🏗️ Architecture

### Test Structure
```
load-testing/
├── config/
│   └── environments.js     # Environment configurations
├── tests/
│   ├── smoke-test.js      # Basic functionality
│   ├── load-test.js       # Normal traffic
│   ├── stress-test.js     # High load
│   └── spike-test.js      # Traffic spikes
├── utils/
│   ├── api-client.js      # API interaction layer
│   └── test-data.js       # Test data generation
└── run-tests.sh           # Test execution script
```

### Environment Configuration
- **Development**: `localhost:3000`
- **Production**: `afroserve.co.za`

---

## 🔧 API Coverage

### Endpoints Under Test

| Endpoint | Method | Purpose | Load Pattern |
|----------|--------|---------|--------------|
| `/health` | GET | System health check | 100% of users |
| `/api/companies` | GET | Company listing | 70% of users |
| `/api/companies` | POST | Company creation | 20% of users |
| `/api/pickups` | GET | Pickup retrieval | 80% of users |
| `/api/pickups` | POST | Pickup creation | 30% of users |
| `/api/trucks` | GET | Truck fleet data | Read operations |
| `/api/analytics/dashboard` | GET | Dashboard metrics | 30% of users |
| `/api/analytics/kpis` | GET | KPI analytics | 20% of users |

### User Journey Simulation

```javascript
// Realistic user behavior patterns
1. Health Check (100%)
2. Browse Companies (70%)
3. Create Company (20%)
4. View Pickups (80%)
5. Create Pickup (30%)
6. Check Analytics (30%)
7. View KPIs (20%)
```

---

## 📊 Test Scenarios

### 1. Smoke Test
**Purpose**: Validate basic functionality
- **Load**: 1 virtual user
- **Duration**: 30 seconds
- **Focus**: Critical path validation
- **Thresholds**: Strict response times (< 500ms)

### 2. Load Test
**Purpose**: Normal traffic simulation
- **Ramp-up**: 2 minutes to 10 users
- **Sustained**: 5 minutes at 50 users
- **Ramp-down**: 2 minutes to 0 users
- **User Behavior**: Realistic journey patterns

### 3. Stress Test
**Purpose**: System breaking point
- **Progressive Load**: 50 → 100 → 200 users
- **Duration**: 12 minutes total
- **Focus**: Resource exhaustion detection
- **Monitoring**: Error rates and response degradation

### 4. Spike Test
**Purpose**: Traffic burst handling
- **Pattern**: Sudden load increases
- **Peak**: Up to 1000 concurrent users
- **Recovery**: System stability validation

---



## 📈 Monitoring & Metrics

### Key Performance Indicators

- **Response Time Distribution**
  - Average, 95th percentile, 99th percentile
- **Throughput**
  - Requests per second
- **Error Rates**
  - HTTP error percentages
- **Resource Utilization**
  - CPU, memory, network

### Success Criteria

```javascript
thresholds: {
  http_req_duration: ['p(95)<1000'],  // 95% under 1s
  http_req_failed: ['rate<0.05'],     // <5% errors
  checks: ['rate>0.95'],              // >95% success
}
```

---

## 🔍 Test Data Management

### Dynamic Data Generation

```javascript
// Company data
{
  company_name: 'Test Company 1',
  bank_account_id: '12345678'
}

// Pickup data
{
  companyName: 'Test Company 1',
  quantity: 5,
  recipient: 'John Doe',
  modelName: 'Standard Package'
}
```

### Validation Checks

```javascript
// Response validation
check(response, {
  'status is 200': (r) => r.status === 200,
  'response time OK': (r) => r.timings.duration < 1000,
  'has valid JSON': (r) => r.json() !== undefined,
});
```

## 📋 Results Analysis

### Metrics Collection
- JSON output format for detailed analysis
- Timestamped result files
- Automated artifact storage in CI/CD

### Performance Insights
- Bottleneck identification
- Scalability limits
- Resource optimization opportunities

### Reporting
- Automated result collection
- Historical trend analysis
- Performance regression detection

---
