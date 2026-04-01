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
            range: 'Sheet1!A:Z',
        });

        let rows = response.data.values;
        if (!rows || rows.length <= 1) {
            throw new Error("No submissions found in the Google Sheet.");
        }

        const headers = rows.shift();
        
        console.log(`Processing ${rows.length} submissions...`);
        const athletesData = {};
        
        const nameIndex = headers.indexOf('Athlete Name');
        const timeIndex = headers.indexOf('Total Dead Hang Time');
        const videoIndex = headers.indexOf('Video Proof URL (Paste Unlisted YT, Instagram Or TIkTok)');
        const categoryIndex = headers.indexOf('Division');
        const locationIndex = headers.indexOf('City, State / Country');
        const dateIndex = headers.indexOf('Submitted at');
        const backgroundIndex = headers.findIndex(h => h.toString().toLowerCase().includes('background'));
        const verifiedIndex = headers.indexOf('Verified'); // Will be -1 if not found, which is fine

        rows.forEach((row, i) => {
            const name = row[nameIndex];
            const time = row[timeIndex];
            const date = new Date(row[dateIndex]).toISOString().split('T')[0];

            if (!name || !time) return;

            if (!athletesData[name]) {
                athletesData[name] = {
                    id: i + 1,
                    name: name,
                    category: row[categoryIndex],
                    background: backgroundIndex !== -1 ? row[backgroundIndex] : "N/A",
                    location: row[locationIndex] ? row[locationIndex] : "Unknown",
                    currentPR: "0:00",
                    prCount: 0,
                    lastAttempt: "1970-01-01",
                    video: "#",
                    verified: verifiedIndex !== -1 && row[verifiedIndex] && row[verifiedIndex].toLowerCase() === 'yes',
                    history: []
                };
            }
            
            const currentPRSeconds = parseTime(athletesData[name].currentPR);
            const newTimeSeconds = parseTime(time);

            if (newTimeSeconds > currentPRSeconds) {
                athletesData[name].currentPR = time;
                athletesData[name].lastAttempt = date;
                athletesData[name].video = row[videoIndex];
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

        console.log("✅✅✅ Leaderboard sync complete!");

    } catch (error) {
        console.error("❌ An error occurred during the sync process:", error);
    }
}

function parseTime(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

syncLeaderboard();
