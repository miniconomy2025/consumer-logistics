import { createTestStack, TEST_CONSTANTS } from './test-utils';

describe('Deployment Scenarios', () => {
  describe('Development Environment', () => {
    test('creates resources for dev', () => {
      const template = createTestStack('DevStack', {
        deployRegion: TEST_CONSTANTS.REGIONS.US_EAST_1,
        instanceType: TEST_CONSTANTS.INSTANCE_TYPES.MICRO,
        minInstances: 1,
        maxInstances: 1
      });

      template.hasResourceProperties('AWS::ElasticBeanstalk::Environment', {
        ApplicationName: 'consumer-logistics-api'
      });
    });
  });

  describe('Production Environment', () => {
    test('creates resources for production', () => {
      const template = createTestStack('ProdStack', {
        deployRegion: TEST_CONSTANTS.REGIONS.US_WEST_2,
        instanceType: TEST_CONSTANTS.INSTANCE_TYPES.SMALL,
        minInstances: 2,
        maxInstances: 10
      });

      template.hasResourceProperties('AWS::ElasticBeanstalk::Environment', {
        ApplicationName: 'consumer-logistics-api'
      });
    });
  });

  describe('Multi-Region Deployment', () => {
    test('supports different regions', () => {
      const usEastTemplate = createTestStack('USEastStack', {
        deployRegion: TEST_CONSTANTS.REGIONS.US_EAST_1
      });

      const usWestTemplate = createTestStack('USWestStack', {
        deployRegion: TEST_CONSTANTS.REGIONS.US_WEST_2
      });

      // Both should have the same resource structure
      expect(Object.keys(usEastTemplate.findResources('AWS::Lambda::Function')).length)
        .toBe(Object.keys(usWestTemplate.findResources('AWS::Lambda::Function')).length);
    });
  });

  describe('Resource Scaling', () => {
    test('validates different configurations', () => {
      const microTemplate = createTestStack('MicroStack', {
        instanceType: TEST_CONSTANTS.INSTANCE_TYPES.MICRO
      });

      const smallTemplate = createTestStack('SmallStack', {
        instanceType: TEST_CONSTANTS.INSTANCE_TYPES.SMALL
      });

      // Both should create Elastic Beanstalk environments
      microTemplate.hasResourceProperties('AWS::ElasticBeanstalk::Environment', {
        ApplicationName: 'consumer-logistics-api'
      });

      smallTemplate.hasResourceProperties('AWS::ElasticBeanstalk::Environment', {
        ApplicationName: 'consumer-logistics-api'
      });
    });
  });
});