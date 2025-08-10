const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_TOKEN = 'your-test-token'; // You'll need to get a valid JWT token

// Axios instance with default headers
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_TOKEN}` // Replace with actual token
  }
});

async function testInventoryEndpoints() {
  console.log('🧪 Testing Inventory Management API Endpoints...\n');

  try {
    // Test 1: Create Product Category
    console.log('1️⃣ Testing Product Categories...');
    
    try {
      const categoryResponse = await api.post('/product-categories', {
        name: 'Electronics',
        nameAr: 'إلكترونيات',
        description: 'Electronic devices and accessories',
        color: '#007bff',
        active: true
      });
      console.log('✅ Product category created:', categoryResponse.data.data.name);
      
      const categoryId = categoryResponse.data.data.id;
      
      // Test 2: Create Product
      console.log('\n2️⃣ Testing Products...');
      
      const productResponse = await api.post('/products', {
        name: 'iPhone 15',
        description: 'Latest iPhone model',
        sku: 'IPH15-001',
        barcode: '123456789012',
        categoryId: categoryId,
        price: 999.99,
        cost: 750.00,
        taxRate: 0.14,
        trackInventory: true,
        stock: 0,
        lowStockThreshold: 5,
        active: true
      });
      console.log('✅ Product created:', productResponse.data.data.name);
      
      const productId = productResponse.data.data.id;
      
      // Test 3: Get inventory levels (should be empty initially)
      console.log('\n3️⃣ Testing Inventory Levels...');
      
      const levelsResponse = await api.get('/inventory/levels');
      console.log('✅ Inventory levels retrieved:', levelsResponse.data.data.length, 'items');
      
      // Test 4: Add stock
      console.log('\n4️⃣ Testing Stock Operations...');
      
      // First we need to get branch ID - let's assume we have one
      // For now, we'll skip this test as it requires branch setup
      console.log('⏭️ Skipping stock operations (requires branch setup)');
      
      // Test 5: Search by barcode
      console.log('\n5️⃣ Testing Barcode Search...');
      
      const barcodeResponse = await api.get('/products/barcode/123456789012');
      console.log('✅ Product found by barcode:', barcodeResponse.data.data.name);
      
      // Test 6: Get product statistics
      console.log('\n6️⃣ Testing Product Statistics...');
      
      const statsResponse = await api.get('/products/stats/overview');
      console.log('✅ Product statistics:', {
        total: statsResponse.data.data.totalProducts,
        active: statsResponse.data.data.activeProducts,
        categories: statsResponse.data.data.categoriesCount
      });
      
      // Test 7: Get category statistics
      console.log('\n7️⃣ Testing Category Statistics...');
      
      const categoryStatsResponse = await api.get('/product-categories/stats/overview');
      console.log('✅ Category statistics:', {
        total: categoryStatsResponse.data.data.totalCategories,
        active: categoryStatsResponse.data.data.activeCategories
      });
      
      console.log('\n🎉 All available tests passed successfully!');
      console.log('\nℹ️  Note: Stock operation tests skipped as they require branch setup.');
      console.log('ℹ️  Set up branches and update the test script to test inventory movements.');
      
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Authentication failed. Please update TEST_TOKEN with a valid JWT token.');
        console.log('ℹ️  To get a token:');
        console.log('   1. Create a user account through the registration endpoint');
        console.log('   2. Login to get a JWT token');
        console.log('   3. Update TEST_TOKEN in this script');
      } else {
        console.error('❌ Test failed:', error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Test if server is running
async function testServerHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/../../`); // Root endpoint
    console.log('✅ Server is running:', response.data.message);
    return true;
  } catch (error) {
    console.log('❌ Server is not accessible:', error.message);
    console.log('ℹ️  Make sure the server is running on http://localhost:3001');
    return false;
  }
}

// Test API documentation
async function testSwaggerDocs() {
  try {
    const response = await axios.get('http://localhost:3001/api-docs');
    console.log('✅ Swagger documentation is accessible');
  } catch (error) {
    console.log('⚠️  Swagger documentation not accessible');
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Inventory API Tests...\n');
  
  const serverRunning = await testServerHealth();
  if (!serverRunning) {
    return;
  }
  
  await testSwaggerDocs();
  console.log();
  
  if (TEST_TOKEN === 'your-test-token') {
    console.log('⚠️  Please update TEST_TOKEN with a valid JWT token to run full tests.');
    console.log('ℹ️  Visit http://localhost:3001/api-docs to see the API documentation.');
    console.log('ℹ️  Use the auth endpoints to get a valid token.\n');
  } else {
    await testInventoryEndpoints();
  }
}

main().catch(console.error);