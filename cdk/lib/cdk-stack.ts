import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Vpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';

interface ExtendedStackProps extends cdk.StackProps {
  deployRegion: string;
  instanceType: string;
  minInstances: number;
  maxInstances: number;
}

/**
 * SQS Queue max number of times a 
 * single message can be requeued before
 * getting sent to the DLQ
 */
const MAX_RECEIVE_COUNT = 3;

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ExtendedStackProps) {
    super(scope, id, props);

    // -====== VPC ======-
    const defaultVpc = Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });


    // -====== S3 ======-
    const bucketName = `consumer-logistics-bucket`;
    const frontendBucket = new s3.Bucket(this, bucketName, {
      bucketName: bucketName,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      accessControl: s3.BucketAccessControl.PRIVATE,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // -====== CloudFront ======-
    const distribution = new cloudfront.Distribution(this, 'security-levelup-team4-distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket, {
          originAccessLevels: [cloudfront.AccessLevel.READ],
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // -====== Security Group ======-
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: defaultVpc,
      description: 'Security group for RDS instance',
      allowAllOutbound: true,
    });

    const ebSecurityGroup = new ec2.SecurityGroup(this, 'EBSecurityGroup', {
      vpc: defaultVpc,
      description: 'Security group for Elastic Beanstalk instances',
      allowAllOutbound: true,
    });

    dbSecurityGroup.addIngressRule(
      ebSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Elastic Beanstalk to connect to PostgreSQL'
    );

    // -====== RDS ======-
    const databaseName = 'customerLogisticsDB';
    const database = new rds.DatabaseInstance(this, databaseName, {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: defaultVpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      securityGroups: [dbSecurityGroup],
      publiclyAccessible: true,
      databaseName: databaseName,
      allocatedStorage: 20,
      maxAllocatedStorage: 40,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    // -====== SQS ======-
    const paymentQueueDLQ = new sqs.Queue(this, 'DeliveryQueueDLQ', {
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      retentionPeriod: cdk.Duration.days(7),
    });

    const paymentQueue = new sqs.Queue(this, 'DeliveryQueue', {
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        queue: paymentQueueDLQ,
        maxReceiveCount: MAX_RECEIVE_COUNT,
      },
      visibilityTimeout: cdk.Duration.seconds(60),
    });

    // -===== Lambda =====-
    const handlePopLambda = new NodejsFunction(this, 'HandlePopLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'src/lambdas/payment-webhook.ts',
      handler: 'lambdaHandler',
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
      vpc: defaultVpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      securityGroups: [dbSecurityGroup],
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      environment: {
        REGION: props.deployRegion,
        PAYMENT_PROCESSING_QUEUE_URL: paymentQueue.queueUrl,
      },
    });

    const processPayment = new NodejsFunction(this, 'ProcessPaymentLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'src/lambdas/process-payment.ts',
      handler: 'lambdaHandler',
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
      vpc: defaultVpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      securityGroups: [dbSecurityGroup],
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      environment: {
        REGION: props.deployRegion
      },
    });

    // -=== SQS Event Source ===-
    processPayment.addEventSource(new cdk.aws_lambda_event_sources.SqsEventSource(paymentQueue, {
      batchSize: 10,
      maxBatchingWindow: cdk.Duration.seconds(30),
      reportBatchItemFailures: true,
    }));

    // -=== Elastic Beanstalk ===-
    const roleName = 'consumer-logistics-application-role';
    const ebInstanceRole = new iam.Role(this, roleName, {
      roleName: roleName,
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    ebInstanceRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier')
    );

    ebInstanceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'rds-db:connect',
        'rds:DescribeDBInstances',
      ],
      resources: [database.instanceArn],
    }));

    const instanceProfile = new iam.CfnInstanceProfile(this, 'InstanceProfile', {
      roles: [ebInstanceRole.roleName],
    });

    const ebServiceRole = new iam.Role(this, 'ElasticBeanstalkServiceRole', {
      roleName: 'aws-elasticbeanstalk-service-role',
      assumedBy: new iam.ServicePrincipal('elasticbeanstalk.amazonaws.com'),
    });

    ebServiceRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy')
    );
    ebServiceRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSElasticBeanstalkEnhancedHealth')
    );

    const app = new elasticbeanstalk.CfnApplication(this, 'Application', {
      applicationName: 'consumer-logistics-api',
    });

    const environment = new elasticbeanstalk.CfnEnvironment(this, 'Environment', {
      environmentName: 'consumer-logistics-env',
      applicationName: app.applicationName || 'consumer-logistics-api',
      solutionStackName: '64bit Amazon Linux 2023 v6.5.1 running Node.js 22',
      optionSettings: [
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'IamInstanceProfile',
          value: instanceProfile.attrArn,
        },
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'InstanceType',
          value: props.instanceType,
        },
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'SecurityGroups',
          value: ebSecurityGroup.securityGroupId,
        },
        {
          namespace: 'aws:autoscaling:asg',
          optionName: 'MinSize',
          value: props.minInstances.toString(),
        },
        {
          namespace: 'aws:autoscaling:asg',
          optionName: 'MaxSize',
          value: props.maxInstances.toString(),
        },
        {
          namespace: 'aws:elasticbeanstalk:environment',
          optionName: 'EnvironmentType',
          value: 'SingleInstance',
        },
        {
          namespace: 'aws:elasticbeanstalk:environment',
          optionName: 'ServiceRole',
          value: 'aws-elasticbeanstalk-service-role',
        },
        {
          namespace: 'aws:elasticbeanstalk:environment:process:default',
          optionName: 'HealthCheckPath',
          value: '/health',
        },
        {
          namespace: 'aws:elasticbeanstalk:application:environment',
          optionName: 'NODE_ENV',
          value: 'production',
        },
        {
          namespace: 'aws:elasticbeanstalk:application:environment',
          optionName: 'DB_HOST',
          value: database.instanceEndpoint.hostname,
        },
        {
          namespace: 'aws:elasticbeanstalk:application:environment',
          optionName: 'DB_PORT',
          value: '5432',
        },
        {
          namespace: 'aws:elasticbeanstalk:application:environment',
          optionName: 'DB_NAME',
          value: databaseName,
        },
        {
          namespace: 'aws:elasticbeanstalk:application:environment',        
          optionName: 'DB_USERNAME',        
          value: database.secret?.secretValueFromJson('username').unsafeUnwrap() || '',        
        },        
        {
          namespace: 'aws:elasticbeanstalk:application:environment',        
          optionName: 'DB_PASSWORD',        
          value: database.secret?.secretValueFromJson('password').unsafeUnwrap() || '',        
        },
        {
          namespace: 'aws:ec2:vpc',
          optionName: 'VPCId',
          value: defaultVpc.vpcId,
        },
        {
          namespace: 'aws:ec2:vpc',
          optionName: 'Subnets',
          value: defaultVpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
        },
        {
          namespace: 'aws:ec2:vpc',
          optionName: 'ELBSubnets',
          value: defaultVpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
        },
      ],
    });

    // -=== API Gateway ===-
    const api = new apigatewayv2.HttpApi(this, 'ConsumerLogisticsAPI', {
      apiName: 'ConsumerLogisticsAPI',
      description: 'API for Consumer Logistics',
      createDefaultStage: true,
    });

    // POST /payment/webhook
    api.addRoutes({
      path: '/payment/webhook',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('PaymentWebhookIntegration', handlePopLambda),
    });

    // Elastic Beanstalk Application URL
    const ebAppUrl = `http://${environment.attrEndpointUrl}`;

    api.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: new integrations.HttpUrlIntegration('EBAppIntegration', ebAppUrl),
    })

  }
}
