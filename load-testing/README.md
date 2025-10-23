# Consumer Logistics Load Testing

Professional k6 load testing for backend APIs.

## 🚀 CI/CD Usage

### **GitHub Actions**
1. Go to **Actions** tab in your repository
2. Select **Load Testing** workflow
3. Click **Run workflow**
4. Choose:
   - **Test Type**: smoke, load, stress, or spike
   - **Environment**: dev or prod
5. View results in **Artifacts**

### **Required Secrets**
Add these to your GitHub repository secrets:
- `BACKEND_URL` - Your backend API URL

## 📊 Test Types

| Test | Users | Duration | Purpose |
|------|-------|----------|---------|
| **Smoke** | 1 | 30s | Basic functionality |
| **Load** | 10-50 | 9min | Normal traffic |
| **Stress** | 50-200 | 12min | Breaking point |
| **Spike** | 10-1000 | 5min | Traffic bursts |

## 🎯 Performance Targets

- **Response Time**: 95th percentile < 1000ms
- **Error Rate**: < 5%
- **Availability**: > 99%

## 🔧 Local Testing

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Linux

# Run tests
./run-tests.sh smoke
./run-tests.sh load
ENVIRONMENT=prod ./run-tests.sh stress
```

## 📈 Endpoints Tested

- `GET /health` - System health
- `GET /api/companies` - Company list
- `POST /api/companies` - Create company
- `GET /api/pickups` - Pickup list
- `POST /api/pickups` - Create pickup
- `GET /api/trucks` - Truck fleet
- `GET /api/analytics` - Performance data