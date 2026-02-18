// test-api-full.ts
import axios from 'axios';

const API_URL = 'http://localhost:4000/api/v1';
let authToken: string = '';
let userId: string = '';
let addressId: string = '';
let educationId: string = '';
let experienceId: string = '';
let referenceId: string = '';

// Helper function to log test results
function logTest(name: string, success: boolean, data?: any, error?: any) {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status} - ${name}`);
  if (data) {
    console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
  }
  if (error) {
    console.log('   Error:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests');
  console.log('=====================\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Endpoint...');
    const health = await axios.get(`${API_URL}/health`);
    logTest('Health Check', true, health.data);

    // Test 2: Register a new user
    console.log('\n2️⃣ Testing Registration...');
    const testEmail = `testuser${Date.now()}@example.com`;
    const registerData = {
      first_name: 'John',
      last_name: 'Doe',
      email: testEmail,
      password: 'Password123',
      confirm_password: 'Password123'
    };
    
    const register = await axios.post(`${API_URL}/auth/register`, registerData);
    authToken = register.data.data.token;
    userId = register.data.data.user.id;
    logTest('User Registration', true, register.data);

    // Test 3: Login with the new user
    console.log('\n3️⃣ Testing Login...');
    const login = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: 'Password123'
    });
    logTest('User Login', true, login.data);

    // Test 4: Get current user info
    console.log('\n4️⃣ Testing Get Current User...');
    const me = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('Get Current User', true, me.data);

    // Test 5: Update main profile
    console.log('\n5️⃣ Testing Update Profile...');
    const profile = await axios.patch(
      `${API_URL}/profile`,
      {
        professional_summary: 'Experienced software developer with 5 years of experience',
        field_of_expertise: 'Software Development',
        qualification_level: "Bachelor's Degree",
        years_experience: 5
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    logTest('Update Profile', true, profile.data);

    // Test 6: Add personal details
    console.log('\n6️⃣ Testing Add Personal Details...');
    const personal = await axios.put(
      `${API_URL}/profile/personal-details`,
      {
        first_name: 'John',
        last_name: 'Doe',
        gender: 'Male',
        date_of_birth: '1990-01-01',
        nationality: 'American',
        marital_status: 'Single',
        disability_status: false
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    logTest('Add Personal Details', true, personal.data);

    // Test 7: Add address
    console.log('\n7️⃣ Testing Add Address...');
    const address = await axios.post(
      `${API_URL}/profile/addresses`,
      {
        address_line1: '123 Main Street',
        address_line2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postal_code: '10001',
        is_primary: true
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    addressId = address.data.data.id;
    logTest('Add Address', true, address.data);

    // Test 8: Get all addresses
    console.log('\n8️⃣ Testing Get Addresses...');
    const addresses = await axios.get(`${API_URL}/profile/addresses`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('Get Addresses', true, addresses.data);

    // Test 9: Add education
    console.log('\n9️⃣ Testing Add Education...');
    const education = await axios.post(
      `${API_URL}/profile/education`,
      {
        institution_name: 'University of Technology',
        qualification: 'Bachelor of Science',
        field_of_study: 'Computer Science',
        start_date: '2010-09-01',
        end_date: '2014-06-30',
        is_current: false,
        grade: '3.8 GPA'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    educationId = education.data.data.id;
    logTest('Add Education', true, education.data);

    // Test 10: Get education
    console.log('\n🔟 Testing Get Education...');
    const educations = await axios.get(`${API_URL}/profile/education`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('Get Education', true, educations.data);

    // Test 11: Add experience
    console.log('\n1️⃣1️⃣ Testing Add Experience...');
    const experience = await axios.post(
      `${API_URL}/profile/experience`,
      {
        company_name: 'Tech Solutions Inc',
        job_title: 'Software Developer',
        employment_type: 'Full-time',
        start_date: '2014-07-01',
        end_date: '2019-12-31',
        is_current: false,
        responsibilities: 'Developed and maintained web applications'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    experienceId = experience.data.data.id;
    logTest('Add Experience', true, experience.data);

    // Test 12: Add reference
    console.log('\n1️⃣2️⃣ Testing Add Reference...');
    const reference = await axios.post(
      `${API_URL}/profile/references`,
      {
        full_name: 'Jane Smith',
        relationship: 'Former Manager',
        company: 'Tech Solutions Inc',
        email: 'jane.smith@techsolutions.com',
        phone: '+1234567890'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    referenceId = reference.data.data.id;
    logTest('Add Reference', true, reference.data);

    // Test 13: Get complete profile
    console.log('\n1️⃣3️⃣ Testing Get Complete Profile...');
    const complete = await axios.get(`${API_URL}/profile/complete`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('Get Complete Profile', true, complete.data);

    // Test 14: Update education
    console.log('\n1️⃣4️⃣ Testing Update Education...');
    const updatedEducation = await axios.put(
      `${API_URL}/profile/education/${educationId}`,
      {
        grade: 'First Class Honors',
        certificate_url: 'https://example.com/certificate.pdf'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    logTest('Update Education', true, updatedEducation.data);

    // Test 15: Set primary address
    console.log('\n1️⃣5️⃣ Testing Set Primary Address...');
    const primaryAddress = await axios.patch(
      `${API_URL}/profile/addresses/${addressId}/primary`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    logTest('Set Primary Address', true, primaryAddress.data);

    // Test 16: Delete reference (cleanup)
    console.log('\n1️⃣6️⃣ Testing Delete Reference...');
    await axios.delete(`${API_URL}/profile/references/${referenceId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('Delete Reference', true, { message: 'Reference deleted' });

    console.log('\n🎉🎉🎉 ALL TESTS PASSED! 🎉🎉🎉');
    console.log('================================');
    console.log(`User ID: ${userId}`);
    console.log(`Email: ${testEmail}`);
    console.log(`Token: ${authToken.substring(0, 20)}...`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the tests
runTests();