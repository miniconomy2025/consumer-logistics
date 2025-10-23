export const environments = {
  dev: {
    baseUrl: 'http://localhost:3000',
    apiKey: 'dev-api-key'
  },
  prod: {
    baseUrl: __ENV.BACKEND_URL || 'https://afroserve.co.za',
    apiKey: __ENV.API_KEY || 'prod-api-key'
  },
  aws: {
    baseUrl: 'http://consumer-logistics-env.eba-phrkba6b.af-south-1.elasticbeanstalk.com',
    apiKey: __ENV.API_KEY || 'aws-api-key'
  }
};

export const getEnvironment = () => {
  const env = __ENV.ENVIRONMENT || 'dev';
  return environments[env];
};