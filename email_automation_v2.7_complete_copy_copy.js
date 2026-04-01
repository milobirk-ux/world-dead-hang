/*
 * WDHC Email Automation Script v2.7 - SIMPLIFIED GRIP AGE CALCULATION
 * 
 * This script sends automated welcome emails for new WDHC submissions.
 * Targets the "custom form submissions" tab in the wdhc_database spreadsheet.
 * 
 * Features:
 * - ORIGINAL email design with TIER BADGES
 * - ENHANCED time parsing with detailed debugging
 * - Tracks emailed status in Column R
 * - Uses EXACT column names from "Custom Form Submissions" sheet
 * - SIMPLIFIED grip age calculation with GRIP TRAINING EXPERIENCE ONLY
 * - Web app API endpoints
 * - TIER BADGES matching website design
 * - MINIMUM AGE: 18 (was 16)
 * - GRIP TRAINING LEVELS MATCH FORM EXACTLY
 * 
 * Last updated: 2026-03-26
 * Author: Otis (OpenClaw Assistant)
 * 
 * Version History:
 * v2.3 (2026-03-26): Simplified grip age calculation - height removed, grip training matches form exactly
 * v2.2 (2026-03-26): Enhanced grip age calculation with height + grip training experience, minimum age 18
 * v2.1 (2026-03-26): Added tier badges matching website design
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
    
    // Calculate grip age - NOW INCLUDES GRIP TRAINING EXPERIENCE (HEIGHT REMOVED)
    const gripAgeData = calculateGripAge(dobDate, weight, gender, time, gripTraining);
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

    // Generate tier badges HTML
    const currentTierBadge = getTierBadgeHTML(currentTier);
    const nextTierBadge = gap === -1 ? "" : getTierBadgeHTML(nextTier);
    
    let motivationalText = "";
    if (gap === -1) {
        motivationalText = `You're in the ${currentTierBadge} tier! You have officially transcended human limits.`;
    } else {
        motivationalText = `Congrats on hitting <strong>${formattedTime}</strong>! You're in the ${currentTierBadge} tier, and you're only <strong>${formatSecondsToMinutes(gap)}</strong> away from leveling up to the ${nextTierBadge} tier. Keep going!`;
    }

    const randomFact = benefits[Math.floor(Math.random() * benefits.length)];
    const subject = "Hang Tight! We're reviewing your WDHC submission ⏱️";
    
    // ORIGINAL EMAIL DESIGN WITH TIER BADGES
    const htmlBody = `
    <div style=\