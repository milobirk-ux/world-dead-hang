const { google } = require('googleapis');
const path = require('path');

async function verifyCustomSheet() {
  const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
  
  console.log('🔍 Verifying custom form sheet...\n');
  
  try {
    // Get all sheets in the spreadsheet
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });
    
    console.log('📊 Sheets in spreadsheet:');
    spreadsheet.data.sheets.forEach(sheet => {
      console.log(`  - ${sheet.properties.title} (ID: ${sheet.properties.sheetId})`);
    });
    
    // Get headers from custom form sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Custom Form Submissions!1:1'
    });
    
    const headers = response.data.values ? response.data.values[0] : [];
    
    console.log('\n✅ Custom Form Submissions sheet verified!');
    console.log(`Number of columns: ${headers.length}`);
    console.log('\n📋 Headers:');
    headers.forEach((header, index) => {
      console.log(`${index + 1}. ${header}`);
    });
    
    // Check if we have all required columns
    const requiredColumns = [
      'Athlete Name',
      'Email Address',
      'Height (inches)',
      'Grip Training Experience',
      'Official Time',
      'Video Proof URL'
    ];
    
    console.log('\n🔍 Checking required columns:');
    let allColumnsPresent = true;
    requiredColumns.forEach(column => {
      if (headers.includes(column)) {
        console.log(`✅ ${column}`);
      } else {
        console.log(`❌ ${column} - MISSING`);
        allColumnsPresent = false;
      }
    });
    
    if (allColumnsPresent) {
      console.log('\n🎉 All required columns present! Sheet is ready for form submissions.');
    } else {
      console.log('\n⚠️ Some columns are missing. Please check the sheet setup.');
    }
    
  } catch (error) {
    console.error('❌ Error verifying sheet:', error.message);
  }
}

verifyCustomSheet();