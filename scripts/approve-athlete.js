const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const KEYFILE_PATH = path.join(__dirname, '..', 'credentials', 'google-service-account.json');

async function approveAthlete(athleteName) {
    try {
        console.log(`Authenticating with write permissions to approve '${athleteName}'...`);
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Read-write scope
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Read all data to find the athlete
        console.log("Reading all submissions...");
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:Z',
        });

        let rows = response.data.values || [];
        if (rows.length === 0) {
            throw new Error("No data found in the Google Sheet.");
        }

        const headers = rows.shift(); // Get headers
        const nameIndex = headers.indexOf('Athlete Name');
        const approvedIndex = headers.indexOf('Approved');
        const dateIndex = headers.indexOf('Submitted at');

        if (nameIndex === -1 || approvedIndex === -1 || dateIndex === -1) {
            throw new Error("Required columns (Athlete Name, Approved, Submitted at) not found.");
        }

        // Find all unapproved submissions for the athlete
        const unapprovedSubmissions = [];
        rows.forEach((row, rowIndex) => {
            if (row[nameIndex] && row[nameIndex].toLowerCase() === athleteName.toLowerCase() && (!row[approvedIndex] || row[approvedIndex].toLowerCase() !== 'yes')) {
                unapprovedSubmissions.push({
                    row: row,
                    sheetRowIndex: rowIndex + 2, // +2 because headers were shifted and sheets are 1-indexed
                    submittedAt: new Date(row[dateIndex]),
                });
            }
        });

        if (unapprovedSubmissions.length === 0) {
            console.log(`'${athleteName}' is already approved or no pending submissions found.`);
            return;
        }

        // Sort to find the most recent one
        unapprovedSubmissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
        const mostRecentUnapproved = unapprovedSubmissions[0];

        // Update only the most recent one
        const updates = [
            {
                range: `Sheet1!${String.fromCharCode(65 + approvedIndex)}${mostRecentUnapproved.sheetRowIndex}`,
                values: [['Yes']],
            },
        ];

        console.log(`Approving most recent entry for '${athleteName}' (Row ${mostRecentUnapproved.sheetRowIndex})...`);
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                data: updates,
                valueInputOption: 'USER_ENTERED',
            },
        });
        console.log(`✅ Successfully approved most recent entry for '${athleteName}' in Google Sheet.`);

    } catch (error) {
        console.error("❌ An error occurred during approval:", error.message);
    }
}

// Get athlete name from command line arguments
const athleteNameArg = process.argv[2];
if (!athleteNameArg) {
    console.error("Usage: node approve-athlete.js <AthleteName>");
    process.exit(1);
}

approveAthlete(athleteNameArg);
