const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:5001';

/**
 * Test script to verify existing functionality still works
 * after implementing validation and security improvements
 */

console.log('🧪 Testing Existing Functionality After Security Updates');
console.log('=' .repeat(60));

// Test data
const testStaff = {
  name: 'Test User',
  grade: 'Senior',
  department: 'Engineering',
  city: 'Dubai',
  country: 'UAE',
  email: 'test@example.com',
  skills: ['JavaScript', 'React']
};

const testProject = {
  name: 'Test Project',
  description: 'A test project',
  partnerName: 'Test Partner',
  teamLead: 'Test Lead',
  budget: 50000
};

async function testStaffEndpoints() {
  console.log('\n📋 Testing Staff Endpoints...');
  
  try {
    // Test GET /api/staff
    console.log('  ✓ Testing GET /api/staff...');
    const staffListResponse = await axios.get(`${API_BASE_URL}/api/staff`);
    console.log(`    - Response status: ${staffListResponse.status}`);
    console.log(`    - Number of staff members: ${staffListResponse.data.length}`);
    
    // Test POST /api/staff with valid data
    console.log('  ✓ Testing POST /api/staff with valid data...');
    const createStaffResponse = await axios.post(`${API_BASE_URL}/api/staff`, testStaff);
    console.log(`    - Response status: ${createStaffResponse.status}`);
    console.log(`    - Created staff ID: ${createStaffResponse.data.id}`);
    const createdStaffId = createStaffResponse.data.id;
    
    // Test PUT /api/staff/:id
    console.log('  ✓ Testing PUT /api/staff/:id...');
    const updatedStaff = { ...testStaff, grade: 'Principal' };
    const updateStaffResponse = await axios.put(`${API_BASE_URL}/api/staff/${createdStaffId}`, updatedStaff);
    console.log(`    - Response status: ${updateStaffResponse.status}`);
    console.log(`    - Updated grade: ${updateStaffResponse.data.grade}`);
    
    // Test DELETE /api/staff/:id
    console.log('  ✓ Testing DELETE /api/staff/:id...');
    const deleteStaffResponse = await axios.delete(`${API_BASE_URL}/api/staff/${createdStaffId}`);
    console.log(`    - Response status: ${deleteStaffResponse.status}`);
    
    console.log('  ✅ All staff endpoints working correctly!');
    
  } catch (error) {
    console.error('  ❌ Staff endpoints test failed:', error.response?.data || error.message);
    return false;
  }
  
  return true;
}

async function testProjectEndpoints() {
  console.log('\n🏗️  Testing Project Endpoints...');
  
  try {
    // Test GET /api/projects
    console.log('  ✓ Testing GET /api/projects...');
    const projectListResponse = await axios.get(`${API_BASE_URL}/api/projects`);
    console.log(`    - Response status: ${projectListResponse.status}`);
    console.log(`    - Number of projects: ${projectListResponse.data.length}`);
    
    // Test POST /api/projects with valid data
    console.log('  ✓ Testing POST /api/projects with valid data...');
    const createProjectResponse = await axios.post(`${API_BASE_URL}/api/projects`, testProject);
    console.log(`    - Response status: ${createProjectResponse.status}`);
    console.log(`    - Created project ID: ${createProjectResponse.data.id}`);
    const createdProjectId = createProjectResponse.data.id;
    
    // Test PUT /api/projects/:id
    console.log('  ✓ Testing PUT /api/projects/:id...');
    const updatedProject = { ...testProject, budget: 75000 };
    const updateProjectResponse = await axios.put(`${API_BASE_URL}/api/projects/${createdProjectId}`, updatedProject);
    console.log(`    - Response status: ${updateProjectResponse.status}`);
    console.log(`    - Updated budget: ${updateProjectResponse.data.budget}`);
    
    // Test DELETE /api/projects/:id
    console.log('  ✓ Testing DELETE /api/projects/:id...');
    const deleteProjectResponse = await axios.delete(`${API_BASE_URL}/api/projects/${createdProjectId}`);
    console.log(`    - Response status: ${deleteProjectResponse.status}`);
    
    console.log('  ✅ All project endpoints working correctly!');
    
  } catch (error) {
    console.error('  ❌ Project endpoints test failed:', error.response?.data || error.message);
    return false;
  }
  
  return true;
}

