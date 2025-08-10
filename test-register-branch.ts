import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function testRegisterWithBranch() {
  try {
    console.log('Testing registration with auto-created branch...\n');
    
    // Generate a unique email for testing
    const timestamp = Date.now();
    const testUser = {
      email: `test${timestamp}@example.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
      companyName: `Test Company ${timestamp}`,
    };
    
    console.log('1. Registering new user with company...');
    console.log('   Email:', testUser.email);
    console.log('   Company:', testUser.companyName);
    
    // Register the user
    const registerResponse = await axios.post(`${API_URL}/auth/register-with-company`, testUser);
    
    console.log('\n✅ Registration successful!');
    console.log('   User ID:', registerResponse.data.data.user.id);
    console.log('   Company ID:', registerResponse.data.data.user.companyId);
    
    const { accessToken } = registerResponse.data.data.tokens;
    const companyId = registerResponse.data.data.user.companyId;
    
    // Now check if branches were created
    console.log('\n2. Checking for auto-created branches...');
    
    const branchesResponse = await axios.get(`${API_URL}/${companyId}/branches`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    // Log the full response for debugging
    console.log('\n   Branch API Response:', JSON.stringify(branchesResponse.data, null, 2));
    
    const branches = branchesResponse.data.data || [];
    
    if (branches.length > 0) {
      console.log('\n✅ Default branch auto-created successfully!');
      console.log('   Total branches:', branches.length);
      branches.forEach((branch: any, index: number) => {
        console.log(`\n   Branch ${index + 1}:`);
        console.log(`     ID: ${branch.id}`);
        console.log(`     Name: ${branch.name}`);
        console.log(`     Type: ${branch.type}`);
        console.log(`     Status: ${branch.status}`);
        console.log(`     Is Main: ${branch.isMain}`);
      });
    } else {
      console.log('\n❌ No branches found! Auto-creation may have failed.');
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message || error.response.data);
      if (error.response.data?.errors) {
        console.error('   Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
      }
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testRegisterWithBranch();