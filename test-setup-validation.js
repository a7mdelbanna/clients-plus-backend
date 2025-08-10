const axios = require('axios');

// Test setup validation fixes
async function testSetupValidation() {
  const baseURL = 'http://localhost:3000/api/v1';
  
  // You'll need to use a real JWT token here
  const token = 'your-jwt-token-here';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('🧪 Testing setup validation fixes...\n');

  // Test 1: Business Info with frontend data structure
  console.log('1. Testing business info validation...');
  try {
    const businessInfoData = {
      businessName: 'نادي الرجال السري', // Arabic text
      businessType: 'barbershop',
      businessCategory: 'beauty',
      description: 'A premium barbershop for men',
      phone: '+201234567890',
      email: 'info@barbershop.com',
      website: 'https://barbershop.com',
      address: '123 Main Street, Cairo, Egypt', // String format
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      languages: ['ar', 'en']
    };

    const response = await axios.post(`${baseURL}/setup/business-info`, businessInfoData, { headers });
    console.log('✅ Business info validation passed!');
  } catch (error) {
    console.log('❌ Business info validation failed:');
    if (error.response?.data?.errors) {
      error.response.data.errors.forEach(err => {
        console.log(`   - ${err.field}: ${err.message}`);
      });
    } else {
      console.log(`   - ${error.message}`);
    }
  }

  // Test 2: Branch validation with string address
  console.log('\n2. Testing branch validation...');
  try {
    const branchData = {
      branches: [
        {
          name: 'Main Branch',
          address: 'Downtown Cairo', // String format
          phone: '+201234567890',
          email: 'main@barbershop.com',
          isMain: true
        }
      ]
    };

    const response = await axios.post(`${baseURL}/setup/branches`, branchData, { headers });
    console.log('✅ Branch validation passed!');
  } catch (error) {
    console.log('❌ Branch validation failed:');
    if (error.response?.data?.errors) {
      error.response.data.errors.forEach(err => {
        console.log(`   - ${err.field}: ${err.message}`);
      });
    } else {
      console.log(`   - ${error.message}`);
    }
  }

  // Test 3: Theme validation with themeId
  console.log('\n3. Testing theme validation...');
  try {
    const themeData = {
      themeId: 'modern-blue', // Frontend sends themeId
      name: 'Modern Blue',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF'
    };

    const response = await axios.post(`${baseURL}/setup/theme`, themeData, { headers });
    console.log('✅ Theme validation passed!');
  } catch (error) {
    console.log('❌ Theme validation failed:');
    if (error.response?.data?.errors) {
      error.response.data.errors.forEach(err => {
        console.log(`   - ${err.field}: ${err.message}`);
      });
    } else {
      console.log(`   - ${error.message}`);
    }
  }

  // Test 4: Team info validation
  console.log('\n4. Testing team info validation...');
  try {
    const teamData = {
      teamSize: '1-5',
      members: [
        {
          name: 'Ahmed Ali',
          email: 'ahmed@barbershop.com',
          role: 'Manager',
          permissions: ['manage_appointments', 'manage_staff']
        }
      ],
      roles: [
        {
          id: 'manager',
          name: 'Manager',
          permissions: ['manage_appointments', 'manage_staff']
        }
      ]
    };

    const response = await axios.post(`${baseURL}/setup/team-info`, teamData, { headers });
    console.log('✅ Team info validation passed!');
  } catch (error) {
    console.log('❌ Team info validation failed:');
    if (error.response?.data?.errors) {
      error.response.data.errors.forEach(err => {
        console.log(`   - ${err.field}: ${err.message}`);
      });
    } else {
      console.log(`   - ${error.message}`);
    }
  }

  console.log('\n🏁 Test complete!');
}

// Check if this is being run directly
if (require.main === module) {
  testSetupValidation().catch(console.error);
} else {
  module.exports = testSetupValidation;
}