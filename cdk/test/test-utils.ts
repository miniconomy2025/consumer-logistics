import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkStack } from '../lib/cdk-stack';

export interface TestStackProps {
  deployRegion?: string;
  instanceType?: string;
  minInstances?: number;
  maxInstances?: number;
}

export function createTestStack(id: string = 'TestStack', props?: TestStackProps): Template {
  const app = new cdk.App();
  const stack = new CdkStack(app, id, {
    deployRegion: props?.deployRegion || 'us-east-1',
    instanceType: props?.instanceType || 't3.micro',
    minInstances: props?.minInstances || 1,
    maxInstances: props?.maxInstances || 2,
    env: {
      account: '123456789012',
      region: props?.deployRegion || 'us-east-1'
    }
  });
  return Template.fromStack(stack);
}

export function findResourcesByType(template: Template, resourceType: string) {
  return template.findResources(resourceType);
}

export function countResourcesOfType(template: Template, resourceType: string): number {
  return Object.keys(template.findResources(resourceType)).length;
}

export function hasEnvironmentVariable(
  template: Template, 
  functionName: string, 
  envVar: string
): boolean {
  const lambdas = template.findResources('AWS::Lambda::Function');
  const targetLambda = Object.values(lambdas).find(lambda => 
    lambda.Properties?.Environment?.Variables?.[envVar]
  );
  return !!targetLambda;
}

export function validateSecurityGroup(
  template: Template,
  description: string,
  expectedPorts: number[]
): boolean {
  const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
  const targetSG = Object.values(securityGroups).find(sg => 
    sg.Properties?.GroupDescription === description
  );
  
  if (!targetSG) return false;
  
  const ingressRules = targetSG.Properties?.SecurityGroupIngress || [];
  const actualPorts = ingressRules.map((rule: any) => rule.FromPort);
  
  return expectedPorts.every(port => actualPorts.includes(port));
}

export const TEST_CONSTANTS = {
  REGIONS: {
    US_EAST_1: 'us-east-1',
    US_WEST_2: 'us-west-2'
  },
  INSTANCE_TYPES: {
    MICRO: 't3.micro',
    SMALL: 't3.small'
  },
  DATABASE: {
    NAME: 'customerLogisticsDB',
    ENGINE: 'postgres',
    PORT: 5432
  },
  QUEUES: {
    MAX_RECEIVE_COUNT: 3,
    VISIBILITY_TIMEOUT: 60,
    DLQ_RETENTION_DAYS: 7,
    MAIN_RETENTION_DAYS: 1
  }
};