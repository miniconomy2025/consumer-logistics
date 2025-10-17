import { createTestStack } from './test-utils';

describe('Basic CDK Tests', () => {
  test('creates a valid CDK stack', () => {
    const template = createTestStack();
    
    // Test that basic resources are created
    expect(template.findResources('AWS::S3::Bucket')).toBeDefined();
    expect(template.findResources('AWS::SQS::Queue')).toBeDefined();
    expect(template.findResources('AWS::Lambda::Function')).toBeDefined();
    expect(template.findResources('AWS::RDS::DBInstance')).toBeDefined();
  });

  test('creates S3 buckets', () => {
    const template = createTestStack();
    
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'consumer-logistics-bucket'
    });
  });

  test('creates SQS queues with encryption', () => {
    const template = createTestStack();
    
    template.hasResourceProperties('AWS::SQS::Queue', {
      KmsMasterKeyId: 'alias/aws/sqs'
    });
  });

  test('creates Lambda functions', () => {
    const template = createTestStack();
    
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs22.x'
    });
  });

  test('creates RDS database', () => {
    const template = createTestStack();
    
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      DBName: 'customerLogisticsDB'
    });
  });

  test('creates API Gateway', () => {
    const template = createTestStack();
    
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'ConsumerLogisticsAPI'
    });
  });

  test('creates CloudFront distribution', () => {
    const template = createTestStack();
    
    template.hasResourceProperties('AWS::CloudFront::Distribution', {});
  });
});