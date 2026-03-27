const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');

async function fixMiloBirk() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        console.log('🔧 Fixing Milo Birk data in Google Sheet...\n');

        // Get all data
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
        
        // Find column indices
        const nameIndex = headers.indexOf('Athlete Name');
        const approvedIndex = headers.indexOf('Approved');
        const verifiedIndex = headers.indexOf('Verified');
        const prBadgeIndex = headers.indexOf('PR Badge');
        const timeIndex = headers.indexOf('Official Time');
        
        // Find Milo Birk rows
        let miloRows = [];
        rows.forEach((row, i) => {
            const name = row[nameIndex];
            if (name && (name.toLowerCase().includes('milo') || name.toLowerCase().includes('birk'))) {
                miloRows.push({
                    rowNumber: i + 2, // +2 for header and 0-index
                    rowIndex: i,
                    name: name,
                    time: row[timeIndex] || '',
                    approved: row[approvedIndex] || '',
                    verified: row[verifiedIndex] || '',
                    prBadge: row[prBadgeIndex] || '',
                    hasPRBadge: row[prBadgeIndex] === '🏆 PR'
                });
            }
        });
        
        if (miloRows.length === 0) {
            console.log('❌ No Milo Birk submissions found');
            return;
        }
        
        console.log(`Found ${miloRows.length} Milo Birk submissions:\n`);
        
        // Find the submission with PR badge (latest/best)
        const prSubmission = miloRows.find(m => m.hasPRBadge);
        if (!prSubmission) {
            console.log('❌ No Milo Birk submission has PR badge');
            return;
        }
        
        console.log(`🏆 PR submission found (Row ${prSubmission.rowNumber}):`);
        console.log(`  Time: ${prSubmission.time}`);
        console.log(`  Current Approved: "${prSubmission.approved}"`);
        console.log(`  Current Verified: "${prSubmission.verified}"`);
        console.log(`  PR Badge: "${prSubmission.prBadge}"`);
        
        // Prepare updates
        const updates = [];
        
        // 1. Fix "Approved" column (change "Verified" to "Yes")
        if (prSubmission.approved !== 'Yes') {
            updates.push({
                range: `Sheet1!${getColumnLetter(approvedIndex + 1)}${prSubmission.rowNumber}`,
                values: [['Yes']]
            });
            console.log(`\n✅ Will update "Approved" to "Yes"`);
        }
        
        // 2. Set "Verified" column to "Yes" for checkmark
        if (prSubmission.verified !== 'Yes') {
            updates.push({
                range: `Sheet1!${getColumnLetter(verifiedIndex + 1)}${prSubmission.rowNumber}`,
                values: [['Yes']]
            });
            console.log(`✅ Will set "Verified" to "Yes" for checkmark ✅`);
        }
        
        // 3. Also fix other Milo Birk rows (remove "Verified" from Approved column)
        miloRows.forEach(milo => {
            if (milo.rowNumber !== prSubmission.rowNumber && milo.approved === 'Verified') {
                updates.push({
                    range: `Sheet1!${getColumnLetter(approvedIndex + 1)}${milo.rowNumber}`,
                    values: [['']] // Clear incorrect value
                });
                console.log(`✅ Will clear incorrect "Verified" from Approved column (Row ${milo.rowNumber})`);
            }
        });
        
        if (updates.length === 0) {
            console.log('\n✅ No fixes needed - data looks correct!');
            return;
        }
        
        // Apply updates
        console.log(`\n📝 Applying ${updates.length} updates to Google Sheet...`);
        
        const updateResponse = await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: 'RAW',
                data: updates
            }
        });
        
        console.log(`\n🎉 Successfully updated ${updateResponse.data.totalUpdatedCells} cells!`);
        console.log('\n📋 Summary of changes:');
        console.log('   1. Set "Approved" = "Yes" for Milo Birk\'s PR submission');
        console.log('   2. Set "Verified" = "Yes" for the gold checkmark ✅');
        console.log('   3. Cleared incorrect "Verified" values from other submissions');
        
        console.log('\n🚀 Next steps:');
        console.log('   1. Run: node approve-athlete-pr.js verify "Milo Birk"');
        console.log('   2. Check website: file:///C:/Users/milob/.openclaw/workspace/WDHC/index.html');
        console.log('   3. Verify checkmark appears next to Milo Birk\'s name');
        console.log('   4. Verify video link is updated to latest submission');
        
    } catch (error) {
        console.error('❌ Error fixing Milo Birk:', error.message);
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
    fixMiloBirk();
}

module.exports = { fixMiloBirk };