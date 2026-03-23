// WDHC Form Handler - Google Apps Script
// Handles custom HTML form submissions and integrates with email automation

// CORS headers for web app
function doPost(e) {
  try {
    // Parse incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    const validation = validateFormData(data);
    if (!validation.valid) {
      return createErrorResponse(validation.message, 400);
    }
    
    // Get the active sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const headers = sheet.getDataRange().getValues()[0];
    
    // Ensure all required columns exist
    ensureColumnsExist(sheet, headers);
    
    // Map form data to sheet columns
    const rowData = mapFormDataToRow(data, headers);
    
    // Append to sheet
    sheet.appendRow(rowData);
    
    // Get the row number for email triggering
    const lastRow = sheet.getLastRow();
    
    // Trigger email automation (simulate INSERT_ROW event)
    triggerEmailAutomation(sheet, lastRow);
    
    // Log successful submission
    console.log(`✅ Submission recorded for ${data.athleteName} (Row: ${lastRow})`);
    
    // Return success response
    return createSuccessResponse({
      message: 'Submission successful! Check your email for confirmation.',
      submissionId: generateSubmissionId(),
      rowNumber: lastRow
    });
    
  } catch (error) {
    console.error('❌ Form submission error:', error);
    return createErrorResponse(`Server error: ${error.message}`, 500);
  }
}

// GET endpoint for testing
function doGet(e) {
  const html = HtmlService.createHtmlOutput(`
    <h1>WDHC Form Handler</h1>
    <p>Status: ✅ Operational</p>
    <p>Use POST requests to submit form data.</p>
    <p>Last checked: ${new Date().toLocaleString()}</p>
  `);
  return html;
}

// ========== HELPER FUNCTIONS ==========

function validateFormData(data) {
  const required = ['athleteName', 'email', 'dob', 'gender', 'weight', 'hangTime', 'videoUrl'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { valid: false, message: 'Invalid email format' };
  }
  
  // Validate hang time format
  const timeRegex = /^(\d+):([0-5]?\d)$|^(\d+)\.(\d{1,2})$/;
  if (!timeRegex.test(data.hangTime)) {
    return { valid: false, message: 'Invalid time format. Use MM:SS or M.SS' };
  }
  
  // Validate weight
  const weight = parseFloat(data.weight);
  if (isNaN(weight) || weight < 50 || weight > 500) {
    return { valid: false, message: 'Weight must be between 50 and 500 lbs' };
  }
  
  // Validate height if provided
  if (data.height) {
    const height = parseInt(data.height);
    if (isNaN(height) || height < 48 || height > 96) {
      return { valid: false, message: 'Height must be between 48 and 96 inches' };
    }
  }
  
  return { valid: true, message: 'Validation passed' };
}

function ensureColumnsExist(sheet, headers) {
  const requiredColumns = [
    'Timestamp', 'Submission ID', 'Athlete Name', 'Email Address', 
    'Date of Birth', 'Gender', 'Bodyweight lbs', 'Height (inches)',
    'Grip Training Experience', 'Official Time', 'Video Proof URL',
    'Additional Notes', 'Emailed', 'Is PR', 'Previous Best', 'PR Badge'
  ];
  
  let lastCol = headers.length;
  
  requiredColumns.forEach((colName, index) => {
    if (!headers.includes(colName)) {
      // Add missing column
      sheet.getRange(1, lastCol + 1).setValue(colName);
      lastCol++;
    }
  });
  
  // Refresh headers
  return sheet.getDataRange().getValues()[0];
}

function mapFormDataToRow(data, headers) {
  // Create array with empty values for all columns
  const row = new Array(headers.length).fill('');
  
  // Map data to correct column indices
  const columnMap = {
    'Timestamp': new Date().toLocaleString(),
    'Submission ID': generateSubmissionId(),
    'Athlete Name': data.athleteName,
    'Email Address': data.email,
    'Date of Birth': formatDateForSheet(data.dob),
    'Gender': data.gender,
    'Bodyweight lbs': parseFloat(data.weight),
    'Height (inches)': data.height ? parseInt(data.height) : '',
    'Grip Training Experience': data.gripTraining || '',
    'Official Time': data.hangTime,
    'Video Proof URL': data.videoUrl,
    'Additional Notes': data.notes || '',
    'Emailed': 'No', // Will be updated by email automation
    'Is PR': '', // Will be calculated by email automation
    'Previous Best': '', // Will be calculated by email automation
    'PR Badge': '' // Will be calculated by email automation
  };
  
  // Fill row array based on header positions
  headers.forEach((header, index) => {
    if (columnMap.hasOwnProperty(header)) {
      row[index] = columnMap[header];
    }
  });
  
  return row;
}

function formatDateForSheet(dateString) {
  try {
    const date = new Date(dateString);
    // Format as MM/DD/YYYY for Google Sheets
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM/dd/yyyy');
  } catch (e) {
    return dateString;
  }
}

function generateSubmissionId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000);
  return `WDHC-${timestamp}-${random}`;
}

function triggerEmailAutomation(sheet, rowNumber) {
  try {
    // Get the email automation function
    const emailFunction = sendWelcomeEmailOnNewRow;
    
    if (typeof emailFunction === 'function') {
      // Create mock event object
      const mockEvent = {
        changeType: 'INSERT_ROW',
        source: sheet,
        range: sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn())
      };
      
      // Run email automation
      emailFunction(mockEvent);
      console.log(`📧 Email automation triggered for row ${rowNumber}`);
    } else {
      console.log('⚠️ Email automation function not found. Make sure sendWelcomeEmailOnNewRow is defined.');
    }
  } catch (error) {
    console.error('❌ Error triggering email automation:', error);
  }
}

// ========== RESPONSE HELPERS ==========

function createSuccessResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify({
    success: true,
    timestamp: new Date().toISOString(),
    ...data
  }));
  
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Add CORS headers
  const allowedOrigins = [
    'https://worlddeadhang.com',
    'https://*.world-dead-hang.pages.dev',
    'http://localhost:8000'
  ];
  
  // In production, you would check the origin and set appropriate headers
  // For now, allow all origins for testing
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  return output;
}

function createErrorResponse(message, statusCode = 400) {
  const output = ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  }));
  
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  
  return output;
}

// ========== TEST FUNCTIONS ==========

function testFormHandler() {
  const testData = {
    athleteName: 'Test Athlete',
    email: 'test@example.com',
    dob: '1990-01-01',
    gender: 'Male',
    weight: '175',
    height: '70',
    gripTraining: 'Regular',
    hangTime: '4:26',
    videoUrl: 'https://youtube.com/watch?v=test',
    notes: 'Test submission'
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  console.log('🧪 Testing form handler...');
  const result = doPost(mockEvent);
  console.log('Test result:', result.getContent());
}

function setupTestSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  
  // Clear existing data (keep headers)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }
  
  console.log('✅ Test sheet ready. Run testFormHandler() to test.');
}