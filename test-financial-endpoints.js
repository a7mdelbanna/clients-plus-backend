const axios = require('axios');

const baseURL = 'http://localhost:3002/api/v1';
let authToken = '';

// Test authentication first
async function authenticate() {
  try {
    // Login with a test user - using our created test user
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'finance-test@example.com',
      password: 'testpass123'
    });
    
    authToken = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.log('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

// Test financial endpoints
async function testFinancialEndpoints() {
  const headers = {
    Authorization: `Bearer ${authToken}`
  };

  console.log('\n--- Testing Financial Endpoints ---');

  try {
    // 1. Test getting financial summary
    console.log('\n1. Testing financial summary...');
    const summaryResponse = await axios.get(`${baseURL}/finance/summary`, { headers });
    console.log('✅ Financial summary:', summaryResponse.data);

    // 2. Test getting accounts
    console.log('\n2. Testing get accounts...');
    const accountsResponse = await axios.get(`${baseURL}/finance/accounts`, { headers });
    console.log('✅ Accounts retrieved:', accountsResponse.data.data?.accounts?.length || 0, 'accounts');

    // 3. Test creating an account
    console.log('\n3. Testing create account...');
    const createAccountResponse = await axios.post(`${baseURL}/finance/accounts`, {
      name: 'Test Cash Account',
      accountType: 'CASH',
      initialBalance: 1000,
      currency: 'EGP',
      isDefault: true,
      description: 'Test cash account for financial system'
    }, { headers });
    console.log('✅ Account created:', createAccountResponse.data.data.name);

    const accountId = createAccountResponse.data.data.id;

    // 4. Test getting account balance
    console.log('\n4. Testing get account balance...');
    const balanceResponse = await axios.get(`${baseURL}/finance/accounts/${accountId}/balance`, { headers });
    console.log('✅ Account balance:', balanceResponse.data.data);

    // 5. Test creating a transaction
    console.log('\n5. Testing create transaction...');
    const createTransactionResponse = await axios.post(`${baseURL}/finance/transactions`, {
      accountId: accountId,
      type: 'INCOME',
      category: 'Sales',
      amount: 500,
      description: 'Test income transaction',
      reference: 'TEST-001'
    }, { headers });
    console.log('✅ Transaction created:', createTransactionResponse.data.data.description);

    // 6. Test getting transactions
    console.log('\n6. Testing get transactions...');
    const transactionsResponse = await axios.get(`${baseURL}/finance/transactions`, { headers });
    console.log('✅ Transactions retrieved:', transactionsResponse.data.data?.transactions?.length || 0, 'transactions');

    // 7. Test getting expense categories
    console.log('\n7. Testing get expense categories...');
    const categoriesResponse = await axios.get(`${baseURL}/finance/expense-categories`, { headers });
    console.log('✅ Expense categories retrieved:', categoriesResponse.data.data?.length || 0, 'categories');

    // 8. Test creating expense category (or use existing)
    console.log('\n8. Testing create/get expense category...');
    let categoryId;
    try {
      const createCategoryResponse = await axios.post(`${baseURL}/finance/expense-categories`, {
        name: 'Office Supplies Test',
        description: 'Office supplies and equipment test category',
        code: 'OFFICE_TEST',
        requiresApproval: false
      }, { headers });
      console.log('✅ Expense category created:', createCategoryResponse.data.data.name);
      categoryId = createCategoryResponse.data.data.id;
    } catch (error) {
      // If creation fails, use the first existing category
      const existingCategories = await axios.get(`${baseURL}/finance/expense-categories`, { headers });
      if (existingCategories.data.data.length > 0) {
        categoryId = existingCategories.data.data[0].id;
        console.log('✅ Using existing expense category:', existingCategories.data.data[0].name);
      } else {
        throw error;
      }
    }

    // 9. Test creating expense
    console.log('\n9. Testing create expense...');
    const createExpenseResponse = await axios.post(`${baseURL}/finance/expenses`, {
      title: 'Office Supplies Purchase',
      description: 'Purchased pens, papers, and folders',
      amount: 150,
      expenseDate: new Date().toISOString(),
      vendorName: 'Office Depot',
      categoryId: categoryId
    }, { headers });
    console.log('✅ Expense created:', createExpenseResponse.data.data.title);

    // 10. Test getting expenses
    console.log('\n10. Testing get expenses...');
    const expensesResponse = await axios.get(`${baseURL}/finance/expenses`, { headers });
    console.log('✅ Expenses retrieved:', expensesResponse.data.data?.expenses?.length || 0, 'expenses');

    console.log('\n🎉 All financial endpoint tests passed!');
    return true;

  } catch (error) {
    console.log('❌ Financial endpoint test failed:', error.response?.data || error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('Starting Financial Management API Tests...\n');

  // First authenticate
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('Skipping financial tests due to authentication failure');
    return;
  }

  // Then test financial endpoints
  await testFinancialEndpoints();
}

// Run the tests
runTests().catch(console.error);