const { google } = require('googleapis');
const path = require('path');

async function checkCustomSheet() {
  const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
  
  console.log('🔍 Checking sheets in spreadsheet...');
  
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });
    
    console.log('📊 Sheets found:');
    spreadsheet.data.sheets.forEach(sheet => {
      console.log(`  - ${sheet.properties.title} (ID: ${sheet.properties.sheetId})`);
    });
    
    // Check if 'Custom Form Submissions' exists
    const customSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Custom Form Submissions');
    if (customSheet) {
      console.log('\n✅ Custom Form Submissions sheet exists!');
      console.log(`Sheet ID: ${customSheet.properties.sheetId}`);
      
      // Get headers
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Custom Form Submissions!1:1'
      });
      
      const headers = response.data.values ? response.data.values[0] : [];
      console.log(`\n📋 Headers (${headers.length} columns):`);
      headers.forEach((header, index) => {
        console.log(`${index + 1}. ${header}`);
      });
    } else {
      console.log('\n❌ Custom Form Submissions sheet NOT found.');
      console.log('Creating it now...');
      await createCustomSheet();
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function createCustomSheet() {
  const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
  
  try {
    // Create new sheet
    const request = {
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: 'Custom Form Submissions',
              gridProperties: {
                rowCount: 1000,
                columnCount: 21
              },
              tabColor: {
                red: 0.8,
                green: 0.6,
                blue: 0.0
              }
            }
          }
        }]
      }
    };
    
    const response = await sheets.spreadsheets.batchUpdate(request);
    console.log('✅ Custom Form Submissions sheet created!');
    
    // Add headers
    const headers = [
      'Timestamp',
      'Submission ID',
      'Athlete Name',
      'Email Address',
      'City/State',
      'Country',
      'Date of Birth',
      'Gender',
      'Bodyweight lbs',
      'Height (inches)',
      'Grip Training Experience',
      'Attempt Date',
      'Official Time',
      'Video Proof URL',
      'Additional Notes',
      'How did you hear about us?',
      'Consent',
      'Emailed',
      'Is PR',
      'Previous Best',
      'PR Badge'
    ];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Custom Form Submissions!1:1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers]
      }
    });
    
    console.log('✅ Headers added (21 columns)');
    
  } catch (error) {
    console.error('❌ Error creating sheet:', error.message);
  }
}

checkCustomSheet();