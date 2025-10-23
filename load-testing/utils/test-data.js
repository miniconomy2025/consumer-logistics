export const testData = {
  companies: [
    {
      company_name: 'Test Company 1',
      bank_account_id: '12345678'
    },
    {
      company_name: 'Test Company 2',
      bank_account_id: '87654321'
    },
    {
      company_name: 'LoadTest Corp',
      bank_account_id: null
    }
  ],

  pickups: [
    {
      companyName: 'Test Company 1',
      quantity: 5,
      recipient: 'John Doe',
      modelName: 'Standard Package'
    },
    {
      companyName: 'Test Company 2',
      quantity: 10,
      recipient: 'Jane Smith',
      modelName: 'Express Package'
    },
    {
      companyName: 'LoadTest Corp',
      quantity: 3,
      recipient: null,
      modelName: null
    }
  ]
};

export const getRandomCompany = () => {
  return testData.companies[Math.floor(Math.random() * testData.companies.length)];
};

export const getRandomPickup = () => {
  return testData.pickups[Math.floor(Math.random() * testData.pickups.length)];
};

export const getRandomCompanyName = () => {
  return testData.companies[Math.floor(Math.random() * testData.companies.length)].company_name;
};