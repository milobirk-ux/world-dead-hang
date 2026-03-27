const { google } = require('googleapis');
const path = require('path');

async function checkHeaders() {
  const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Custom Form Submissions!1:1'
    });
    
    const headers = response.data.values ? response.data.values[0] : [];
    console.log('Custom Form Submissions Headers:');
    headers.forEach((header, index) => {
      console.log(`${index}: ${header}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkHeaders();