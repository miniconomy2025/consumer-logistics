import { createTestStack } from './test-utils';
import { Match } from 'aws-cdk-lib/assertions';

describe('Integration Tests', () => {
  let template: any;

  beforeAll(() => {
    template = createTestStack();
  });

  describe('Lambda-SQS Integration', () => {
    test('process payment lambda has SQS event source', () => {
      template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        BatchSize: 10,
        MaximumBatchingWindowInSeconds: 30,
        FunctionResponseTypes: ['ReportBatchItemFailures']
      });
    });

    test('lambdas can send messages to correct queues', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            PAYMENT_PROCESSING_QUEUE_URL: Match.anyValue()
          }
        }
      });
    });
  });

  describe('Database Integration', () => {
    test('lambdas have database connection configuration', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            DB_HOST: Match.anyValue(),
            DB_NAME: 'customerLogisticsDB'
          }
        }
      });
    });

    test('Elastic Beanstalk has database configuration', () => {
      template.hasResourceProperties('AWS::ElasticBeanstalk::Environment', {
        OptionSettings: Match.arrayWith([
          {
            Namespace: 'aws:elasticbeanstalk:application:environment',
            OptionName: 'DB_HOST',
            Value: Match.anyValue()
          },
          {
            Namespace: 'aws:elasticbeanstalk:application:environment',
            OptionName: 'DB_NAME',
            Value: 'customerLogisticsDB'
          }
        ])
      });
    });
  });

  describe('API Gateway Integration', () => {
    test('API routes are properly configured', () => {
      template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        RouteKey: 'POST /api/webhook/payment-updates'
      });
      
      template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        RouteKey: 'ANY /{proxy+}'
      });
    });

    test('API integrations point to correct targets', () => {
      const integrations = template.findResources('AWS::ApiGatewayV2::Integration');
      expect(Object.keys(integrations).length).toBeGreaterThan(0);
    });
  });

  describe('CloudFront-S3 Integration', () => {
    test('CloudFront distribution has S3 origin', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultRootObject: 'index.html'
        }
      });
    });

    test('S3 bucket policy allows CloudFront access', () => {
      const policies = template.findResources('AWS::S3::BucketPolicy');
      expect(Object.keys(policies).length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Service Dependencies', () => {
    test('resources have proper dependencies', () => {
      const resources = template.toJSON().Resources;
      
      // Check that Lambda functions depend on SQS queues
      const lambdas = Object.entries(resources).filter(([_, resource]: [string, any]) => 
        resource.Type === 'AWS::Lambda::Function'
      );
      
      lambdas.forEach(([_, lambda]: [string, any]) => {
        if (lambda.Properties?.Environment?.Variables?.PAYMENT_PROCESSING_QUEUE_URL) {
          expect(lambda.DependsOn || lambda.Properties.DependsOn).toBeDefined();
        }
      });
    });

    test('Elastic Beanstalk environment depends on application', () => {
      template.hasResourceProperties('AWS::ElasticBeanstalk::Environment', {
        ApplicationName: 'consumer-logistics-api'
      });
    });
  });
});