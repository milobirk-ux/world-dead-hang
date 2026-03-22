const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');

async function inspectSheet() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // Get all data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:Z',
        });

        let rows = response.data.values;
        if (!rows || rows.length <= 1) {
            console.log('No data found in sheet');
            return;
        }

        const headers = rows.shift();
        console.log('📋 Sheet Headers:');
        headers.forEach((header, index) => {
            console.log(`  ${index}: "${header}"`);
        });
        
        console.log('\n🔍 Checking for Milo Birk...');
        
        const nameIndex = headers.indexOf('Athlete Name');
        const approvedIndex = headers.indexOf('Approved');
        const verifiedIndex = headers.indexOf('Verified');
        const prBadgeIndex = headers.indexOf('PR Badge');
        
        console.log(`\nColumn indices:`);
        console.log(`  Athlete Name: ${nameIndex}`);
        console.log(`  Approved: ${approvedIndex}`);
        console.log(`  Verified: ${verifiedIndex}`);
        console.log(`  PR Badge: ${prBadgeIndex}`);
        
        console.log('\n👥 All athletes in sheet:');
        rows.forEach((row, i) => {
            const name = row[nameIndex];
            const approved = approvedIndex !== -1 ? row[approvedIndex] : '';
            const verified = verifiedIndex !== -1 ? row[verifiedIndex] : '';
            const prBadge = prBadgeIndex !== -1 ? row[prBadgeIndex] : '';
            
            if (name) {
                console.log(`  ${i+2}: "${name}" - Approved: "${approved}", Verified: "${verified}", PR: "${prBadge}"`);
                
                // Check for Milo Birk
                if (name.toLowerCase().includes('milo') || name.toLowerCase().includes('birk')) {
                    console.log(`     ⭐ FOUND MILO BIRK! Row ${i+2}`);
                    console.log(`       Full row: ${JSON.stringify(row)}`);
                }
            }
        });
        
        console.log('\n✅ Sheet inspection complete.');
        
    } catch (error) {
        console.error('❌ Error inspecting sheet:', error.message);
    }
}

if (require.main === module) {
    inspectSheet();
}

module.exports = { inspectSheet };