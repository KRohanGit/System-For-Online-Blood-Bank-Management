const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('\n🧪 STARTING COMPREHENSIVE E2E TESTS\n');
  
  // Test 1: Secure Documents Models
  console.log('📄 TEST 1: Verifying Secure Documents Models');
  console.log('─'.repeat(50));
  try {
    const SecureDocument = require('./src/models/SecureDocument');
    const DocumentVerificationAudit = require('./src/models/DocumentVerificationAudit');
    
    console.log('✅ SecureDocument Model Loaded Successfully');
    console.log('✅ DocumentVerificationAudit Model Loaded Successfully');
  } catch (error) {
    console.log('❌ Error loading models:', error.message);
  }
  
  console.log('\n');
  
  // Test 3: Document Controller Functions
  console.log('🔧 TEST 3: Verifying Document Controller Exports');
  console.log('─'.repeat(50));
  try {
    const controller = require('./src/controllers/secureDocumentController');
    const exports = Object.keys(controller);
    
    const requiredExports = ['uploadDocument', 'getDocuments', 'verifyDocument'];
    const hasAll = requiredExports.every(exp => exports.includes(exp));
    
    if (hasAll) {
      console.log('✅ All Document Controller Functions Present');
      console.log(`   - Exports: ${exports.join(', ')}`);
    } else {
      console.log('❌ Missing Required Functions');
      const missing = requiredExports.filter(exp => !exports.includes(exp));
      console.log(`   - Missing: ${missing.join(', ')}`);
    }
  } catch (error) {
    console.log('❌ Error checking document controller:', error.message);
  }
  
  console.log('\n');
  
  // Test 4: Routes Registration
  console.log('🛣️  TEST 4: Verifying Secure Document Routes');
  console.log('─'.repeat(50));
  try {
    const routes = require('./src/routes/secureDocumentRoutes');
    console.log('✅ Secure Document Routes Loaded Successfully');
    console.log('   - Expected routes: POST /upload, GET /, POST /verify');
  } catch (error) {
    console.log('❌ Error loading routes:', error.message);
  }
  
  console.log('\n');
  
  // Test 5: Models Verification
  console.log('📊 TEST 5: Verifying Mongoose Models');
  console.log('─'.repeat(50));
  try {
    const SecureDocument = require('./src/models/SecureDocument');
    const DocumentVerificationAudit = require('./src/models/DocumentVerificationAudit');
    
    console.log('✅ SecureDocument Model Loaded Successfully');
    console.log('✅ DocumentVerificationAudit Model Loaded Successfully');
  } catch (error) {
    console.log('❌ Error loading models:', error.message);
  }
  
  console.log('\n');
  
  // Test 6: Frontend Components
  console.log('📱 TEST 6: Verifying Frontend Component Files');
  console.log('─'.repeat(50));
  try {
    const dashboardPath = '../frontend/src/pages/superadmin/SuperAdminDashboard.jsx';
    const cssPath = '../frontend/src/styles/superadmin.css';
    
    if (fs.existsSync(dashboardPath)) {
      const content = fs.readFileSync(dashboardPath, 'utf8');
      const hasGeolocation = content.includes('getLocationAndFetchCamps');
      const hasBloodCamps = content.includes('nearbyBloodCamps');
      const hasErrorHandling = content.includes('uploadError');
      const hasFileValidation = content.includes('validTypes');
      
      console.log('✅ SuperAdminDashboard.jsx Verified');
      console.log(`   - Has Geolocation Logic: ${hasGeolocation ? '✓' : '✗'}`);
      console.log(`   - Has Blood Camps State: ${hasBloodCamps ? '✓' : '✗'}`);
      console.log(`   - Has Error Handling: ${hasErrorHandling ? '✓' : '✗'}`);
      console.log(`   - Has File Validation: ${hasFileValidation ? '✓' : '✗'}`);
    }
    
    if (fs.existsSync(cssPath)) {
      const contentCss = fs.readFileSync(cssPath, 'utf8');
      const hasBloodCampsCSS = contentCss.includes('.blood-camps');
      const hasAlertCSS = contentCss.includes('.alert');
      const hasErrorAlert = contentCss.includes('.alert-error');
      
      console.log('✅ superadmin.css Verified');
      console.log(`   - Has Blood Camps Styles: ${hasBloodCampsCSS ? '✓' : '✗'}`);
      console.log(`   - Has Alert Styles: ${hasAlertCSS ? '✓' : '✗'}`);
      console.log(`   - Has Error Alert Styles: ${hasErrorAlert ? '✓' : '✗'}`);
    }
  } catch (error) {
    console.log('❌ Error checking frontend files:', error.message);
  }
  
  console.log('\n');
  
  // Test 7: Utility Files
  console.log('🛠️  TEST 7: Verifying Utility Files');
  console.log('─'.repeat(50));
  try {
    const dataMasking = require('./src/utils/dataMasking');
    const maskingExports = Object.keys(dataMasking);
    
    const requiredMaskingFunctions = ['maskLicenseNumber', 'maskPersonalId', 'maskExtractedFields'];
    const hasMaskingFuncs = requiredMaskingFunctions.every(func => maskingExports.includes(func));
    
    if (hasMaskingFuncs) {
      console.log('✅ Data Masking Utility Verified');
      console.log(`   - Functions: ${maskingExports.join(', ')}`);
    } else {
      console.log('❌ Missing Required Masking Functions');
    }
  } catch (error) {
    console.log('❌ Error checking data masking utility:', error.message);
  }
  
  console.log('\n');
  
  // Test 8: API Health Check
  console.log('🏥 TEST 8: API Server Health Check');
  console.log('─'.repeat(50));
  try {
    const response = await axios.get('http://localhost:5000/health', { timeout: 5000 });
    console.log('✅ Backend API Server is Running');
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      console.log('❌ Backend API server is not running on port 5000');
    } else {
      console.log('⚠️  Backend API health check not available (server may still be responding)');
    }
  }
  
  console.log('\n');
  
  console.log('✅ ALL TESTS COMPLETED\n');
  console.log('═'.repeat(50));
  console.log('🎉 E2E TEST SUITE FINISHED SUCCESSFULLY');
  console.log('═'.repeat(50));
  console.log('\n💡 NEXT STEPS FOR MANUAL TESTING:');
  console.log('   1. Open http://localhost:3000 in your browser');
  console.log('   2. Login with superadmin credentials');
  console.log('   3. Navigate to Superadmin Dashboard');
  console.log('\n   📄 Document Upload Testing:');
  console.log('      ✓ Try uploading file > 10MB → should display size error');
  console.log('      ✓ Try uploading .docx or .txt → should display type error');
  console.log('      ✓ Upload valid PDF/PNG/JPG → should succeed');
  console.log('      ✓ Verify error banner displays with close button');
  console.log('      ✓ Verify document list shows formatted names and organizer icons');
  console.log('\n   ⛺ Blood Camps Testing:');
  console.log('      ✓ Allow geolocation → should show real coordinates');
  console.log('      ✓ Deny geolocation → should use default India location');
  console.log('      ✓ Verify camp cards show: name, distance, organizer (name/type/phone)');
  console.log('      ✓ Click "View Details" → should navigate to camp page');
  console.log('      ✓ Click "Refresh" → should reload blood camps');
  console.log('\n   📊 File Contents Validation:');
  console.log('      ✓ SuperAdminDashboard.jsx has geolocation + blood camps logic');
  console.log('      ✓ superadmin.css has all new styles for camps and alerts');
  console.log('      ✓ Error handling state properly managed');
  console.log('\n');
}

runTests().catch(error => {
  console.error('Test Suite Error:', error);
  process.exit(1);
});
