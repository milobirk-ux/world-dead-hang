const { google } = require('googleapis');
const path = require('path');

async function checkColumns38to50() {
  const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
  
  // Check columns 38-50 specifically
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!38:50' // Columns 38-50, row 1
  });
  
  const headers = response.data.values ? response.data.values[0] : [];
  
  console.log('Checking columns 38-50...\n');
  
  if (headers.length === 0) {
    console.log('No data in columns 38-50. The columns might be empty.');
    
    // Try to get the actual column letters
    console.log('\nTrying to get column letters...');
    const columnResponse = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      ranges: ['Sheet1!1:1']
    });
    
    console.log('Sheet metadata:', JSON.stringify(columnResponse.data, null, 2));
    
  } else {
    console.log(`Found ${headers.length} columns in range 38-50:`);
    headers.forEach((header, index) => {
      console.log(`Column ${38 + index}: '${header || '(empty)'}'`);
    });
  }
}

checkColumns38to50();