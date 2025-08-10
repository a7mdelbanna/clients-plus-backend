import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function testCompleteSetup() {
  try {
    console.log('Testing complete setup wizard flow...\n');
    
    // 1. Register a new user
    const timestamp = Date.now();
    const testUser = {
      email: `test${timestamp}@example.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
      companyName: `Test Company ${timestamp}`,
    };
    
    console.log('1. Registering user...');
    const registerResponse = await axios.post(`${API_URL}/auth/register-with-company`, testUser);
    const { accessToken } = registerResponse.data.data.tokens;
    console.log('   ✅ Registration successful');
    
    const config = { headers: { Authorization: `Bearer ${accessToken}` } };
    
    // 2. Save business info
    console.log('\n2. Saving business info...');
    const businessInfo = {
      businessName: 'Test Business',
      businessType: 'salon',
      businessCategory: 'beauty',
      description: 'Test business description',
      phone: '+1234567890',
      email: 'business@test.com',
      address: 'Test Street, Test City'
    };
    
    await axios.post(`${API_URL}/setup/business-info`, businessInfo, config);
    console.log('   ✅ Business info saved');
    
    // 3. Save branches
    console.log('\n3. Saving branches...');
    const branches = {
      branches: [
        {
          name: 'Main Branch',
          address: 'Downtown Test City',
          phone: '+1234567890',
          isMain: true
        }
      ]
    };
    
    await axios.post(`${API_URL}/setup/branches`, branches, config);
    console.log('   ✅ Branches saved');
    
    // 4. Save team info
    console.log('\n4. Saving team info...');
    const teamInfo = {
      teamSize: '6-20',
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
    
    await axios.post(`${API_URL}/setup/team-info`, teamInfo, config);
    console.log('   ✅ Team info saved');
    
    // 5. Save theme
    console.log('\n5. Saving theme...');
    const theme = { theme: 'modern' };
    
    await axios.post(`${API_URL}/setup/theme`, theme, config);
    console.log('   ✅ Theme saved');
    
    // 6. Complete setup
    console.log('\n6. Completing setup...');
    await axios.post(`${API_URL}/setup/complete`, {}, config);
    console.log('   ✅ Setup completed');
    
    // 7. Check progress
    console.log('\n7. Checking final progress...');
    const progressResponse = await axios.get(`${API_URL}/setup/progress`, config);
    const progress = progressResponse.data.data;
    console.log(`   ✅ Progress: ${progress.percentComplete}% complete`);
    console.log(`   Steps completed: ${JSON.stringify(progress.completedSteps)}`);
    
    console.log('\n✅ All setup steps completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message || error.response.data);
      if (error.response.data?.errors) {
        console.error('   Errors:', JSON.stringify(error.response.data.errors, null, 2));
      }
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testCompleteSetup();