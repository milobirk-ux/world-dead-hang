const { google } = require('googleapis');
const path = require('path');

async function checkHeaders() {
  const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!1:1'
  });
  
  const headers = response.data.values ? response.data.values[0] : [];
  
  console.log('Total columns:', headers.length);
  console.log('\nAll headers:');
  headers.forEach((header, index) => {
    console.log(`${index + 1}. ${header || '(empty)'}`);
  });
}

checkHeaders();