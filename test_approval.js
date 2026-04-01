const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, 'credentials', 'google-service-account.json');

async function testApproval() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEYFILE_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Custom Form Submissions!A:Z',
    });

    let rows = response.data.values;
    if (!rows || rows.length <= 1) {
        throw new Error("No submissions found in the Custom Form Submissions sheet.");
    }

    const headers = rows.shift();
    console.log('Headers:', headers);
    
    const nameIndex = headers.indexOf('Athlete Name');
    const approvedIndex = headers.indexOf('Approved');
    const verifiedIndex = headers.indexOf('Verified');
    
    console.log(`Athlete Name index: ${nameIndex}`);
    console.log(`Approved index: ${approvedIndex}`);
    console.log(`Verified index: ${verifiedIndex}`);
    
    // Let's also check for variations
    console.log('\nChecking for variations:');
    headers.forEach((h, i) => {
        if (h && (h.toLowerCase().includes('approved') || h.toLowerCase().includes('verified'))) {
            console.log(`${i}: '${h}'`);
        }
    });
    
    // Now let's look for Milo Birk
    console.log('\nSearching for Milo Birk:');
    let found = false;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row[nameIndex] && row[nameIndex].trim().toLowerCase() === 'milo birk') {
            console.log(`Found at row ${i + 2}:`, row[nameIndex]);
            console.log(`Approved value: '${row[approvedIndex]}'`);
            console.log(`Verified value: '${row[verifiedIndex]}'`);
            found = true;
            break;
        }
    }
    
    if (!found) {
        console.log('Milo Birk not found');
        // Let's see what names we have
        console.log('\nFirst 10 athlete names:');
        for (let i = 0; i < Math.min(10, rows.length); i++) {
            console.log(`${i + 2}: '${rows[i][nameIndex]}'`);
        }
    }
}

testApproval().catch(console.error);