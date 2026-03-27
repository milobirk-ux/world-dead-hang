// CORRECT FIX for Google Apps Script
// The setHeaders method doesn't exist. Use setMimeType only.

// Correct createSuccessResponse function:
function createSuccessResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Correct createErrorResponse function:
function createErrorResponse(message, statusCode = 400) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: message
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Also update the doGet function:
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'OK',
      message: 'WDHC Form Handler is running',
      version: '2.3'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}