/**
 * WDHC Email Automation Script v2.6 - COMPLETE
 *
 * This script handles automated welcome emails for new WDHC submissions.
 * Targets the "custom form submissions" tab in the wdhc_database spreadsheet.
 *
 * Features:
 * - Original email design
 * - Enhanced time parsing
 * - Tracks emailed status in Column R
 * - Uses exact column names from "Custom Form Submissions" sheet
 *
 * Last updated: 2026-03-26
 * Author: Otis (OpenClaw Assistant)
 *
 * Version History:
 * v2.6 (2026-03-26): Complete script
 */

function doGet() {
    return ContentService.createTextOutput(JSON.stringify({
        status: 'OK',
        message: 'WDHC Email Automation v2.6 is running',
        version: '2.6'
    })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        
        // Validate
        const validation = validateFormData(data);
        if (!validation.valid) {
            return createErrorResponse(validation.message, 400);
        }
        
        // Get sheet
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('Custom Form Submissions');
        if (!sheet) return createErrorResponse('Custom Form Submissions sheet not found', 500);
        
        // Add row
        const rowData = createRowData(data);
        sheet.appendRow(rowData);
        
        // Trigger email
        const lastRow = sheet.getLastRow();
        triggerEmailAutomation(sheet, lastRow);
        
        return createSuccessResponse({
            success: true,
            message: 'Submission successful! Check your email.',
            submissionId: 'WDHC-' + new Date().getTime()
        });
 \n    } catch (error) {
        return createErrorResponse('Server error: ' + error.message, 500);
    }
}

function createRowData(data) {
    const now = new Date();
    return [
        now.toISOString(), // Timestamp
        data.athleteName,
        data.email,
        data.cityState,
        data.country,
        data.dob,
        data.gender,
        parseFloat(data.weight),
        parseFloat(data.height),
        null,
        data.gripTraining,
        data.attemptDate,
        data.hangTime,
        data.videoUrl,
        data.hearAbout,
        data.consent ? 'Yes' : 'No'
    ];
}

function createSuccessResponse(data) {
    const output = ContentService.createTextOutput(JSON.stringify(data));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
}

function createErrorResponse(message, statusCode = 400) {
    const output = ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: message
    }));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
}

function triggerEmailAutomation(sheet, row) {
    // This function triggers the email automation
    // We'll call a modified version of sendWelcomeEmailOnNewRow that accepts sheet and row
    try {
        sendEmailForRow(sheet, row);
    } catch (error) {
        console.error('Email automation failed:', error);
        console.error('Error details:', error.toString());
        console.error('Stack:', error.stack);
    }
}

function sendEmailForRow(sheet, rowNumber) {
    try {
        const sheetName = sheet.getName();
        
        // Only process Custom Form Submissions sheet
        if (sheetName !== 'Custom Form Submissions') return;