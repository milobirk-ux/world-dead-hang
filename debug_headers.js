const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, 'credentials', 'google-service-account.json');

async function debugHeaders() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEYFILE_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Custom Form Submissions!1:1',
    });
    const headers = res.data.values[0] || [];
    console.log('Number of headers:', headers.length);
    headers.forEach((h, i) => {
        console.log(`${i}: '${h}'`);
    });
    const approvedIndex = headers.indexOf('Approved');
    const verifiedIndex = headers.indexOf('Verified');
    console.log(`Index of 'Approved': ${approvedIndex}`);
    console.log(`Index of 'Verified': ${verifiedIndex}`);
}

debugHeaders().catch(console.error);