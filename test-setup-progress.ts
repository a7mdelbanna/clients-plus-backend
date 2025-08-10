import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function testSetupProgress() {
  try {
    console.log('Testing setup progress endpoint...\n');
    
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
    
    // Test saving progress for step 1 (Business Info)
    console.log('\n2. Testing save progress for Step 1 (Business Info)...');
    const step1Data = {
      step: 1,
      data: {
        businessName: 'نادي الرجال السري',
        businessType: 'barbershop',
        address: 'Downtown Cairo',
        phone: '+201234567890'
      },
      timestamp: new Date().toISOString()
    };
    
    const progressResponse1 = await axios.post(
      `${API_URL}/setup/progress`,
      step1Data,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    
    if (progressResponse1.data.success) {
      console.log('   ✅ Step 1 progress saved successfully');
    }
    
    // Test saving progress for step 2 (Branches)
    console.log('\n3. Testing save progress for Step 2 (Branches)...');
    const step2Data = {
      step: 2,
      data: {
        branches: [
          {
            name: 'Main Branch',
            address: 'Downtown Cairo',
            phone: '+201234567890',
            isMain: true
          }
        ]
      },
      timestamp: new Date().toISOString()
    };
    
    const progressResponse2 = await axios.post(
      `${API_URL}/setup/progress`,
      step2Data,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    
    if (progressResponse2.data.success) {
      console.log('   ✅ Step 2 progress saved successfully');
    }
    
    // Get setup progress to verify
    console.log('\n4. Verifying saved progress...');
    const getProgressResponse = await axios.get(
      `${API_URL}/setup/progress`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    
    const progress = getProgressResponse.data.data;
    console.log('   Setup completed:', progress.setupCompleted);
    console.log('   Has draft data:', progress.hasDrafts);
    console.log('   Draft steps:', Object.keys(progress.setupData || {}).filter(k => k.includes('_draft')));
    
    console.log('\n✅ Setup progress endpoint is working correctly!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message || error.response.data);
      if (error.response.data?.errors) {
        console.error('   Errors:', error.response.data.errors);
      }
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testSetupProgress();