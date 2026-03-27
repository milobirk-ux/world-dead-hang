const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');

async function debugSync() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:AK',
        });

        let rows = response.data.values;
        if (!rows || rows.length <= 1) {
            console.log('No data found in sheet');
            return;
        }

        const headers = rows.shift();
        
        console.log('Total rows:', rows.length);
        console.log('Total columns in header:', headers.length);
        
        // Find column indices
        const nameIndex = headers.indexOf('Athlete Name');
        const approvedIndex = headers.indexOf('Approved');
        const verifiedIndex = headers.indexOf('Verified');
        const prBadgeIndex = headers.indexOf('PR Badge');
        const timeIndex = headers.indexOf('Official Time');
        const videoIndex = headers.indexOf('Video Link (Copy &amp; Paste Unlisted YouTube, Instagram / TIkTok, Google Drive Link)');
        
        console.log('\nColumn indices:');
        console.log('Athlete Name:', nameIndex);
        console.log('Approved:', approvedIndex);
        console.log('Verified:', verifiedIndex);
        console.log('PR Badge:', prBadgeIndex);
        console.log('Official Time:', timeIndex);
        console.log('Video Link:', videoIndex);
        
        console.log('\nChecking each row for approval...');
        let approvedCount = 0;
        
        rows.forEach((row, i) => {
            const name = row[nameIndex];
            const approved = approvedIndex !== -1 ? row[approvedIndex] : '';
            const verified = verifiedIndex !== -1 ? row[verifiedIndex] : '';
            const time = row[timeIndex] || '';
            
            if (approved === 'Yes') {
                approvedCount++;
                console.log(`Row ${i+2}: ${name} - Approved: "${approved}", Verified: "${verified}", Time: "${time}"`);
                
                // Check if row has enough columns
                console.log(`  Row length: ${row.length}, Approved column value: "${row[approvedIndex]}"`);
                
                // Check Milo Birk specifically
                if (name && name.toLowerCase().includes('milo')) {
                    console.log(`  ⭐ Milo Birk row - checking details:`);
                    console.log(`    Verified value: "${verified}"`);
                    console.log(`    Video: "${row[videoIndex]}"`);
                }
            }
        });
        
        console.log(`\nTotal approved athletes: ${approvedCount}`);
        
        if (approvedCount === 0) {
            console.log('\nChecking why Milo Birk not approved...');
            rows.forEach((row, i) => {
                const name = row[nameIndex];
                if (name && name.toLowerCase().includes('milo')) {
                    console.log(`Row ${i+2}: ${name}`);
                    console.log(`  Approved column index ${approvedIndex}: "${row[approvedIndex]}"`);
                    console.log(`  Verified column index ${verifiedIndex}: "${row[verifiedIndex]}"`);
                    console.log(`  Row length: ${row.length}`);
                    console.log(`  Full row up to 40 columns:`, row.slice(0, 40));
                }
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

if (require.main === module) {
    debugSync();
}