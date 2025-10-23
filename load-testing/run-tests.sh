#!/bin/bash

# Load Testing Runner Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Consumer Logistics Load Testing${NC}"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed. Please install k6 first.${NC}"
    exit 1
fi

# Set environment
ENVIRONMENT=${ENVIRONMENT:-dev}
echo -e "${YELLOW}📍 Environment: $ENVIRONMENT${NC}"

# Run tests based on argument
case "$1" in
    smoke)
        echo -e "${GREEN}🔍 Running Smoke Test...${NC}"
        k6 run tests/smoke-test.js
        ;;
    load)
        echo -e "${GREEN}⚡ Running Load Test...${NC}"
        k6 run --out json=results/load-test-$(date +%Y%m%d-%H%M%S).json tests/load-test.js
        ;;
    stress)
        echo -e "${GREEN}💪 Running Stress Test...${NC}"
        k6 run --out json=results/stress-test-$(date +%Y%m%d-%H%M%S).json tests/stress-test.js
        ;;
    spike)
        echo -e "${GREEN}📈 Running Spike Test...${NC}"
        k6 run --out json=results/spike-test-$(date +%Y%m%d-%H%M%S).json tests/spike-test.js
        ;;
    all)
        echo -e "${GREEN}🎯 Running All Tests...${NC}"
        mkdir -p results
        k6 run tests/smoke-test.js
        k6 run --out json=results/load-test-$(date +%Y%m%d-%H%M%S).json tests/load-test.js
        k6 run --out json=results/stress-test-$(date +%Y%m%d-%H%M%S).json tests/stress-test.js
        ;;
    *)
        echo -e "${YELLOW}Usage: $0 {smoke|load|stress|spike|all}${NC}"
        echo -e "${YELLOW}Example: ENVIRONMENT=prod $0 load${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}✅ Load testing completed!${NC}"