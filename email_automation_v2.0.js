/**
 * WDHC Email Automation Script v2.0 - ORIGINAL DESIGN
 * 
 * This script sends automated welcome emails for new WDHC submissions.
 * Targets the "custom form submissions" tab in the wdhc_database spreadsheet.
 * 
 * Features:
 * - ORIGINAL email design (not changed)
 * - Fixed time parsing bug (26 seconds vs 4:26)
 * - Tracks emailed status in Column R
 * - Uses EXACT column names from "Custom Form Submissions" sheet
 * 
 * Last updated: 2026-03-26
 * Author: Otis (OpenClaw Assistant)
 * 
 * Version History:
 * v2.0 (2026-03-26): Complete script with all functions
 * v1.9 (2026-03-26): Original email design + fixed time parsing
 * v1.8 (2026-03-26): Clean version without UTF-8 corruption
 * v1.7 (2026-03-26): Fixed exact column name matching
 */

function sendWelcomeEmailOnNewRow(e) {
    if (e && e.changeType !== 'INSERT_ROW') return;

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "custom form submissions";
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
        console.error(`Sheet "${sheetName}" not found. Available sheets: ${spreadsheet.getSheets().map(s => s.getName())}`);
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
        console.error(`Missing required columns: ${missingColumns.join(', ')}`);
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
            sendWelcomeEmail(email, name, time, dob, gender, weight, height, gripTraining);
            
            // Mark as emailed
            sheet.getRange(row + 1, EMAILED_COL_INDEX + 1).setValue('Yes');
            console.log(`Email sent to ${email} for ${name}`);
        } catch (error) {
            console.error(`Failed to send email to ${email}:`, error);
        }
    }
}

function sendWelcomeEmail(email, name, time, dob, gender, weight, height, gripTraining) {
    // Benefits facts for email
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

    // Parse first name
    const firstName = name ? name.toString().split(' ')[0] : 'Athlete';
    
    // Parse time - FIXED VERSION
    const totalSeconds = parseTimeToSecondsFixed(time);
    const formattedTime = formatSecondsToMinutes(totalSeconds);
    
    // Parse date of birth if available
    let dobDate = null;
    if (dob) {
        try {
            dobDate = new Date(dob);
            if (isNaN(dobDate.getTime())) {
                dobDate = null;
            }
        } catch (e) {
            dobDate = null;
        }
    }
    
    // Calculate grip age
    const gripAgeData = calculateGripAge(dobDate, weight, gender, time);
    const gripAgeDesc = getGripAgeDescription(gripAgeData);
    
    // Determine tier
    let currentTier = "";
    let nextTier = "";
    let gap = 0;

    if (totalSeconds >= 360) {
        currentTier = "Freak"; gap = -1;
    } else if (totalSeconds >= 240) {
        currentTier = "Legend"; nextTier = "Freak"; gap = 360 - totalSeconds;
    } else if (totalSeconds >= 180) {
        currentTier = "Elite"; nextTier = "Legend"; gap = 240 - totalSeconds;
    } else if (totalSeconds >= 120) {
        currentTier = "Pro"; nextTier = "Elite"; gap = 180 - totalSeconds;
    } else if (totalSeconds >= 60) {
        currentTier = "Contender"; nextTier = "Pro"; gap = 120 - totalSeconds;
    } else {
        currentTier = "Challenger"; nextTier = "Contender"; gap = 60 - totalSeconds;
    }

    let motivationalText = gap === -1 
        ? `You're in the <strong>FREAK</strong> tier! You have officially transcended human limits.`
        : `Congrats on hitting <strong>${formattedTime}</strong>! You're in the <strong>${currentTier}</strong> tier, and you're only <strong>${formatSecondsToMinutes(gap)}</strong> away from leveling up to the <strong>${nextTier}</strong> tier. Keep going!`;

    const randomFact = benefits[Math.floor(Math.random() * benefits.length)];
    const subject = "Hang Tight! We're reviewing your WDHC submission ⏱️";
    
    // ORIGINAL EMAIL DESIGN
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h2 style="color: #000;">Hey ${firstName},</h2>
        <p>This is Milo from the World Dead Hang Championship.</p>
        <p>I just wanted to personally let you know that we received your submission and our team is reviewing your video proof now.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #D4AF37; margin: 20px 0;">
            ${motivationalText}
        </div>
        
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
    GmailApp.sendEmail(email.toString().trim(), subject, "", {
        htmlBody: htmlBody,
        name: "World Dead Hang Championship"
    });
}

