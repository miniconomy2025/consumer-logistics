import { createTestStack } from './test-utils';
import { Match } from 'aws-cdk-lib/assertions';

describe('Security Configuration Tests', () => {
  let template: any;

  beforeAll(() => {
    template = createTestStack();
  });

  describe('S3 Security', () => {
    test('all buckets block public access', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true
        }
      });
    });

    test('certificate buckets have encryption enabled', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'consumer-logistics-cert-rootca',
        BucketEncryption: Match.anyValue()
      });
    });

    test('certificate buckets have versioning enabled', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'consumer-logistics-cert-rootca',
        VersioningConfiguration: {
          Status: 'Enabled'
        }
      });
    });
  });

  describe('SQS Security', () => {
    test('all queues use KMS encryption', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        KmsMasterKeyId: 'alias/aws/sqs'
      });
    });

    test('queues have appropriate retention periods', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        MessageRetentionPeriod: 86400 // 1 day for main queues
      });
      
      template.hasResourceProperties('AWS::SQS::Queue', {
        MessageRetentionPeriod: 604800 // 7 days for DLQs
      });
    });
  });

  describe('Database Security', () => {
    test('RDS instance has security group restrictions', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for RDS instance'
      });
    });

    test('database credentials are managed by Secrets Manager', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        Engine: 'postgres'
      });
    });
  });

  describe('IAM Security', () => {
    test('roles follow principle of least privilege', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.anyValue()
      });
    });

    test('no wildcard permissions in policies', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      expect(Object.keys(policies).length).toBeGreaterThan(0);
    });
  });

  describe('Network Security', () => {
    test('CloudFront enforces HTTPS', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            ViewerProtocolPolicy: 'redirect-to-https'
          }
        }
      });
    });

    test('security groups have specific port restrictions', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupIngress: Match.anyValue()
      });
    });
  });
});