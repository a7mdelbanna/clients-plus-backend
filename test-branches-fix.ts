import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function testBranchesEndpoint() {
  try {
    console.log('Testing branches endpoint with updated validation...\n');
    
    // First register a new user to get auth token
    const timestamp = Date.now();
    const testUser = {
      email: `test${timestamp}@example.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
      companyName: `Test Company ${timestamp}`,
    };
    
    console.log('1. Registering user to get auth token...');
    const registerResponse = await axios.post(`${API_URL}/auth/register-with-company`, testUser);
    const { accessToken } = registerResponse.data.data.tokens;
    console.log('   ✅ Registration successful');
    
    // Test saving branches - this is what the frontend sends
    console.log('\n2. Testing save branches (updating existing default branch)...');
    const branchesData = {
      branches: [
        {
          name: 'Main Branch',
          address: 'Downtown Cairo',  // String format, as sent by frontend
          phone: '+201234567890',
          isMain: true
        }
      ]
    };
    
    try {
      const branchesResponse = await axios.post(
        `${API_URL}/setup/branches`,
        branchesData,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      if (branchesResponse.data.success) {
        console.log('   ✅ Branches saved successfully!');
        console.log('   Response:', branchesResponse.data.message);
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.error('   ❌ Validation failed:', error.response.data?.message);
        if (error.response.data?.errors) {
          console.error('   Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
        }
      } else {
        throw error;
      }
    }
    
    // Test with multiple branches
    console.log('\n3. Testing with multiple branches...');
    const multipleBranchesData = {
      branches: [
        {
          name: 'Main Branch Updated',
          address: 'Downtown Cairo',
          phone: '+201234567890',
          isMain: true
        },
        {
          name: 'Second Branch',
          address: 'New Cairo',
          phone: '+201234567891',
          isMain: false
        }
      ]
    };
    
    try {
      const multipleBranchesResponse = await axios.post(
        `${API_URL}/setup/branches`,
        multipleBranchesData,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      if (multipleBranchesResponse.data.success) {
        console.log('   ✅ Multiple branches saved successfully!');
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log('   ℹ️  Branch limit reached (expected for trial plan)');
      } else if (error.response?.status === 400) {
        console.error('   ❌ Validation failed:', error.response.data?.message);
        if (error.response.data?.errors) {
          console.error('   Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
        }
      } else {
        throw error;
      }
    }
    
    console.log('\n✅ Branches endpoint test completed!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message || error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testBranchesEndpoint();