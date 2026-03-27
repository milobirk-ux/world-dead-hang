/**
 * WDHC Google Apps Script - Complete Form Handler + Email Automation v2.6
 * For Custom Form Submissions Sheet with Grip Age Calculation
 * Version 2.6: Fixed email automation trigger bug, added direct sheet/row function
 *
 * ========== FORM HANDLER ========== 
 */

function doGet() {
    return ContentService.createTextOutput(JSON.stringify({
        status: 'OK',
        message: 'WDHC Form Handler v2.6 is running',
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
        
    } catch (error) {
        return createErrorResponse('Server error: ' + error.message, 500);
    }
}

function validateFormData(data) {
    const required = ['athleteName', 'email', 'cityState', 'country', 'dob', 'gender', 'weight', 'attemptDate', 'hangTime', 'videoUrl', 'hearAbout', 'consent'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
        return { valid: false, message: 'Missing required fields: ' + missing.join(', ') };
    }
    
    // Validate consent
    if (data.consent !== true) {
        return { valid: false, message: 'Consent must be accepted' };
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return { valid: false, message: 'Invalid email format' };
    }
    
    // Validate hang time format
    const timeRegex = /^(\d+):([0-5]\d)$/;
    if (!timeRegex.test(data.hangTime)) {
        return { valid: false, message: 'Invalid hang time format. Use MM:SS' };
    }
    
    return { valid: true };
}