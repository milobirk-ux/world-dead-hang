// ==============================================
// WDHC COMPLETE APPS SCRIPT v2.0
// Form Handler + Email Automation
// For Custom Form Submissions Sheet
// ==============================================

// ==================== FORM HANDLER ====================

// Test endpoint
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK',
    message: 'WDHC Form Handler is running',
    timestamp: new Date().toISOString(),
    version: '2.0'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Main form submission handler
function doPost(e) {
  try {
    // Parse incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    const validation = validateFormData(data);
    if (!validation.valid) {
      return createErrorResponse(validation.message, 400);
    }
    
    // Get the Custom Form Submissions sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Custom Form Submissions');
    
    if (!sheet) {
      return createErrorResponse('Custom Form Submissions sheet not found. Please create a sheet with that name.', 500);
    }
    
    const headers = sheet.getDataRange().getValues()[0];
    
    // Ensure all required columns exist
    ensureColumnsExist(sheet, headers);
    
    // Map form data to sheet columns
    const rowData = mapFormDataToRow(data, headers);
    
    // Append to sheet
    sheet.appendRow(rowData);
    
    // Get the row number for email triggering
    const lastRow = sheet.getLastRow();
    
    // Trigger email automation
    triggerEmailAutomation(sheet, lastRow);
    
    // Log successful submission
    console.log(`✅ Submission recorded for ${data.athleteName} (Row: ${lastRow})`);
    
    // Return success response
    return createSuccessResponse({
      success: true,
      message: 'Submission successful! Check your email for confirmation.',
      submissionId: generateSubmissionId(),
      rowNumber: lastRow,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Form submission error:', error);
    return createErrorResponse(`Server error: ${error.message}`, 500);
  }
}

function validateFormData(data) {
  const required = [
    'athleteName', 'email', 'cityState', 'country', 'dob', 'gender', 
    'weight', 'attemptDate', 'hangTime', 'videoUrl', 'hearAbout', 'consent'
  ];
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
  
  // Validate attempt date
  if (data.attemptDate) {
    const attemptDate = new Date(data.attemptDate);
    if (isNaN(attemptDate.getTime())) {
      return { valid: false, message: 'Invalid attempt date format' };
    }
    
    // Ensure attempt date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (attemptDate > today) {
      return { valid: false, message: 'Attempt date cannot be in the future' };
    }
  }
  
  // Validate consent
  if (!data.consent) {
    return { valid: false, message: 'You must agree to the terms and conditions' };
  }
  
  return { valid: true, message: 'Validation passed' };
}

function ensureColumnsExist(sheet, headers) {
  const requiredColumns = [
    'Timestamp', 'Submission ID', 'Athlete Name', 'Email Address',
    'City/State', 'Country', 'Date of Birth', 'Gender', 'Bodyweight lbs',
    'Height (inches)', 'Grip Training Experience', 'Attempt Date',
    'Official Time', 'Video Proof URL', 'Additional Notes',
    'How did you hear about us?', 'Consent', 'Emailed', 'Is PR',
    'Previous Best', 'PR Badge'
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
    'City/State': data.cityState,
    'Country': data.country,
    'Date of Birth': formatDateForSheet(data.dob),
    'Gender': data.gender,
    'Bodyweight lbs': parseFloat(data.weight),
    'Height (inches)': data.height ? parseInt(data.height) : '',
    'Grip Training Experience': data.gripTraining || '',
    'Attempt Date': formatDateForSheet(data.attemptDate),
    'Official Time': data.hangTime,
    'Video Proof URL': data.videoUrl,
    'Additional Notes': data.notes || '',
    'How did you hear about us?': data.hearAbout,
    'Consent': data.consent ? 'Yes' : 'No',
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

function createSuccessResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // CORS headers
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

// ==================== EMAIL AUTOMATION ====================

function sendWelcomeEmailOnNewRow(e) {
  if (e && e.changeType !== 'INSERT_ROW') return;

  const activeSheet = SpreadsheetApp.getActiveSheet();
  
  // Only process if this is the Custom Form Submissions sheet
  if (activeSheet.getName() !== 'Custom Form Submissions') {
    console.log('⚠️ Not Custom Form Submissions sheet, skipping email automation');
    return;
  }
  
  const data = activeSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find column indices
  const emailColIndex = headers.findIndex(h => h === 'Email Address');
  const nameColIndex = headers.findIndex(h => h === 'Athlete Name');
  const timeColIndex = headers.findIndex(h => h === 'Official Time');
  const dobColIndex = headers.findIndex(h => h === 'Date of Birth');
  const genderColIndex = headers.findIndex(h => h === 'Gender');
  const weightColIndex = headers.findIndex(h => h === 'Bodyweight lbs');
  const heightColIndex = headers.findIndex(h => h === 'Height (inches)');
  const gripTrainingColIndex = headers.findIndex(h => h === 'Grip Training Experience');
  const emailedColIndex = headers.findIndex(h => h === 'Emailed');
  const prColIndex = headers.findIndex(h => h === 'Is PR');
  const previousBestColIndex = headers.findIndex(h => h === 'Previous Best');
  const prBadgeColIndex = headers.findIndex(h => h === 'PR Badge');
  
  if (emailColIndex === -1 || nameColIndex === -1) {
    console.error('❌ Required columns not found');
    return;
  }
  
  // Process new rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip if already emailed
    if (emailedColIndex !== -1 && row[emailedColIndex] === 'Yes') continue;
    
    const email = row[emailColIndex];
    const name = row[nameColIndex];
    const timeStr = row[timeColIndex] || '';
    const dob = row[dobColIndex] || '';
    const gender = row[genderColIndex] || '';
    const weight = parseFloat(row[weightColIndex]) || 0;
    const height = heightColIndex !== -1 ? (parseInt(row[heightColIndex]) || null) : null;
    const gripTraining = gripTrainingColIndex !== -1 ? (row[gripTrainingColIndex] || '') : '';
    
    if (!email || !name || !timeStr) continue;
    
    // Parse time
    const seconds = parseTimeToSeconds(timeStr);
    const formattedTime = formatSecondsToMinutes(seconds);
    
    // Calculate age from DOB
    let age = '--';
    if (dob) {
      try {
        const birthDate = new Date(dob);
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        age = calculatedAge;
      } catch (e) {
        console.log('Could not calculate age from DOB:', dob, e);
      }
    }
    
    // Calculate grip age with enhanced factors
    const gripAgeResult = calculateGripAge(seconds, weight, gender, height, gripTraining);
    
    // Check if this is a PR
    let isPR = false;
    if (prColIndex !== -1 && previousBestColIndex !== -1) {
      const previousBest = row[previousBestColIndex] || '';
      const prevBestSeconds = parseTimeToSeconds(previousBest);
      
      if (seconds > prevBestSeconds) {
        isPR = true;
        // Update previous best
        activeSheet.getRange(i + 1, previousBestColIndex + 1).setValue(timeStr);
        // Mark as PR
        activeSheet.getRange(i + 1, prColIndex + 1).setValue('Yes');
        
        // Add PR badge if enabled
        if (prBadgeColIndex !== -1) {
          activeSheet.getRange(i + 1, prBadgeColIndex + 1).setValue('🏆 PR');
        }
      }
    }
    
    // Send email
    sendConfirmationEmail(email, name, timeStr, formattedTime, age, gender, weight, height, gripTraining, gripAgeResult, isPR);
    
    // Mark as emailed
    if (emailedColIndex !== -1) {
      activeSheet.getRange(i + 1, emailedColIndex + 1).setValue('Yes');
    }
    
    console.log(`📧 Email sent to ${name} (${email})`);
  }
}

// Helper functions for email automation
function parseTimeToSeconds(timeStr) {
  let s = String(timeStr || '0').trim();
  
  if (s.includes(':')) {
    let p = s.split(':');
    return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
  }
  
  if (s.includes('.')) {
    let parts = s.split('.');
    let minutes = parseInt(parts[0]) || 0;
    let secondsPart = parts[1] || '0';
    
    if (secondsPart.length === 1) {
      return minutes * 60 + (parseInt(secondsPart) * 6);
    } else if (secondsPart.length === 2) {
      return minutes * 60 + parseInt(secondsPart);
    } else {
      let decimalMinutes = parseFloat(s);
      return Math.round(decimalMinutes * 60);
    }
  }
  
  let num = parseFloat(s);
  if (isNaN(num)) return 0;
  
  if (num < 60) {
    return Math.round(num);
  }
  
  return Math.round(num);
}

function formatSecondsToMinutes(sec) {
  if (isNaN(sec) || sec <= 0) return "0 seconds";
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  const minText = minutes + (minutes === 1 ? " minute" : " minutes");
  const secText = seconds + (seconds === 1 ? " second" : " seconds");
  if (minutes > 0 && seconds > 0) return minText + " " + secText;
  return minutes > 0 ? minText : secText;
}

function calculateGripAge(seconds, weight, gender, height, gripTraining) {
  // Base grip age calculation
  let baseGripAge;
  
  if (seconds >= 300) {
    baseGripAge = 20;
  } else if (seconds >= 240) {
    baseGripAge = 30;
  } else if (seconds >= 180) {
    baseGripAge = 40;
  } else if (seconds >= 120) {
    baseGripAge = 50;
  } else if (seconds >= 60) {
    baseGripAge = 60;
  } else if (seconds >= 30) {
    baseGripAge = 70;
  } else {
    baseGripAge = 80;
  }
  
  // Weight adjustment (heavier = younger grip age)
  const weightAdjustment = Math.max(0, (200 - weight) / 10);
  
  // Gender adjustment (males typically have stronger grip)
  const genderAdjustment = gender === 'Female' ? 5 : 0;
  
  // Height adjustment (taller = potentially harder due to leverage)
  let heightAdjustment = 0;
  if (height) {
    const avgHeight = gender === 'Female' ? 64 : 69;
    heightAdjustment = Math.max(0, (height - avgHeight) / 2);
  }
  
  // Grip training experience adjustment
  let trainingAdjustment = 0;
  if (gripTraining) {
    const trainingLevel = String(gripTraining).toLowerCase();
    if (trainingLevel.includes('none') || trainingLevel.includes('first')) {
      trainingAdjustment = -5;
    } else if (trainingLevel.includes('beginner')) {
      trainingAdjustment = -3;
    } else if (trainingLevel.includes('intermediate')) {
      trainingAdjustment = 0;
    } else if (trainingLevel.includes('advanced') || trainingLevel.includes('competitor') || trainingLevel.includes('climber')) {
      trainingAdjustment = 5;
    }
  }
  
  // Calculate final grip age
  let finalGripAge = baseGripAge - weightAdjust