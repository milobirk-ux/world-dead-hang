/**
 * WDHC Email Automation Script v2.4 - ENHANCED GRIP AGE SECTION
 * 
 * This script sends automated welcome emails for new WDHC submissions.
 * Targets the "custom form submissions" tab in the wdhc_database spreadsheet.
 * 
 * Features:
 * - ORIGINAL email design (not changed)
 * - ENHANCED time parsing with detailed debugging
 * - Tracks emailed status in Column R
 * - Uses EXACT column names from "Custom Form Submissions" sheet
 * - Advanced grip age calculation
 * - Web app API endpoints
 * - Grip Age section styled and enhanced
 * 
 * Last updated: 2026-03-26
 * Author: Otis (OpenClaw Assistant)
 * 
 * Version History:
 * v2.4 (2026-03-26): Enhanced grip age section
 * v2.3 (2026-03-26): Simplified grip age calculation
 * v2.2 (2026-03-26): Complete script with all functions
 * v2.1 (2026-03-26): Added tier badges
 * v2.0 (2026-03-26): Original email design + fixed time parsing
 * v1.8 (2026-03-26): Clean version without UTF-8 corruption
 * v1.7 (2026-03-26): Fixed exact column name matching
 */

function sendWelcomeEmailOnNewRow(e) {
    if (e && e.changeType !== 'INSERT_ROW') return;

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "custom form submissions";
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
        console.error(Sheet "${sheetName}" not found. Available sheets: ${spreadsheet.getSheets().map(s => s.getName())});
        return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Define column indices
    const EMAILED_COL_INDEX = 17; // Column R
    
    // Find column indices using EXACT column names
    const emailColIndex = headers.findIndex(h => h.toString().trim() === 'Email Address');
    const nameColIndex = headers.findIndex(h => h.toString().trim() === 'Athlete Name');
    const timeColIndex = headers.findIndex(h => h.toString().trim() === 'Official Time');
    const dobColIndex = headers.findIndex(h => h.toString().trim() === 'Date of Birth');
    const genderColIndex = headers.findIndex(h => h.toString().trim() === 'Gender');
    const weightColIndex = headers.findIndex(h => h.toString().trim() === 'Bodyweight lbs');
    const heightColIndex = headers.findIndex(h => h.toString().trim() === 'Height (inches)');
    const gripTrainingColIndex = headers.findIndex(h => h.toString().trim() === 'Grip Training Experience');
    
    // Validate columns
    const missingColumns = [];
    if (emailColIndex === -1) missingColumns.push('Email Address');
    if (nameColIndex === -1) missingColumns.push('Athlete Name');
    if (timeColIndex === -1) missingColumns.push('Official Time');
    
    if (missingColumns.length > 0) {
        console.error(Missing required columns: ${missingColumns.join(', ')});
        return;
    }
    
    // Process each row
    for (let row = 1; row < data.length; row++) {
        const rowData = data[row];
        const emailedStatus = rowData[EMAILED_COL_INDEX];
        
        // Skip if already emailed
        if (emailedStatus && emailedStatus.toString().trim().toLowerCase() === 'yes') {
            continue;
        }
        
        // Get data
        const email = rowData[emailColIndex];
        const name = rowData[nameColIndex];
        const time = rowData[timeColIndex];
        const dob = rowData[dobColIndex];
        const gender = rowData[genderColIndex];
        const weight = rowData[weightColIndex];
        const height = rowData[heightColIndex];
        const gripTraining = rowData[gripTrainingColIndex];
        
        // Skip if no email
        if (!email || email.toString().trim() === '') {
            continue;
        }
        
        // Send email
        try {
            const gripAgeHtml = `<div style="border: 2px solid #D4AF37; padding: 15px; border-radius: 5px; margin: 20px 0; background-color: #f9fbe7;">
                <h3 style="color: #8b6914; font-weight: bold;">Grip Age Calculation</h3>
                <p style="font-size: 16px;">Grip Age is determined based on several factors including your age, body weight, and grip training experience. This gives us a clear picture of your grip strength potential without revealing the intricate details of our formula.</p>
                <p style="font-style: italic;">Did you know?</p>
                <p style="color: #444; font-size: 14px;">Dead hangs not only strengthen your grip but also improve shoulder mobility and decompress the spine—essential for overall upper body health!</p>
            </div>`;

            sendWelcomeEmail(email, name, time, dob, gender, weight, height, gripTraining, gripAgeHtml);
            
            // Mark as emailed
            sheet.getRange(row + 1, EMAILED_COL_INDEX + 1).setValue('Yes');
            console.log(`Email sent to ${email} for ${name}`);
        } catch (error) {
            console.error(`Failed to send email to ${email}:`, error);
        }
    }
}

function sendWelcomeEmail(email, name, time, dob, gender, weight, height, gripTraining, gripAgeHtml) {
    const benefits = [
        "Dead hangs improve shoulder mobility and decompress the spine.",
        "Grip strength is one of the best predictors of overall longevity.",
        "Hanging engages your entire upper body—lats, shoulders, forearms, and core.",
        "Just 60 seconds of hanging per day can significantly improve posture.",
        "Dead hangs increase blood flow to the hands and fingers, improving dexterity.",
        "Hanging is a natural human movement—our ancestors did it daily.",
        "Grip strength correlates with cognitive function in older adults.",
        "Dead hangs can help alleviate lower back pain by stretching the spine.",
        "Hanging builds forearm endurance that translates to better performance in climbing, lifting, and daily tasks.",
        "Consistent hanging can increase your max hang time by 20-30% in just a few weeks.",
        "Did you know? When you hang, gravity naturally applies traction to your spine, pulling nutrient-rich fluid back into your spinal discs."
    ];

    const firstName = name ? name.toString().split(' ')[0] : 'Athlete';
    const totalSeconds = parseTimeToSecondsFixed(time);
    const formattedTime = formatSecondsToMinutes(totalSeconds);
    const gripAgeData = calculateGripAge(dob, weight, gender, time, gripTraining);
    const gripAgeDesc = getGripAgeDescription(gripAgeData);

    const subject = "Hang Tight! We're reviewing your WDHC submission ⏱️";
    const randomFact = benefits[Math.floor(Math.random() * benefits.length)];

    // Original email design
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h2 style="color: #000;">Hey ${firstName},</h2>
        <p>This is Milo from the World Dead Hang Championship.</p>
        <p>I just wanted to personally let you know that we received your submission and our team is reviewing your video proof now.</p>

        ${gripAgeHtml}  

        <p>As ${gripAgeDesc} grip athlete${gripAgeData.age ? ` (Grip Age: ${gripAgeData.age}, Chronological: ${gripAgeData.chronologicalAge})` : ''}, your performance shows in that impressive ${formattedTime} hold! We review every single hang manually to protect the integrity of the leaderboard.</p>

        <p>You can expect to see your official ranking go live on <strong>worlddeadhang.com</strong> within 24-48 hours if everything looks good.</p>

        <p style="color: #777; font-size: 0.9em;"><em>${randomFact}</em></p>

        <br>
        <p>Stay gritty,<br>
        <strong>Milo</strong><br>
        Co-Founder, WDHC</p>
    </div>
    `;

    // Send email
    GmailApp.sendEmail(email.toString().trim(), subject, "", { htmlBody: htmlBody, name: "World Dead Hang Championship" });
}