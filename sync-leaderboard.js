const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;

// --- CONFIGURATION ---
const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
const HTML_FILE_PATH = path.join(__dirname, 'index.html');

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
        
        // --- NEW: Approval Workflow ---
        const approvedIndex = headers.indexOf('Approved');
        if (approvedIndex === -1) {
            throw new Error("The 'Approved' column was not found in the Google Sheet.");
        }
        
        const approvedRows = rows.filter(row => row[approvedIndex] && row[approvedIndex].toLowerCase() === 'yes');
        console.log(`Found ${rows.length} total submissions, with ${approvedRows.length} approved.`);

        if (approvedRows.length === 0) {
            console.log("No approved submissions to sync.");
            return;
        }
        // --- END: Approval Workflow ---

        // 2. Process the Data
        console.log(`Processing ${approvedRows.length} approved submissions...`);
        const athletesData = {};
        
        const nameIndex = headers.indexOf('Athlete Name');
        const timeIndex = headers.indexOf('Total Dead Hang Time');
        const videoIndex = headers.indexOf('Video Proof URL (Paste Unlisted YT, Instagram Or TIkTok)');
        const categoryIndex = headers.indexOf('Division');
        const locationIndex = headers.indexOf('City, State / Country');
        const dateIndex = headers.indexOf('Submitted at');

        approvedRows.forEach((row, i) => {
            const name = row[nameIndex];
            const time = row[timeIndex];
            const date = new Date(row[dateIndex]).toISOString().split('T')[0];

            if (!name || !time) return;

            if (!athletesData[name]) {
                athletesData[name] = {
                    id: i + 1,
                    name: name,
                    category: row[categoryIndex],
                    occupation: "Athlete",
                    location: row[locationIndex] ? row[locationIndex].split('/')[0].trim() : "Unknown",
                    country: "🇺🇸",
                    currentPR: "0:00",
                    prCount: 0,
                    lastAttempt: "1970-01-01",
                    video: "#",
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

        // 3. Read the HTML file
        console.log("Reading index.html file...");
        let htmlContent = await fs.readFile(HTML_FILE_PATH, 'utf-8');

        // 4. Inject the new data
        console.log("Injecting new athlete data into HTML...");
        const athletesRegex = /const athletes = \[[\s\S]*?\];/;
        const newAthletesDataString = `const athletes = ${JSON.stringify(finalAthletesArray, null, 4)};`;

        if (!athletesRegex.test(htmlContent)) {
            throw new Error("Could not find 'const athletes' array in the HTML file.");
        }

        htmlContent = htmlContent.replace(athletesRegex, newAthletesDataString);

        // 5. Write the updated HTML
        console.log("Writing updated index.html file...");
        await fs.writeFile(HTML_FILE_PATH, htmlContent, 'utf-8');

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
