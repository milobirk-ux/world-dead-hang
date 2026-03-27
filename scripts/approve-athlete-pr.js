const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;

// --- CONFIGURATION ---
const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');

async function approveAthlete(athleteName, action = 'approve') {
    try {
        console.log(`${action === 'verify' ? 'Verifying' : 'Approving'} athlete: "${athleteName}"`);
        
        // 1. Authenticate
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // 2. Read the sheet to find the athlete
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:AK', // Extended range to include all columns (A to AK = 37 columns)
        });

        let rows = response.data.values;
        if (!rows || rows.length <= 1) {
            throw new Error("No submissions found in the Google Sheet.");
        }

        const headers = rows.shift();
        
        const nameIndex = headers.indexOf('Athlete Name');
        const approvedIndex = headers.indexOf('Approved');
        const verifiedIndex = headers.indexOf('Verified');
        const prBadgeIndex = headers.indexOf('PR Badge');
        
        if (nameIndex === -1) {
            throw new Error("Could not find 'Athlete Name' column in sheet.");
        }
        if (approvedIndex === -1) {
            throw new Error("Could not find 'Approved' column in sheet.");
        }
        if (verifiedIndex === -1) {
            throw new Error("Could not find 'Verified' column in sheet.");
        }

        // 3. Find the athlete's row(s)
        const athleteRows = [];
        rows.forEach((row, index) => {
            const name = row[nameIndex];
            if (name && name.toString().trim().toLowerCase() === athleteName.trim().toLowerCase()) {
                athleteRows.push({
                    rowIndex: index + 2, // +2 because we removed header and sheets are 1-indexed
                    data: row,
                    name: name,
                    time: row[headers.indexOf('Total Dead Hang Time')] || '',
                    approved: row[approvedIndex] === 'Yes',
                    verified: row[verifiedIndex] === 'Yes',
                    hasPRBadge: prBadgeIndex !== -1 ? row[prBadgeIndex] === '🏆 PR' : false
                });
            }
        });

        if (athleteRows.length === 0) {
            throw new Error(`Athlete "${athleteName}" not found in the sheet.`);
        }

        console.log(`Found ${athleteRows.length} submission(s) for "${athleteName}"`);

        // 4. Determine which row to update (best time if multiple)
        let rowToUpdate;
        if (athleteRows.length === 1) {
            rowToUpdate = athleteRows[0];
        } else {
            // Find the row with the best (longest) time
            let bestTime = 0;
            athleteRows.forEach(row => {
                const timeStr = row.time;
                const seconds = parseTimeToSeconds(timeStr);
                if (seconds > bestTime) {
                    bestTime = seconds;
                    rowToUpdate = row;
                }
            });
            console.log(`Selected submission with time: ${rowToUpdate.time} (${bestTime} seconds)`);
        }

        // 5. Prepare updates
        const updates = [];
        
        if (action === 'verify') {
            // For verify: set both Approved and Verified to Yes
            updates.push({
                range: `Sheet1!${getColumnLetter(approvedIndex + 1)}${rowToUpdate.rowIndex}`,
                values: [['Yes']]
            });
            updates.push({
                range: `Sheet1!${getColumnLetter(verifiedIndex + 1)}${rowToUpdate.rowIndex}`,
                values: [['Yes']]
            });
            console.log(`✅ Marking "${athleteName}" as Approved and Verified`);
        } else {
            // For approve: only set Approved to Yes
            updates.push({
                range: `Sheet1!${getColumnLetter(approvedIndex + 1)}${rowToUpdate.rowIndex}`,
                values: [['Yes']]
            });
            console.log(`✅ Marking "${athleteName}" as Approved`);
        }

        // 6. Check if this should get a PR badge
        // Find all submissions for this athlete to determine if this is their best time
        const allAthleteTimes = athleteRows.map(row => ({
            seconds: parseTimeToSeconds(row.time),
            rowIndex: row.rowIndex,
            hasPRBadge: row.hasPRBadge,
            isVerified: row.verified === 'Yes' || row.verified === true
        }));
        
        const currentSeconds = parseTimeToSeconds(rowToUpdate.time);
        const isBestTime = allAthleteTimes.every(time => currentSeconds >= time.seconds);
        
        if (isBestTime && prBadgeIndex !== -1) {
            // Remove PR badge from any previous submissions BUT PRESERVE VERIFICATION
            allAthleteTimes.forEach(time => {
                if (time.hasPRBadge && time.rowIndex !== rowToUpdate.rowIndex) {
                    updates.push({
                        range: `Sheet1!${getColumnLetter(prBadgeIndex + 1)}${time.rowIndex}`,
                        values: [['']] // Clear PR badge ONLY
                    });
                    console.log(`🔄 Removing PR badge from previous submission at row ${time.rowIndex}`);
                    
                    // IMPORTANT: If the old submission was verified, ensure verification stays
                    if (time.isVerified && verifiedIndex !== -1) {
                        // Double-check that verification column still has "Yes"
                        console.log(`✅ Preserving verification checkmark on row ${time.rowIndex}`);
                        // Note: We don't need to update the verified column since it should already be "Yes"
                    }
                }
            });
            
            // Add PR badge to current submission
            updates.push({
                range: `Sheet1!${getColumnLetter(prBadgeIndex + 1)}${rowToUpdate.rowIndex}`,
                values: [['🏆 PR']]
            });
            console.log(`🏆 Adding PR badge to row ${rowToUpdate.rowIndex} (Best time: ${rowToUpdate.time})`);
        }

        // 7. Apply updates
        if (updates.length > 0) {
            const updateResponse = await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    valueInputOption: 'USER_ENTERED',
                    data: updates
                }
            });
            
            console.log(`📝 Updated ${updateResponse.data.totalUpdatedCells} cell(s)`);
        }

        // 8. Sync leaderboard data
        console.log("🔄 Syncing leaderboard data...");
        const { syncLeaderboard } = require('./sync-leaderboard-pr.js');
        const athletes = await syncLeaderboard();
        
        // Find the updated athlete in the leaderboard
        const updatedAthlete = athletes.find(a => 
            a.name.toLowerCase() === athleteName.trim().toLowerCase()
        );
        
        if (updatedAthlete) {
            console.log(`\n🎯 Athlete "${athleteName}" updated successfully!`);
            console.log(`   Time: ${updatedAthlete.time}`);
            console.log(`   Status: ${action === 'verify' ? 'Verified ✅' : 'Approved ✓'}`);
            console.log(`   PR Badge: ${updatedAthlete.prBadge ? '🏆 Yes' : 'No'}`);
            console.log(`   Position: #${athletes.indexOf(updatedAthlete) + 1} on leaderboard`);
        } else {
            console.log(`\n⚠️  Athlete "${athleteName}" not found in leaderboard after update.`);
        }

        return {
            success: true,
            athleteName,
            action,
            prBadgeAdded: isBestTime && prBadgeIndex !== -1,
            leaderboardPosition: updatedAthlete ? athletes.indexOf(updatedAthlete) + 1 : null
        };

    } catch (error) {
        console.error('❌ Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Helper function to parse time to seconds
function parseTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const str = String(timeStr).trim();
    if (str.includes(':')) {
        const parts = str.split(':');
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        return minutes * 60 + seconds;
    }
    const num = parseFloat(str);
    if (isNaN(num)) return 0;
    if (str.includes('.') && num < 20) {
        return Math.round(num * 60);
    }
    return Math.round(num);
}

// Helper function to convert column index to letter (A, B, C, ...)
function getColumnLetter(columnIndex) {
    let letter = '';
    while (columnIndex > 0) {
        const remainder = (columnIndex - 1) % 26;
        letter = String.fromCharCode(65 + remainder) + letter;
        columnIndex = Math.floor((columnIndex - 1) / 26);
    }
    return letter;
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node approve-athlete-pr.js <approve|verify> "Athlete Name"');
        process.exit(1);
    }
    
    const action = args[0].toLowerCase();
    const athleteName = args.slice(1).join(' ');
    
    if (action !== 'approve' && action !== 'verify') {
        console.error('Error: First argument must be "approve" or "verify"');
        process.exit(1);
    }
    
    approveAthlete(athleteName, action).then(result => {
        if (result.success) {
            console.log('\n✅ Operation completed successfully!');
            process.exit(0);
        } else {
            console.error('\n❌ Operation failed.');
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { approveAthlete };