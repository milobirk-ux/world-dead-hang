const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;

// --- CONFIGURATION ---
const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
const DATA_FILE_PATH = path.join(__dirname, 'leaderboard-data.js');

async function syncLeaderboard() {
    try {
        // 1. Authenticate and Read from Google Sheet
        console.log("Authenticating and reading from Google Sheet...");
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:AK', // Extended to include all columns (A to AK = 37 columns)
        });

        let rows = response.data.values;
        if (!rows || rows.length <= 1) {
            throw new Error("No submissions found in the Google Sheet.");
        }

        const headers = rows.shift();
        
        console.log(`Processing ${rows.length} submissions...`);
        const athletesData = {};
        
        const nameIndex = headers.indexOf('Athlete Name');
        const timeIndex = headers.indexOf('Official Time');
        const videoIndex = headers.indexOf('Video Link (Copy &amp; Paste Unlisted YouTube, Instagram / TIkTok, Google Drive Link)');
        const categoryIndex = headers.indexOf('Division');
        const locationIndex = headers.indexOf('City, State / Country');
        const dateIndex = headers.indexOf('Submitted at');
        const backgroundIndex = headers.indexOf('Occupation / Background');
        const verifiedIndex = headers.indexOf('Verified');
        const prBadgeIndex = headers.indexOf('PR Badge'); // New: PR Badge column
        const approvedIndex = headers.indexOf('Approved');
        
        // Helper function to parse time to seconds
        function parseTimeToSeconds(timeStr) {
            if (!timeStr) return 0;
            const str = String(timeStr).trim();
            
            // Handle MM:SS format (e.g., "4:09")
            if (str.includes(':')) {
                const parts = str.split(':');
                const minutes = parseInt(parts[0]) || 0;
                const seconds = parseInt(parts[1]) || 0;
                return minutes * 60 + seconds;
            }
            
            // Handle decimal format (e.g., "4.26" = 4 minutes 26 seconds, "4.5" = 4 minutes 30 seconds)
            if (str.includes('.')) {
                const parts = str.split('.');
                const minutes = parseInt(parts[0]) || 0;
                const decimalPart = parts[1];
                
                // If decimal part has 2 digits, treat as seconds (e.g., "4.26" = 4 min 26 sec)
                if (decimalPart.length === 2) {
                    const seconds = parseInt(decimalPart) || 0;
                    return minutes * 60 + seconds;
                }
                // If decimal part has 1 digit, treat as fraction of minute (e.g., "4.5" = 4.5 min = 4 min 30 sec)
                else if (decimalPart.length === 1) {
                    const fraction = parseInt(decimalPart) / 10;
                    return Math.round((minutes + fraction) * 60);
                }
                // Default: treat as float
                return Math.round(parseFloat(str) * 60);
            }
            
            // Handle plain number (assume seconds)
            const num = parseFloat(str);
            return isNaN(num) ? 0 : Math.round(num);
        }

        // First pass: Find each athlete's best time and PR status
        const athleteBestTimes = {};
        rows.forEach((row, i) => {
            const name = row[nameIndex];
            const time = row[timeIndex];
            const approved = approvedIndex !== -1 ? row[approvedIndex] === 'Yes' : false;
            const verified = verifiedIndex !== -1 ? row[verifiedIndex] === 'Yes' : false;
            
            if (!name || !time || !approved) return;
            
            const seconds = parseTimeToSeconds(time);
            if (seconds <= 0) return;
            
            if (!athleteBestTimes[name] || seconds > athleteBestTimes[name].seconds) {
                athleteBestTimes[name] = {
                    seconds: seconds,
                    rowIndex: i,
                    hasPRBadge: prBadgeIndex !== -1 ? row[prBadgeIndex] === '🏆 PR' : false,
                    isVerified: verified
                };
            }
        });

        // Second pass: Process only approved submissions
        rows.forEach((row, i) => {
            const name = row[nameIndex];
            const time = row[timeIndex];
            const video = row[videoIndex];
            const category = row[categoryIndex];
            const location = row[locationIndex];
            const date = row[dateIndex];
            const background = backgroundIndex !== -1 ? row[backgroundIndex] : '';
            const approved = approvedIndex !== -1 ? row[approvedIndex] === 'Yes' : false;
            const verified = verifiedIndex !== -1 ? row[verifiedIndex] === 'Yes' : false;
            const hasPRBadge = prBadgeIndex !== -1 ? row[prBadgeIndex] === '🏆 PR' : false;
            
            if (!name || !time || !approved) return;
            
            const seconds = parseTimeToSeconds(time);
            if (seconds <= 0) return;
            
            // Check if this is the athlete's best time
            const isBestTime = athleteBestTimes[name] && athleteBestTimes[name].rowIndex === i;
            
            // Only include best times in leaderboard
            if (!isBestTime) return;
            
            // Get verification status from best time record (preserves verification even if PR badge changes)
            const bestTimeRecord = athleteBestTimes[name];
            const preservedVerified = bestTimeRecord ? bestTimeRecord.isVerified : verified;
            
            // Format time for display
            let displayTime;
            if (seconds >= 60) {
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                displayTime = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
            } else {
                displayTime = `0:${seconds.toString().padStart(2, '0')}`;
            }
            
            // Create athlete data object
            const athleteData = {
                name: name.trim(),
                time: displayTime,
                seconds: seconds,
                video: video || '',
                category: category || 'Open',
                location: location || '',
                date: date ? new Date(date).toISOString().split('T')[0] : '',
                background: background || '',
                verified: preservedVerified, // Use preserved verification status
                prBadge: hasPRBadge, // Include PR badge status
                isPR: hasPRBadge // Alias for compatibility
            };
            
            // Store in athletesData object (keyed by name for deduplication)
            athletesData[name.trim()] = athleteData;
        });

        // Convert to array and sort by time (descending - longest first)
        const athletesArray = Object.values(athletesData);
        athletesArray.sort((a, b) => b.seconds - a.seconds);
        
        console.log(`Found ${athletesArray.length} approved athletes for leaderboard.`);
        
        // Generate JavaScript data file
        const jsContent = `// Auto-generated leaderboard data - DO NOT EDIT MANUALLY
// Generated: ${new Date().toISOString()}
// Source: Google Sheets WDHC Submissions

const leaderboardData = ${JSON.stringify(athletesArray, null, 2)};

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = leaderboardData;
}

// For browser use
if (typeof window !== 'undefined') {
    window.leaderboardData = leaderboardData;
}`;

        await fs.writeFile(DATA_FILE_PATH, jsContent, 'utf8');
        console.log(`✅ Leaderboard data saved to ${DATA_FILE_PATH}`);
        console.log(`📊 Total athletes: ${athletesArray.length}`);
        console.log(`🏆 Athletes with PR badges: ${athletesArray.filter(a => a.prBadge).length}`);
        
        return athletesArray;
        
    } catch (error) {
        console.error('❌ Error syncing leaderboard:', error.message);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    syncLeaderboard().catch(console.error);
}

module.exports = { syncLeaderboard };