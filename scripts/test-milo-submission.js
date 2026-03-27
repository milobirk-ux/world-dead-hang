// WDHC Custom Form Test Script - Milo's 4:26 Hang Time Test
// Use this to test form submissions after deployment with Milo's actual data

// Milo's test data (based on typical Milo profile)
const miloTestData = {
  athleteName: "Milo Birk",
  email: "milobirk@gmail.com", // Milo's actual email
  cityState: "Detroit, Michigan",
  country: "United States",
  dob: "1988-06-15", // Approximate DOB for Milo
  gender: "Male",
  weight: "185", // Approximate weight
  height: "72", // 6 feet
  gripTraining: "Intermediate",
  attemptDate: "2026-03-23",
  hangTime: "4:26", // Milo's 4:26 hang time as specified
  videoUrl: "https://youtube.com/watch?v=milo-test-4-26",
  notes: "Test submission with Milo's 4:26 hang time - WDHC v2.5 update test",
  hearAbout: "Direct (Creator)",
  consent: true
};

// Update this with your actual web app URL after deployment
const WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

async function testMiloSubmission() {
  console.log('🚀 Testing WDHC Custom Form Submission with Milo\'s 4:26 Hang Time\n');
  
  if (WEB_APP_URL.includes('YOUR_DEPLOYMENT_ID')) {
    console.log('❌ Please update WEB_APP_URL with your actual deployment URL');
    console.log('   Get this from: Google Apps Script → Deploy → Web app');
    console.log('\n📋 To get your deployment URL:');
    console.log('   1. Open your WDHC Google Sheet');
    console.log('   2. Go to Extensions → Apps Script');
    console.log('   3. Click Deploy → Manage deployments');
    console.log('   4. Copy the "Web app" URL (starts with https://script.google.com/macros/s/)');
    console.log('   5. Update this script with that URL');
    return;
  }
  
  console.log('📤 Sending Milo\'s test data to:', WEB_APP_URL);
  console.log('📊 Test data:', JSON.stringify(miloTestData, null, 2));
  
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(miloTestData)
    });
    
    const result = await response.text();
    
    console.log('\n✅ Response received:');
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.status === 200) {
      const parsedResult = JSON.parse(result);
      console.log('\n🎉 Form submission successful!');
      console.log('Message:', parsedResult.message);
      console.log('Submission ID:', parsedResult.submissionId);
      console.log('\n📧 Check milobirk@gmail.com for the confirmation email');
      console.log('📊 Check your Google Sheet for the new row');
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
    } else if (error.message.includes('fetch')) {
      console.log('\n⚠️ Network error:');
      console.log('1. Check your internet connection');
      console.log('2. Verify the web app URL is correct');
      console.log('3. Try opening the web app URL in browser first');
    }
  }
}

// Run test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testMiloSubmission();
}

module.exports = { miloTestData, testMiloSubmission };