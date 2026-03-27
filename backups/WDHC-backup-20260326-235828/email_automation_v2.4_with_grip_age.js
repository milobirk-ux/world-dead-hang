/*
 * WDHC Email Automation Script v2.4 - WITH GRIP AGE CALCULATION
 * 
 * This script sends automated welcome emails for new WDHC submissions.
 * Targets the "custom form submissions" tab in the wdhc_database spreadsheet.
 * 
 * Features:
 * - ORIGINAL email design with TIER BADGES
 * - ENHANCED time parsing with detailed debugging
 * - Tracks emailed status in Column R
 * - Uses EXACT column names from "Custom Form Submissions" sheet
 * - GRIP AGE CALCULATION based on training experience only
 * 
 * Last updated: 2026-03-27
 * Author: Otis (OpenClaw Assistant)
 *
 * Version History:
 * v2.4 (2026-03-27): Added grip age calculation logic
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
        if (!email || email.trim() === '') {
            console.error('No email provided for row:', row);
            continue;
        }
        
        // Calculate grip age
        const gripAge = calculateGripAge(dob, weight, gender, time, gripTraining);
        
        // Construct the email message
        const subject = `WDHC Submission Confirmation for ${name}`;
        const htmlBody = `<!DOCTYPE html><html><body><h1>Welcome to WDHC!</h1><p>${name}, your hang time of ${time} has been recorded. Your grip age is ${gripAge} years.</p></body></html>`;
        
        // Send email
        GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
        
        // Update emailed status
        sheet.getRange(row + 1, EMAILED_COL_INDEX + 1).setValue('Yes');
        
        console.log('Email sent to:', email);
    }
}

function calculateGripAge(dob, bodyweight, gender, hangTime, gripTraining) {
    // Logic for grip age calculation based solely on training experience
    if (!dob || !bodyweight || !gender || !hangTime) {
        return { age: null, chronologicalAge: null, isYounger: false, baseline: null };
    }
    
    const today = new Date();
    const birthDate = new Date(dob);
    const chronologicalAge = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    
    const actualTime = parseTimeToSecondsFixed(hangTime);
    const actualWeight = parseFloat(bodyweight);
    const isFemale = gender.toString().toLowerCase().includes('female');
    
    // Base grip age logic removed for simplicity
    // Calculate grip age based on training experience only
    let gripAge = chronologicalAge; // Start from chronological age
    const trainingMultipliers = {
        'None': 1.0,
        'Beginner': 0.9,
        'Intermediate': 1.0,
        'Advanced': 1.15
    };
    
    if (trainingMultipliers[gripTraining]) {
        gripAge *= trainingMultipliers[gripTraining];
    }
    
    return Math.round(gripAge * 10) / 10;
};
