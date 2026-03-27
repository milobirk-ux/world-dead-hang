const { google } = require('googleapis');
const path = require('path');

async function checkTallySheetStructure() {
  const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
  
  console.log('🔍 Checking Tally form sheet structure...');
  
  // Get all headers
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!1:1'
  });
  
  const headers = response.data.values ? response.data.values[0] : [];
  
  console.log('\n📊 Current Tally Form Sheet Structure:');
  console.log('Total columns:', headers.length);
  console.log('\n📋 Column list:');
  headers.forEach((header, index) => {
    console.log(`${index + 1}. ${header || '(empty)'}`);
  });
  
  // Check for our new columns
  console.log('\n🔍 Looking for our new columns:');
  const newColumns = ['Height (inches)', 'Grip Training Experience'];
  newColumns.forEach(col => {
    const index = headers.indexOf(col);
    if (index !== -1) {
      console.log(`✅ ${col} - Found at column ${index + 1}`);
    } else {
      console.log(`❌ ${col} - NOT FOUND`);
    }
  });
  
  // Check what columns Tally is actually using
  console.log('\n📝 Tally form likely uses these columns (based on typical structure):');
  const tallyColumns = [
    'Timestamp',
    'Email Address',
    'Name',
    'Date of Birth',
    'Gender',
    'Bodyweight (lbs)',
    'City, State',
    'Country',
    'Attempt Date',
    'Official Time (MM:SS)',
    'Video Proof URL',
    'Additional Notes',
    'How did you hear about us?'
  ];
  
  tallyColumns.forEach(col => {
    const index = headers.indexOf(col);
    if (index !== -1) {
      console.log(`✅ ${col} - Column ${index + 1}`);
    }
  });
}

checkTallySheetStructure();