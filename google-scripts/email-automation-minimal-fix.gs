// MINIMAL FIX for CORS error
// Replace lines 129-130 in your current Google Apps Script

// OLD CODE (causing error):
// output.setHeader('Access-Control-Allow-Origin', '*');

// NEW CODE (fixed):
output.setHeaders({
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
});

// Also fix the other setHeader call around line 119

// Complete fixed createSuccessResponse function:
function createSuccessResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeaders({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  });
  return output;
}

// Complete fixed createErrorResponse function:
function createErrorResponse(message, statusCode = 400) {
  const output = ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeaders({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  });
  return output;
}