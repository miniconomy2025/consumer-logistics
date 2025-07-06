#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';

const app = new cdk.App();
new CdkStack(app, 'ConsumerLogisticsStack', {
  instanceType: 't3.micro',
  minInstances: 1,
  maxInstances: 1,
  deployRegion: process.env.CDK_DEPLOY_REGION || 'af-south-1',
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION 
  }
});