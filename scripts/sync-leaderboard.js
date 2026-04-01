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
        console.log("Authenticating and reading from Custom Form Submissions sheet...");
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Custom Form Submissions!A:ZZ',
        });

        let rows = response.data.values;
        if (!rows || rows.length <= 1) {
            throw new Error("No submissions found in the Custom Form Submissions sheet.");
        }

        const headers = rows.shift();
        
        // Custom Form Submissions sheet column indices
        const nameIndex = headers.indexOf('Athlete Name'); // 2
        const timeIndex = headers.indexOf('Official Time'); // 12
        const videoIndex = headers.indexOf('Video Proof URL'); // 13
        const categoryIndex = headers.indexOf('Gender'); // 7
        const locationIndex = headers.indexOf('City/State'); // 4
        const dateIndex = headers.indexOf('Attempt Date'); // 11
        const backgroundIndex = headers.indexOf('Grip Training Experience'); // 10
        const verifiedIndex = headers.indexOf('Verified'); // changed from PR Badge
        const approvedIndex = headers.indexOf('Approved'); // changed from Emailed

        // 2. Process rows into athlete data
        console.log("Processing submissions...");
        const athletesData = {};

        rows.forEach((row, i) => {
            // Skip if not approved/emailed
            if (approvedIndex !== -1 && row[approvedIndex] !== 'Yes') {
                return;
            }

            const name = row[nameIndex];
            const time = row[timeIndex];
            const date = row[dateIndex] || '1970-01-01';
            
            if (!name || !time) return;

            // Parse time to seconds for comparison
            const newTimeSeconds = parseTime(time);
            
            if (!athletesData[name]) {
                athletesData[name] = {
                    id: i + 1,
                    name: name,
                    category: row[categoryIndex] || 'Unknown',
                    background: backgroundIndex !== -1 && row[backgroundIndex] ? row[backgroundIndex] : "N/A",
                    location: row[locationIndex] ? row[locationIndex] : "Unknown",
                    currentPR: "0:00",
                    prCount: 0,
                    lastAttempt: "1970-01-01",
                    video: "#",
                    verified: verifiedIndex !== -1 && row[verifiedIndex] === 'Yes',
                    history: []
                };
            }

            const currentPRSeconds = parseTime(athletesData[name].currentPR);
            
            if (newTimeSeconds > currentPRSeconds) {
                athletesData[name].currentPR = time;
                athletesData[name].lastAttempt = date;
                athletesData[name].video = row[videoIndex] || "#";
            }
            
            athletesData[name].prCount += 1;
            athletesData[name].history.push({ date: date, time: time });
            athletesData[name].history.sort((a, b) => new Date(b.date) - new Date(a.date));
        });
        
        const finalAthletesArray = Object.values(athletesData);

        // 3. Write the new data file
        console.log("Writing leaderboard-data.js file...");
        const newAthletesDataString = `const athletes = ${JSON.stringify(finalAthletesArray, null, 4)};`;
        await fs.writeFile(DATA_FILE_PATH, newAthletesDataString, 'utf-8');

        console.log("✅✅✅ Leaderboard sync complete! Processed", finalAthletesArray.length, "athletes.");

    } catch (error) {
        console.error("❌ An error occurred during the sync process:", error);
    }
}

function parseTime(timeStr) {
    if (!timeStr) return 0;
    
    // Handle "MM:SS" format
    if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    
    // Handle "M.SS" format (e.g., 4.26 = 4 minutes 26 seconds)
    if (timeStr.includes('.')) {
        const parts = timeStr.split('.');
        const minutes = parseInt(parts[0], 10) || 0;
        const secondsPart = parts[1] || '0';
        
        if (secondsPart.length === 1) {
            // "4.5" = 4 minutes 30 seconds
            return minutes * 60 + (parseInt(secondsPart) * 6);
        } else if (secondsPart.length === 2) {
            // "4.26" = 4 minutes 26 seconds
            return minutes * 60 + parseInt(secondsPart);
        } else {
            // Fallback: treat as decimal minutes
            const decimalMinutes = parseFloat(timeStr);
            return Math.round(decimalMinutes * 60);
        }
    }
    
    // Try to parse as number
    const num = parseFloat(timeStr);
    if (isNaN(num)) return 0;
    
    // If number is less than 60, assume seconds
    if (num < 60) {
        return Math.round(num);
    }
    
    // Otherwise assume it's already seconds
    return Math.round(num);
}

// Run the sync
syncLeaderboard();