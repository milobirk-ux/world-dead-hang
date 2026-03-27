// WDHC Custom Form Setup Checker
// Run this to verify everything is ready for the custom form system

const fs = require('fs');
const path = require('path');

console.log('🔍 WDHC Custom Form Setup Checker');
console.log('==================================\n');

// Check 1: Required files exist
console.log('📁 File Check:');
const requiredFiles = [
  'submit-custom-draft.html',
  'google-apps-script-form-handler.gs',
  'email-automation-v2.0.gs',
  'CUSTOM_FORM_SETUP_GUIDE.md'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check 2: Form has correct fields
console.log('\n📋 Form Field Check:');
try {
  const formHtml = fs.readFileSync(path.join(__dirname, 'submit-custom-draft.html'), 'utf8');
  
  const requiredFields = [
    'athleteName',
    'email', 
    'cityState',
    'country',
    'dob',
    'gender',
    'weight',
    'height',
    'gripTraining',
    'attemptDate',
    'hangTime',
    'videoUrl',
    'hearAbout',
    'consent'
  ];
  
  let missingFields = [];
  requiredFields.forEach(field => {
    if (!formHtml.includes(`name="${field}"`)) {
      missingFields.push(field);
    }
  });
  
  if (missingFields.length === 0) {
    console.log('  ✅ All 14 form fields present');
  } else {
    console.log(`  ❌ Missing fields: ${missingFields.join(', ')}`);
    allFilesExist = false;
  }
  
  // Check for WEB_APP_URL
  if (formHtml.includes('const WEB_APP_URL =')) {
    console.log('  ✅ WEB_APP_URL variable found');
  } else {
    console.log('  ⚠️ WEB_APP_URL variable not found - needs to be set after deployment');
  }
  
} catch (error) {
  console.log(`  ❌ Cannot read form HTML: ${error.message}`);
  allFilesExist = false;
}

// Check 3: Form handler has correct columns
console.log('\n📊 Form Handler Column Check:');
try {
  const handlerScript = fs.readFileSync(path.join(__dirname, 'google-apps-script-form-handler.gs'), 'utf8');
  
  const requiredColumns = [
    'Timestamp',
    'Submission ID', 
    'Athlete Name',
    'Email Address',
    'Date of Birth',
    'Gender',
    'Bodyweight lbs',
    'Height (inches)',
    'Grip Training Experience',
    'Official Time',
    'Video Proof URL',
    'Additional Notes',
    'Emailed',
    'Is PR',
    'Previous Best',
    'PR Badge'
  ];
  
  let missingColumns = [];
  requiredColumns.forEach(column => {
    if (!handlerScript.includes(`'${column}'`)) {
      missingColumns.push(column);
    }
  });
  
  if (missingColumns.length === 0) {
    console.log('  ✅ All 16 required columns defined');
  } else {
    console.log(`  ❌ Missing columns: ${missingColumns.join(', ')}`);
    allFilesExist = false;
  }
  
} catch (error) {
  console.log(`  ❌ Cannot read form handler: ${error.message}`);
  allFilesExist = false;
}

// Check 4: Email automation has grip age calculation
console.log('\n📧 Email Automation Check:');
try {
  const emailScript = fs.readFileSync(path.join(__dirname, 'email-automation-v2.0.gs'), 'utf8');
  
  const requiredFunctions = [
    'calculateWDHCGripAge',
    'sendWelcomeEmailOnNewRow',
    'setupEmailColumns'
  ];
  
  let missingFunctions = [];
  requiredFunctions.forEach(func => {
    if (!emailScript.includes(`function ${func}`)) {
      missingFunctions.push(func);
    }
  });
  
  if (missingFunctions.length === 0) {
    console.log('  ✅ All required functions present');
  } else {
    console.log(`  ❌ Missing functions: ${missingFunctions.join(', ')}`);
    allFilesExist = false;
  }
  
  // Check for 4-level grip training
  if (emailScript.includes('training.includes(\'none\')') &&
      emailScript.includes('training.includes(\'beginner\')') &&
      emailScript.includes('training.includes(\'intermediate\')') &&
      emailScript.includes('training.includes(\'advanced\')')) {
    console.log('  ✅ 4-level grip training system configured');
  } else {
    console.log('  ❌ Grip training levels not properly configured');
    allFilesExist = false;
  }
  
} catch (error) {
  console.log(`  ❌ Cannot read email automation: ${error.message}`);
  allFilesExist = false;
}

// Summary
console.log('\n📈 SUMMARY:');
if (allFilesExist) {
  console.log('✅ All systems ready for Google Sheets setup!');
  console.log('\n🚀 Next steps:');
  console.log('1. Create Google Sheet with exact column headers');
  console.log('2. Deploy form handler as web app');
  console.log('3. Update WEB_APP_URL in form HTML');
  console.log('4. Test submission workflow');
  console.log('5. Set up email automation trigger');
  console.log('\n📖 See CUSTOM_FORM_SETUP_GUIDE.md for detailed instructions');
} else {
  console.log('❌ Some issues found. Please fix before proceeding.');
  console.log('\n🔧 Check the errors above and fix missing components.');
}

console.log('\n==================================');
console.log('Setup check completed.');