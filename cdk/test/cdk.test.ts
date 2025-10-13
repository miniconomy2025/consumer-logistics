import { createTestStack } from './test-utils';
import { Match } from 'aws-cdk-lib/assertions';

describe('Consumer Logistics CDK Stack', () => {
  let template: any;

  beforeAll(() => {
    template = createTestStack();
  });

  describe('S3 Buckets', () => {
    test('creates frontend bucket with correct configuration', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'consumer-logistics-bucket',
        WebsiteConfiguration: {
          IndexDocument: 'index.html',
          ErrorDocument: 'index.html'
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true
        }
      });
    });

    test('creates certificate buckets with encryption', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'consumer-logistics-cert-rootca',
        VersioningConfiguration: { Status: 'Enabled' },
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [{
            ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' }
          }]
        }
      });
    });
  });

  describe('SQS Queues', () => {
    test('creates payment queue with DLQ', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        KmsMasterKeyId: 'alias/aws/sqs',
        MessageRetentionPeriod: 86400,
        RedrivePolicy: {
          deadLetterTargetArn: Match.anyValue(),
          maxReceiveCount: 3
        }
      });
    });

    test('creates pickup and delivery queues', () => {
      template.resourceCountIs('AWS::SQS::Queue', 8); // 4 main queues + 4 DLQs
    });

    test('creates DLQ with correct retention', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        KmsMasterKeyId: 'alias/aws/sqs',
        MessageRetentionPeriod: 604800 // 7 days
      });
    });
  });

  describe('RDS Database', () => {
    test('creates PostgreSQL database', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        Engine: 'postgres',
        EngineVersion: Match.stringLikeRegexp('^16'),
        DBInstanceClass: 'db.t3.micro',
        AllocatedStorage: '20',
        MaxAllocatedStorage: 40,
        PubliclyAccessible: true,
        DBName: 'customerLogisticsDB'
      });
    });

    test('creates database security group', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for RDS instance',
        SecurityGroupIngress: [
          {
            IpProtocol: 'tcp',
            FromPort: 5432,
            ToPort: 5432,
            CidrIp: '0.0.0.0/0'
          }
        ]
      });
    });
  });

  describe('Lambda Functions', () => {
    test('creates payment webhook lambda', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs22.x',
        Handler: 'index.lambdaHandler',
        Timeout: 30,
        Environment: {
          Variables: {
            REGION: 'us-east-1',
            PAYMENT_PROCESSING_QUEUE_URL: Match.anyValue(),
            DB_HOST: Match.anyValue(),
            DB_PORT: Match.anyValue(),
            DB_NAME: 'customerLogisticsDB'
          }
        }
      });
    });

    test('creates process payment lambda', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs22.x',
        Handler: 'index.lambdaHandler',
        Timeout: 30,
        MemorySize: 128,
        Environment: {
          Variables: {
            PICKUP_QUEUE_URL: Match.anyValue(),
            DB_HOST: Match.anyValue()
          }
        }
      });
    });

    test('creates SQS event source mapping', () => {
      template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        BatchSize: 10,
        MaximumBatchingWindowInSeconds: 30,
        FunctionResponseTypes: ['ReportBatchItemFailures']
      });
    });
  });

  describe('IAM Roles and Policies', () => {
    test('creates Elastic Beanstalk instance role', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'consumer-logistics-application-role'
      });
    });

    test('grants SQS permissions to EB role', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([{
            Effect: 'Allow',
            Action: [
              'sqs:ReceiveMessage',
              'sqs:DeleteMessage',
              'sqs:GetQueueAttributes',
              'sqs:ChangeMessageVisibility',
              'sqs:SendMessage'
            ],
            Resource: Match.anyValue()
          }])
        }
      });
    });
  });

  describe('Elastic Beanstalk', () => {
    test('creates application', () => {
      template.hasResourceProperties('AWS::ElasticBeanstalk::Application', {
        ApplicationName: 'consumer-logistics-api'
      });
    });

    test('creates environment with correct configuration', () => {
      template.hasResourceProperties('AWS::ElasticBeanstalk::Environment', {
        EnvironmentName: 'consumer-logistics-env',
        SolutionStackName: '64bit Amazon Linux 2023 v6.5.1 running Node.js 22',
        OptionSettings: Match.arrayWith([
          {
            Namespace: 'aws:autoscaling:launchconfiguration',
            OptionName: 'InstanceType',
            Value: 't3.micro'
          },
          {
            Namespace: 'aws:elasticbeanstalk:application:environment',
            OptionName: 'NODE_ENV',
            Value: 'production'
          }
        ])
      });
    });
  });

  describe('API Gateway', () => {
    test('creates HTTP API', () => {
      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        Name: 'ConsumerLogisticsAPI',
        Description: 'API for Consumer Logistics',
        ProtocolType: 'HTTP'
      });
    });

    test('creates payment webhook route', () => {
      template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        RouteKey: 'POST /api/webhook/payment-updates'
      });
    });

    test('creates proxy route for EB app', () => {
      template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        RouteKey: 'ANY /{proxy+}'
      });
    });
  });

  describe('CloudFront Distribution', () => {
    test('creates distribution with S3 origin', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultRootObject: 'index.html',
          DefaultCacheBehavior: {
            ViewerProtocolPolicy: 'redirect-to-https',
            CachePolicyId: Match.anyValue()
          },
          CustomErrorResponses: [
            {
              ErrorCode: 403,
              ResponseCode: 200,
              ResponsePagePath: '/index.html'
            },
            {
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html'
            }
          ]
        }
      });
    });
  });

  describe('Resource Counts', () => {
    test('has expected number of resources', () => {
      template.resourceCountIs('AWS::S3::Bucket', 4);
      template.resourceCountIs('AWS::Lambda::Function', 3);
      template.resourceCountIs('AWS::RDS::DBInstance', 1);
      template.resourceCountIs('AWS::ElasticBeanstalk::Application', 1);
      template.resourceCountIs('AWS::ElasticBeanstalk::Environment', 1);
      template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });
  });
});
