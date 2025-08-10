import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function testTeamInfoEndpoint() {
  try {
    console.log('Testing team-info endpoint...\n');
    
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
    
    // Test what the frontend is sending (current implementation)
    console.log('\n2. Testing team-info endpoint with frontend data structure...');
    const frontendData = {
      members: [],
      roles: [
        {
          id: 'admin',
          name: 'Administrator',
          permissions: ['manage_all']
        },
        {
          id: 'staff',
          name: 'Staff Member', 
          permissions: ['view_appointments', 'manage_own_appointments']
        }
      ]
    };
    
    try {
      const response = await axios.post(
        `${API_URL}/setup/team-info`,
        frontendData,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      console.log('   ✅ Team info saved successfully!');
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
    
    // Test with teamSize included
    console.log('\n3. Testing team-info endpoint with teamSize field...');
    const correctData = {
      teamSize: '6-20',  // This is what the backend expects
      members: [],
      roles: [
        {
          id: 'admin',
          name: 'Administrator',
          permissions: ['manage_all']
        },
        {
          id: 'staff',
          name: 'Staff Member', 
          permissions: ['view_appointments', 'manage_own_appointments']
        }
      ]
    };
    
    try {
      const response = await axios.post(
        `${API_URL}/setup/team-info`,
        correctData,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      console.log('   ✅ Team info saved successfully with teamSize!');
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
    
    console.log('\n✅ Test completed!');
    
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
testTeamInfoEndpoint();