const { google } = require('googleapis');
const path = require('path');

async function createCustomFormSheet() {
  try {
    console.log('📝 Creating new sheet for custom form submissions...');
    
    const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILE_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
    
    // Create a new sheet
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
    const sheetId = response.data.replies[0].addSheet.properties.sheetId;
    
    console.log('✅ New sheet created!');
    console.log('Sheet ID:', sheetId);
    console.log('Title: Custom Form Submissions');
    
    // Now add the headers
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
    
    console.log('\n✅ Headers added to new sheet');
    console.log('Total columns:', headers.length);
    console.log('\n📋 Column list:');
    headers.forEach((header, index) => {
      console.log(`${index + 1}. ${header}`);
    });
    
    console.log('\n🔗 Spreadsheet URL: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID);
    console.log('📊 New sheet will appear as "Custom Form Submissions" tab');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.errors) console.error('Details:', error.errors);
    
    // If sheet already exists, try to update it
    if (error.message.includes('already exists')) {
      console.log('\n⚠️ Sheet already exists. Updating headers...');
      await updateExistingSheet();
    }
  }
}

async function updateExistingSheet() {
  const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
  
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
  
  console.log('✅ Headers updated in existing sheet');
}

createCustomFormSheet();