// Helper functions
function parseTimeToSecondsFixed(time) {
    if (!time) return 0;
    
    const timeStr = time.toString().trim();
    
    // Handle empty string
    if (timeStr === '') return 0;
    
    // Handle format like "4:26" (minutes:seconds)
    if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            const minutes = parseInt(parts[0]) || 0;
            const seconds = parseInt(parts[1]) || 0;
            return minutes * 60 + seconds;
        }
    }
    
    // Handle format like "4.26" (minutes.seconds)
    if (timeStr.includes('.')) {
        const parts = timeStr.split('.');
        if (parts.length === 2) {
            const minutes = parseInt(parts[0]) || 0;
            const seconds = parseInt(parts[1]) || 0;
            return minutes * 60 + seconds;
        }
    }
    
    // Handle format like "266" (seconds only)
    const asNumber = parseFloat(timeStr);
    if (!isNaN(asNumber)) {
        // If it's less than 100, assume it's seconds
        if (asNumber < 100) {
            return asNumber;
        }
        // Otherwise assume it's already in seconds
        return asNumber;
    }
    
    return 0;
}

function formatSecondsToMinutes(seconds) {
    if (seconds <= 0) return "0:00";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function calculateGripAge(dob, weight, gender, time) {
    // Default values
    const result = {
        age: null,
        chronologicalAge: null,
        description: "an impressive"
    };
    
    if (!dob) return result;
    
    try {
        const birthDate = new Date(dob);
        const today = new Date();
        
        // Calculate chronological age
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        result.chronologicalAge = age;
        
        // Calculate grip age based on performance
        const totalSeconds = parseTimeToSecondsFixed(time);
        
        if (totalSeconds >= 300) {
            result.age = Math.max(age - 15, 18); // Freak level - 15 years younger
            result.description = "a freakishly strong";
        } else if (totalSeconds >= 240) {
            result.age = Math.max(age - 10, 18); // Legend level - 10 years younger
            result.description = "a legendary";
        } else if (totalSeconds >= 180) {
            result.age = Math.max(age - 7, 18); // Elite level - 7 years younger
            result.description = "an elite";
        } else if (totalSeconds >= 120) {
            result.age = Math.max(age - 5, 18); // Pro level - 5 years younger
            result.description = "a professional";
        } else if (totalSeconds >= 60) {
            result.age = Math.max(age - 3, 18); // Contender level - 3 years younger
            result.description = "a promising";
        } else {
            result.age = age; // Challenger level - same age
            result.description = "a determined";
        }
        
    } catch (e) {
        console.error("Error calculating grip age:", e);
    }
    
    return result;
}

function getGripAgeDescription(gripAgeData) {
    return gripAgeData.description;
}

// Test function
function testEmailAutomation() {
    // Test with sample data
    const testEmail = "test@example.com";
    const testName = "Test Athlete";
    const testTime = "4:26";
    const testDob = "1990-01-01";
    const testGender = "Male";
    const testWeight = 180;
    const testHeight = 72;
    const testGripTraining = "2 years";
    
    console.log("Testing email automation...");
    console.log("Time parsing test:", parseTimeToSecondsFixed(testTime));
    console.log("Formatted time:", formatSecondsToMinutes(parseTimeToSecondsFixed(testTime)));
    
    const gripAge = calculateGripAge(new Date(testDob), testWeight, testGender, testTime);
    console.log("Grip age calculation:", gripAge);
    
    // Uncomment to send actual test email
    // sendWelcomeEmail(testEmail, testName, testTime, testDob, testGender, testWeight, testHeight, testGripTraining);
    console.log("Test completed (email not sent in test mode)");
}

// Install trigger
function installTrigger() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "custom form submissions";
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
        console.error(`Sheet "${sheetName}" not found.`);
        return;
    }
    
    // Remove existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
        if (trigger.getHandlerFunction() === 'sendWelcomeEmailOnNewRow') {
            ScriptApp.deleteTrigger(trigger);
        }
    });
    
    // Create new trigger
    ScriptApp.newTrigger('sendWelcomeEmailOnNewRow')
        .forSpreadsheet(spreadsheet)
        .onChange()
        .create();
    
    console.log("Trigger installed successfully for sendWelcomeEmailOnNewRow");
}

// Uninstall trigger
function uninstallTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    let removed = 0;
    
    triggers.forEach(trigger => {
        if (trigger.getHandlerFunction() === 'sendWelcomeEmailOnNewRow') {
            ScriptApp.deleteTrigger(trigger);
            removed++;
        }
    });
    
    console.log(`Removed ${removed} trigger(s) for sendWelcomeEmailOnNewRow`);
}