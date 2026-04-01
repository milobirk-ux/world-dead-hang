const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, 'credentials', 'google-service-account.json');

async function addMissingColumns() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEYFILE_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // Get the header row
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Custom Form Submissions!1:1',
    });
    const headers = res.data.values[0] || [];
    console.log('Current headers:', headers);

    const required = ['Athlete Name', 'Approved', 'Verified'];
    const missing = required.filter(col => !headers.includes(col));
    if (missing.length === 0) {
        console.log('All required columns already exist.');
        return;
    }
    console.log('Missing columns:', missing);

    // Add missing columns to the end of the header row
    const startCol = headers.length + 1; // 1-indexed
    const endCol = startCol + missing.length - 1;
    const startLetter = columnToLetter(startCol);
    const endLetter = columnToLetter(endCol);
    const range = `Custom Form Submissions!${startLetter}1:${endLetter}1`;

    const values = [missing]; // single row with missing column names
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
    });
    console.log(`Added missing columns: ${missing.join(', ')}`);
}

function columnToLetter(column) {
    let temp, letter = '';
    while (column > 0) {
        temp = (column - 1) % 26;
        letter = String.fromCharCode(65 + temp) + letter;
        column = (column - temp - 1) / 26;
    }
    return letter;
}

addMissingColumns().catch(console.error);