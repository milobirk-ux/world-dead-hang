const { google } = require('googleapis');
const path = require('path');

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing columns to WDHC spreadsheet...');
    
    const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILE_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Existing WDHC spreadsheet ID
    const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
    
    // Columns to add
    const columnsToAdd = [
      'Height (inches)',
      'Grip Training Experience', 
      'Additional Notes'
    ];
    
    // First, get current headers to find the last column
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!1:1'
    });
    
    const currentHeaders = response.data.values ? response.data.values[0] : [];
    const lastColumnIndex = currentHeaders.length; // 1-based for API
    
    console.log('Current number of columns:', lastColumnIndex);
    console.log('Adding', columnsToAdd.length, 'new columns...');
    
    // Add each column
    for (let i = 0; i < columnsToAdd.length; i++) {
      const columnName = columnsToAdd[i];
      const columnIndex = lastColumnIndex + i;
      
      // Add column header
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!1:${columnIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[columnName]]
        }
      });
      
      console.log(`✅ Added column: ${columnName} (column ${columnIndex + 1})`);
    }
    
    console.log('\n🎉 All columns added successfully!');
    console.log('The spreadsheet now has', lastColumnIndex + columnsToAdd.length, 'columns.');
    
    // Verify by getting updated headers
    const updatedResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!1:1'
    });
    
    const updatedHeaders = updatedResponse.data.values ? updatedResponse.data.values[0] : [];
    console.log('\n📋 Updated headers (last 5 columns):', updatedHeaders.slice(-5));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.errors) console.error('Details:', error.errors);
  }
}

addMissingColumns();