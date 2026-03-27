// WDHC Custom Form Test Script
// Use this to test form submissions after deployment

// Test data matching the custom form fields
const testData = {
  athleteName: "Test Athlete",
  email: "test@example.com",
  cityState: "Detroit, Michigan",
  country: "United States",
  dob: "1990-01-15",
  gender: "Male",
  weight: "175.5",
  height: "70",
  gripTraining: "Intermediate",
  attemptDate: "2026-03-23",
  hangTime: "4:26",
  videoUrl: "https://youtube.com/watch?v=test123",
  notes: "Test submission - please ignore",
  hearAbout: "Instagram",
  consent: true
};

// Update this with your actual web app URL after deployment
const WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

async function testFormSubmission() {
  console.log('🚀 Testing WDHC Custom Form Submission\n');
  
  if (WEB_APP_URL.includes('YOUR_DEPLOYMENT_ID')) {
    console.log('❌ Please update WEB_APP_URL with your actual deployment URL');
    console.log('   Get this from: Google Apps Script → Deploy → Web app');
    return;
  }
  
  console.log('📤 Sending test data to:', WEB_APP_URL);
  console.log('📊 Test data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.text();
    
    console.log('\n✅ Response received:');
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.status === 200) {
      console.log('\n🎉 Form submission successful!');
      console.log('Check your Google Sheet for the new row.');
    } else {
      console.log('\n❌ Form submission failed');
      console.log('Check Apps Script execution logs for errors.');
    }
    
  } catch (error) {
    console.log('\n❌ Error during submission:');
    console.log(error.message);
    
    if (error.message.includes('CORS')) {
      console.log('\n⚠️ CORS error detected:');
      console.log('1. Make sure web app is deployed with "Anyone" access');
      console.log('2. Check that doGet() function returns CORS headers');
      console.log('3. Try running from browser console instead');
    }
  }
}

// Run test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testFormSubmission();
}

module.exports = { testData, testFormSubmission };