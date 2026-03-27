const { google } = require('googleapis');
const path = require('path');

async function findNewColumns() {
  const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
  
  // Check a wider range
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!1:50' // Check first 50 columns
  });
  
  const headers = response.data.values ? response.data.values[0] : [];
  
  console.log('Searching for our new columns...\n');
  
  const columnsToFind = ['Height (inches)', 'Grip Training Experience', 'Additional Notes'];
  
  columnsToFind.forEach(column => {
    const index = headers.indexOf(column);
    if (index !== -1) {
      console.log(`✅ Found '${column}' at column ${index + 1}`);
    } else {
      console.log(`❌ '${column}' NOT FOUND`);
    }
  });
  
  // Also check for similar column names
  console.log('\n🔍 Checking for similar column names...');
  headers.forEach((header, index) => {
    if (header && (header.includes('Height') || header.includes('Grip') || header.includes('Training') || header.includes('Experience') || header.includes('Notes'))) {
      console.log(`Column ${index + 1}: '${header}'`);
    }
  });
}

findNewColumns();