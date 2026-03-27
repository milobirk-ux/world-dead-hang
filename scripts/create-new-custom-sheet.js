const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function createNewCustomSheet() {
  try {
    console.log('🚀 Creating NEW Google Sheet for custom form...');
    
    // Read service account credentials
    const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
    if (!fs.existsSync(KEYFILE_PATH)) {
      console.error('❌ Service account credentials not found at:', KEYFILE_PATH);
      console.log('Please ensure the credentials file exists.');
      return null;
    }
    
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILE_PATH,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ]
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });
    
    // Create new spreadsheet
    console.log('📝 Creating new Google Sheet...');
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: 'WDHC Custom Form Submissions',
          locale: 'en_US',
          timeZone: 'America/New_York',
          autoRecalc: 'ON_CHANGE'
        },
        sheets: [{
          properties: {
            title: 'Submissions',
            gridProperties: {
              rowCount: 1000,
              columnCount: 21
            },
            tabColor: {
              red: 0.8,
              green: 0.6,
              blue: 0.0  // Gold color
            }
          }
        }]
      }
    });
    
    const spreadsheetId = spreadsheet.data.spreadsheetId;
    console.log('✅ Sheet created!');
    console.log('📋 ID:', spreadsheetId);
    console.log('🔗 URL: https://docs.google.com/spreadsheets/d/' + spreadsheetId);
    
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
      spreadsheetId: spreadsheetId,
      range: 'Submissions!1:1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers]
      }
    });
    
    console.log('✅ Headers added (21 columns)');
    
    // Format headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.1,
                    green: 0.1,
                    blue: 0.1
                  },
                  textFormat: {
                    foregroundColor: {
                      red: 1,
                      green: 0.84,
                      blue: 0
                    },
                    bold: true,
                    fontSize: 11
                  },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          }
        ]
      }
    });
    
    console.log('✅ Headers formatted');
    
    // Share with Milo
    console.log('👤 Sharing with Milo...');
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: 'milo@homeinspectorsdetroit.com'
        },
        sendNotificationEmail: true
      });
      console.log('✅ Shared with milo@homeinspectorsdetroit.com');
    } catch (shareError) {
      console.log('⚠️ Could not automatically share. Please share manually:');
      console.log('   https://docs.google.com/spreadsheets/d/' + spreadsheetId);
      console.log('   Click "Share" and add milo@homeinspectorsdetroit.com as editor');
    }
    
    console.log('\n🎉 NEW SHEET CREATED SUCCESSFULLY!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Open the sheet: https://docs.google.com/spreadsheets/d/' + spreadsheetId);
    console.log('2. Go to Extensions → Apps Script');
    console.log('3. Copy the complete form handler code');
    console.log('4. Deploy as web app (Anyone access)');
    console.log('5. Update form HTML with web app URL');
    
    return spreadsheetId;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.errors) {
      console.error('Details:', JSON.stringify(error.errors, null, 2));
    }
    console.log('\n⚠️ If permission error, you may need to:');
    console.log('   - Enable Google Sheets API');
    console.log('   - Ensure service account has proper permissions');
    console.log('   - Share the existing spreadsheet with the service account email');
    return null;
  }
}

createNewCustomSheet();