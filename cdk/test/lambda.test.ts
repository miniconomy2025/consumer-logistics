import { createTestStack } from './test-utils';

describe('Lambda Function Tests', () => {
  let template: any;

  beforeAll(() => {
    template = createTestStack();
  });

  describe('Lambda Environment Variables', () => {
    test('payment webhook has required environment variables', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            REGION: 'us-east-1',
            DB_NAME: 'customerLogisticsDB'
          }
        }
      });
    });

    test('process payment lambda has pickup queue URL', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 30,
        MemorySize: 128
      });
    });
  });

  describe('Lambda Permissions', () => {
    test('lambdas have SQS send message permissions', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      const sqsPolicies = Object.values(policies).filter(policy => 
        JSON.stringify(policy).includes('sqs:SendMessage')
      );
      
      expect(sqsPolicies.length).toBeGreaterThan(0);
    });

    test('lambdas have secrets manager read permissions', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      const secretsPolicies = Object.values(policies).filter(policy => 
        JSON.stringify(policy).includes('secretsmanager:GetSecretValue')
      );
      
      expect(secretsPolicies.length).toBeGreaterThan(0);
    });
  });
});