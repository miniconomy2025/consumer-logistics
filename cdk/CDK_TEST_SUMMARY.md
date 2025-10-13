# CDK Automated Testing

This directory contains  automated tests for the Consumer Logistics CDK infrastructure.

## Test Structure

```
test/
├── cdk.test.ts              # Main infrastructure tests
├── lambda.test.ts           # Lambda function specific tests
├── security.test.ts         # Security configuration tests
├── integration.test.ts      # Cross-service integration tests
├── deployment-scenarios.test.ts # Different deployment configurations
├── test-utils.ts           # Shared test utilities
└── CDK_TEST_SUMMARY.md          # This file
```

## Test Categories

### 1. Infrastructure Tests (`cdk.test.ts`)
- S3 bucket configurations
- SQS queue setup and DLQ configuration
- RDS database configuration
- Lambda function properties
- IAM roles and policies
- Elastic Beanstalk setup
- API Gateway configuration
- CloudFront distribution
- Resource count validation

### 2. Lambda Tests (`lambda.test.ts`)
- Environment variable configuration
- Memory and timeout settings
- IAM permissions
- SQS integration

### 3. Security Tests (`security.test.ts`)
- S3 bucket security (encryption, public access blocking)
- SQS encryption configuration
- Database security groups
- IAM principle of least privilege
- HTTPS enforcement
- Network security

### 4. Integration Tests (`integration.test.ts`)
- Lambda-SQS event source mappings
- Database connectivity configuration
- API Gateway routing
- CloudFront-S3 integration
- Cross-service dependencies

### 5. Deployment Scenarios (`deployment-scenarios.test.ts`)
- Development environment configuration
- Production environment scaling
- Multi-region deployment support
- Instance type variations

## Running Tests

### All Tests
```bash
npm test
```

### With Coverage
```bash
npm run test:coverage
```

### Specific Test Suites
```bash
npm run test:security      # Security tests only
npm run test:integration   # Integration tests only
npm run test:lambda        # Lambda tests only
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### CI Mode
```bash
npm run test:ci
```

## Test Utilities

The `test-utils.ts` file provides helper functions:
- `createTestStack()` - Creates test stack instances
- `findResourcesByType()` - Finds resources by AWS type
- `countResourcesOfType()` - Counts resources of specific type
- `hasEnvironmentVariable()` - Checks Lambda environment variables
- `validateSecurityGroup()` - Validates security group configurations
- `TEST_CONSTANTS` - Shared test constants

## GitHub Actions Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Changes to files in the `cdk/` directory

The workflow includes:
- Dependency installation
- TypeScript compilation
- Unit test execution
- Security test validation
- Integration test verification
- CDK synthesis validation
- Coverage reporting

## Debugging Tests

To debug failing tests:

1. Run tests in verbose mode: `npm test -- --verbose`
2. Check the generated CloudFormation template: `npm run synth`
3. Use `template.toJSON()` to inspect the full template

## Dependencies

- **Jest**: Test framework
- **ts-jest**: TypeScript support for Jest
- **AWS CDK Assertions**: CDK-specific test assertions
- **AWS CDK**: Infrastructure as code framework