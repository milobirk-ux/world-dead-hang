const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');

async function checkMiloStatus() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // Get all data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:AK', // A to AK covers all columns
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
        const videoIndex = headers.indexOf('Video Link (Copy &amp; Paste Unlisted YouTube, Instagram / TIkTok, Google Drive Link)');
        const timeIndex = headers.indexOf('Official Time');
        
        console.log('🔍 Checking Milo Birk submissions...\n');
        
        let miloRows = [];
        rows.forEach((row, i) => {
            const name = row[nameIndex];
            if (name && (name.toLowerCase().includes('milo') || name.toLowerCase().includes('birk'))) {
                miloRows.push({
                    rowNumber: i + 2, // +2 because we removed header and rows are 0-indexed
                    name: name,
                    time: row[timeIndex] || '',
                    approved: row[approvedIndex] || '',
                    verified: row[verifiedIndex] || '',
                    prBadge: row[prBadgeIndex] || '',
                    video: row[videoIndex] || '',
                    fullRow: row
                });
            }
        });
        
        if (miloRows.length === 0) {
            console.log('❌ No Milo Birk submissions found');
            return;
        }
        
        console.log(`Found ${miloRows.length} Milo Birk submissions:\n`);
        
        miloRows.forEach((milo, index) => {
            console.log(`Submission ${index + 1} (Row ${milo.rowNumber}):`);
            console.log(`  Name: ${milo.name}`);
            console.log(`  Time: ${milo.time}`);
            console.log(`  Approved: "${milo.approved}" ${milo.approved === 'Yes' ? '✅' : '❌'}`);
            console.log(`  Verified: "${milo.verified}" ${milo.verified === 'Yes' ? '✅' : '❌'}`);
            console.log(`  PR Badge: "${milo.prBadge}" ${milo.prBadge === '🏆 PR' ? '🏆' : ''}`);
            console.log(`  Video: ${milo.video ? '✅ Has video' : '❌ No video'}`);
            console.log('');
        });
        
        // Check which submission should be in leaderboard
        console.log('📊 Analysis:');
        
        const approvedSubmissions = miloRows.filter(m => m.approved === 'Yes');
        if (approvedSubmissions.length === 0) {
            console.log('❌ No Milo Birk submissions are marked as "Approved"');
            console.log('   The leaderboard only shows submissions with "Approved" = "Yes"');
        } else {
            console.log(`✅ ${approvedSubmissions.length} submission(s) are approved`);
            
            // Find the best time among approved submissions
            const bestSubmission = approvedSubmissions.reduce((best, current) => {
                // Simple time comparison (this could be improved)
                const currentTime = current.time;
                const bestTime = best.time;
                
                // Convert to seconds for comparison
                function timeToSeconds(timeStr) {
                    if (!timeStr) return 0;
                    if (timeStr.includes(':')) {
                        const [min, sec] = timeStr.split(':').map(Number);
                        return min * 60 + sec;
                    }
                    if (timeStr.includes('.')) {
                        const [min, sec] = timeStr.split('.');
                        return parseInt(min) * 60 + parseInt(sec);
                    }
                    return parseFloat(timeStr);
                }
                
                const currentSeconds = timeToSeconds(currentTime);
                const bestSeconds = timeToSeconds(bestTime);
                
                return currentSeconds > bestSeconds ? current : best;
            });
            
            console.log(`🏆 Best approved time: ${bestSubmission.time} (Row ${bestSubmission.rowNumber})`);
            
            if (bestSubmission.verified !== 'Yes') {
                console.log(`⚠️  Best submission is NOT verified: "${bestSubmission.verified}"`);
                console.log('   This explains why there\'s no checkmark on the website!');
            } else {
                console.log(`✅ Best submission IS verified: Should show checkmark ✅`);
            }
            
            if (bestSubmission.prBadge !== '🏆 PR') {
                console.log(`⚠️  Best submission has no PR badge: "${bestSubmission.prBadge}"`);
            } else {
                console.log(`✅ Best submission has PR badge: 🏆`);
            }
        }
        
        console.log('\n🎯 Action required:');
        console.log('   1. Mark Milo Birk\'s best submission as "Approved" = "Yes"');
        console.log('   2. Mark it as "Verified" = "Yes" for the checkmark ✅');
        console.log('   3. Run: node approve-athlete-pr.js verify "Milo Birk"');
        console.log('   4. Check website for checkmark and updated video link');
        
    } catch (error) {
        console.error('❌ Error checking Milo status:', error.message);
    }
}

if (require.main === module) {
    checkMiloStatus();
}

module.exports = { checkMiloStatus };