async function testValidationRejection() {
  console.log('\n🛡️  Testing Validation Rejection...');
  
  try {
    // Test invalid staff data
    console.log('  ✓ Testing invalid staff data rejection...');
    const invalidStaff = {
      name: 'X', // Too short
      grade: '',
      department: '',
      city: '',
      country: '',
      email: 'invalid-email'
    };
    
    try {
      await axios.post(`${API_BASE_URL}/api/staff`, invalidStaff);
      console.log('  ❌ Should have rejected invalid staff data');
      return false;
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('    - ✅ Correctly rejected invalid staff data');
        console.log(`    - Error: ${error.response.data.error}`);
      } else {
        console.log('  ❌ Unexpected error for invalid staff data');
        return false;
      }
    }
    
    // Test invalid project data
    console.log('  ✓ Testing invalid project data rejection...');
    const invalidProject = {
      name: 'A', // Too short
      partnerName: '',
      teamLead: '',
      budget: -1000 // Negative budget
    };
    
    try {
      await axios.post(`${API_BASE_URL}/api/projects`, invalidProject);
      console.log('  ❌ Should have rejected invalid project data');
      return false;
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('    - ✅ Correctly rejected invalid project data');
        console.log(`    - Error: ${error.response.data.error}`);
      } else {
        console.log('  ❌ Unexpected error for invalid project data');
        return false;
      }
    }
    
    console.log('  ✅ Validation working correctly!');
    
  } catch (error) {
    console.error('  ❌ Validation test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testBulkOperations() {
  console.log('\n📦 Testing Bulk Operations...');
  
  try {
    // Test bulk staff import with valid data
    console.log('  ✓ Testing bulk staff import...');
    const bulkStaff = [
      { ...testStaff, name: 'Bulk Test User One' },
      { ...testStaff, name: 'Bulk Test User Two' }
    ];
    
    const bulkStaffResponse = await axios.post(`${API_BASE_URL}/api/staff/bulk`, bulkStaff);
    console.log(`    - Response status: ${bulkStaffResponse.status}`);
    console.log(`    - Created ${bulkStaffResponse.data.length} staff members`);
    
    // Test bulk project import with valid data
    console.log('  ✓ Testing bulk project import...');
    const bulkProjects = [
      { ...testProject, name: 'Bulk Test Project One' },
      { ...testProject, name: 'Bulk Test Project Two' }
    ];
    
    const bulkProjectResponse = await axios.post(`${API_BASE_URL}/api/projects/bulk`, bulkProjects);
    console.log(`    - Response status: ${bulkProjectResponse.status}`);
    console.log(`    - Created ${bulkProjectResponse.data.length} projects`);
    
    console.log('  ✅ Bulk operations working correctly!');
    
  } catch (error) {
    console.error('  ❌ Bulk operations test failed:', error.response?.data || error.message);
    return false;
  }
  
  return true;
}

async function testAssignmentsEndpoint() {
  console.log('\n📅 Testing Assignments Endpoint...');
  
  try {
    // Test GET /api/assignments
    console.log('  ✓ Testing GET /api/assignments...');
    const assignmentsResponse = await axios.get(`${API_BASE_URL}/api/assignments`);
    console.log(`    - Response status: ${assignmentsResponse.status}`);
    console.log(`    - Number of assignments: ${assignmentsResponse.data.length}`);
    
    console.log('  ✅ Assignments endpoint working correctly!');
    
  } catch (error) {
    console.error('  ❌ Assignments test failed:', error.response?.data || error.message);
    return false;
  }
  
  return true;
}

async function runAllTests() {
  console.log('\n🚀 Starting comprehensive functionality tests...\n');
  
  const results = {
    staff: false,
    projects: false,
    validation: false,
    bulk: false,
    assignments: false
  };
  
  // Run all tests
  results.staff = await testStaffEndpoints();
  results.projects = await testProjectEndpoints();
  results.validation = await testValidationRejection();
  results.bulk = await testBulkOperations();
  results.assignments = await testAssignmentsEndpoint();
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(40));
  
  const allPassed = Object.values(results).every(result => result === true);
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${test.charAt(0).toUpperCase() + test.slice(1)}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log('\n' + '=' .repeat(40));
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Existing functionality is preserved.');
    console.log('✅ Your security and validation updates are working correctly.');
  } else {
    console.log('⚠️  SOME TESTS FAILED! Please review the failing tests above.');
    console.log('❌ There may be compatibility issues with your changes.');
  }
  
  return allPassed;
}

// Main execution
if (require.main === module) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests }; 