const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');

async function addMissingColumns() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        console.log('📋 Adding missing columns to Google Sheet...\n');

        // First, get current headers to see what's missing
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!1:1', // Just the header row
        });

        const headers = response.data.values ? response.data.values[0] : [];
        console.log(`Current headers (${headers.length} columns):`);
        headers.forEach((header, i) => console.log(`  ${i}: "${header}"`));

        // Define columns we need to add
        const columnsToAdd = [
            { name: 'Approved', description: 'Mark submissions as approved (Yes/No)' },
            { name: 'Verified', description: 'Gold checkmark verification (Yes/No)' },
            { name: 'PR Badge', description: '🏆 PR badge for personal records' },
            { name: 'Emailed', description: 'Track if welcome email was sent' },
            { name: 'Is PR', description: 'Track if this is a personal record' },
            { name: 'Previous Best', description: 'Previous best time for PR tracking' }
        ];

        // Check which columns are missing
        const missingColumns = [];
        columnsToAdd.forEach(col => {
            if (!headers.includes(col.name)) {
                missingColumns.push(col);
            }
        });

        if (missingColumns.length === 0) {
            console.log('\n✅ All required columns already exist!');
            return;
        }

        console.log(`\nMissing ${missingColumns.length} columns:`);
        missingColumns.forEach(col => {
            console.log(`  - "${col.name}": ${col.description}`);
        });

        // Add missing columns
        const newColumnIndex = headers.length;
        const requests = missingColumns.map((col, index) => {
            const columnLetter = getColumnLetter(newColumnIndex + index + 1);
            return {
                updateCells: {
                    range: {
                        sheetId: 0, // First sheet
                        startRowIndex: 0,
                        endRowIndex: 1,
                        startColumnIndex: newColumnIndex + index,
                        endColumnIndex: newColumnIndex + index + 1
                    },
                    rows: [{
                        values: [{
                            userEnteredValue: { stringValue: col.name },
                            userEnteredFormat: {
                                textFormat: { bold: true },
                                backgroundColor: { red: 0.9, green: 0.95, blue: 1.0 }
                            }
                        }]
                    }],
                    fields: 'userEnteredValue,userEnteredFormat'
                }
            };
        });

        // Execute batch update
        const updateResponse = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: requests
            }
        });

        console.log(`\n✅ Successfully added ${missingColumns.length} columns:`);
        missingColumns.forEach((col, index) => {
            const columnLetter = getColumnLetter(newColumnIndex + index + 1);
            console.log(`  - "${col.name}" added to column ${columnLetter}`);
        });

        console.log('\n📋 Updated column structure:');
        console.log('  1. Open your Google Sheet');
        console.log('  2. You should see new columns at the end:');
        missingColumns.forEach(col => console.log(`     - "${col.name}"`));
        console.log('\n🎯 Next steps:');
        console.log('  1. Manually mark Milo Birk as "Approved" and "Verified"');
        console.log('  2. Run: node approve-athlete-pr.js verify "Milo Birk"');
        console.log('  3. Check leaderboard for checkmark ✅');

    } catch (error) {
        console.error('❌ Error adding columns:', error.message);
    }
}

// Helper function to convert column index to letter
function getColumnLetter(columnIndex) {
    let letter = '';
    while (columnIndex > 0) {
        const remainder = (columnIndex - 1) % 26;
        letter = String.fromCharCode(65 + remainder) + letter;
        columnIndex = Math.floor((columnIndex - 1) / 26);
    }
    return letter;
}

if (require.main === module) {
    addMissingColumns();
}

module.exports = { addMissingColumns };