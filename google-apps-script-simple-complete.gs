// WDHC Google Apps Script - Complete Form Handler + Email Automation
// For Custom Form Submissions Sheet

// ========== FORM HANDLER ==========
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK',
    message: 'WDHC Form Handler is running',
    version: '2.0'
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
    if (!sheet) return createErrorResponse('Sheet not found', 500);
    
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
  if (missing.length > 0) return { valid: false, message: `Missing: ${missing.join(', ')}` };
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) return { valid: false, message: 'Invalid email' };
  
  // Time validation
  const timeRegex = /^(\d+):([0-5]?\d)$|^(\d+)\.(\d{1,2})$/;
  if (!timeRegex.test(data.hangTime)) return { valid: false, message: 'Invalid time format' };
  
  // Weight validation
  const weight = parseFloat(data.weight);
  if (isNaN(weight) || weight < 50 || weight > 500) return { valid: false, message: 'Weight 50-500 lbs' };
  
  // Height validation
  if (data.height) {
    const height = parseInt(data.height);
    if (isNaN(height) || height < 48 || height > 96) return { valid: false, message: 'Height 48-96 inches' };
  }
  
  // Consent validation
  if (!data.consent) return { valid: false, message: 'Must agree to terms' };
  
  return { valid: true, message: 'OK' };
}

function createRowData(data) {
  return [
    new Date().toLocaleString(), // Timestamp
    'WDHC-' + new Date().getTime() + '-' + Math.floor(Math.random() * 10000), // Submission ID
    data.athleteName,
    data.email,
    data.cityState,
    data.country,
    data.dob,
    data.gender,
    parseFloat(data.weight),
    data.height ? parseInt(data.height) : '',
    data.gripTraining || '',
    data.attemptDate,
    data.hangTime,
    data.videoUrl,
    data.notes || '',
    data.hearAbout,
    data.consent ? 'Yes' : 'No',
    'No', // Emailed
    '', // Is PR
    '', // Previous Best
    ''  // PR Badge
  ];
}

function triggerEmailAutomation(sheet, rowNumber) {
  try {
    // Trigger email function
    sendWelcomeEmailOnNewRow({
      changeType: 'INSERT_ROW',
      source: sheet,
      range: sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn())
    });
  } catch (error) {
    console.log('Email trigger error:', error);
  }
}

function createSuccessResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  return output;
}

function createErrorResponse(message, statusCode = 400) {
  const output = ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  return output;
}

// ========== EMAIL AUTOMATION ==========
function sendWelcomeEmailOnNewRow(e) {
  if (e && e.changeType !== 'INSERT_ROW') return;
  
  const sheet = e.source;
  if (sheet.getName() !== 'Custom Form Submissions') return;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find columns
  const emailCol = headers.findIndex(h => h === 'Email Address');
  const nameCol = headers.findIndex(h => h === 'Athlete Name');
  const timeCol = headers.findIndex(h => h === 'Official Time');
  const dobCol = headers.findIndex(h => h === 'Date of Birth');
  const genderCol = headers.findIndex(h => h === 'Gender');
  const weightCol = headers.findIndex(h => h === 'Bodyweight lbs');
  const heightCol = headers.findIndex(h => h === 'Height (inches)');
  const trainingCol = headers.findIndex(h => h === 'Grip Training Experience');
  const emailedCol = headers.findIndex(h => h === 'Emailed');
  
  if (emailCol === -1 || nameCol === -1) return;
  
  // Process new rows
  for (let i = 1; i < data.length; i++) {
    if (emailedCol !== -1 && data[i][emailedCol] === 'Yes') continue;
    
    const email = data[i][emailCol];
    const name = data[i][nameCol];
    const timeStr = data[i][timeCol] || '';
    const dob = data[i][dobCol] || '';
    const gender = data[i][genderCol] || '';
    const weight = parseFloat(data[i][weightCol]) || 0;
    const height = heightCol !== -1 ? (parseInt(data[i][heightCol]) || null) : null;
    const training = trainingCol !== -1 ? (data[i][trainingCol] || '') : '';
    
    if (!email || !name || !timeStr) continue;
    
    // Calculate grip age
    const seconds = parseTimeToSeconds(timeStr);
    const gripAge = calculateGripAge(seconds, weight, gender, height, training);
    
    // Send email
    sendEmail(email, name, timeStr, gripAge, weight, height, training);
    
    // Mark as emailed
    if (emailedCol !== -1) {
      sheet.getRange(i + 1, emailedCol + 1).setValue('Yes');
    }
  }
}

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
    if (secondsPart.length === 1) return minutes * 60 + (parseInt(secondsPart) * 6);
    if (secondsPart.length === 2) return minutes * 60 + parseInt(secondsPart);
    return Math.round(parseFloat(s) * 60);
  }
  let num = parseFloat(s);
  if (isNaN(num)) return 0;
  return num < 60 ? Math.round(num) : Math.round(num);
}

function calculateGripAge(seconds, weight, gender, height, training) {
  // Base age
  let base = 80;
  if (seconds >= 300) base = 20;
  else if (seconds >= 240) base = 30;
  else if (seconds >= 180) base = 40;
  else if (seconds >= 120) base = 50;
  else if (seconds >= 60) base = 60;
  else if (seconds >= 30) base = 70;
  
  // Adjustments
  let weightAdj = Math.max(0, (200 - weight) / 10);
  let genderAdj = gender === 'Female' ? 5 : 0;
  let heightAdj = 0;
  if (height) {
    const avgHeight = gender === 'Female' ? 64 : 69;
    heightAdj = Math.max(0, (height - avgHeight) / 2);
  }
  
  let trainingAdj = 0;
  if (training) {
    const level = training.toLowerCase();
    if (level.includes('none') || level.includes('first')) trainingAdj = -5;
    else if (level.includes('beginner')) trainingAdj = -3;
    else if (level.includes('advanced') || level.includes('competitor') || level.includes('climber')) trainingAdj = 5;
  }
  
  // Final calculation
  let final = base - weightAdj + genderAdj + heightAdj + trainingAdj;
  return Math.max(20, Math.min(80, Math.round(final)));
}

function sendEmail(email, name, time, gripAge, weight, height, training) {
  const subject = `WDHC Submission: ${name}`;
  
  let html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}
.header{background:#1a1a1a;color:#FFD700;padding:30px;text-align:center;border-radius:10px 10px 0 0}
.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px;border:1px solid #ddd;border-top:none}
.result-box{background:white;border:2px solid #FFD700;border-radius:8px;padding:20px;margin:20px 0;text-align:center}
.grip-age{font-size:48px;font-weight:bold;color:#FFD700;margin:10px 0}
.time{font-size:32px;color:#333;margin:10px 0}
.factor{display:inline-block;background:#f0f0f0;padding:5px 10px;border-radius:5px;margin:2px;font-size:12px}
</style></head>
<body>
<div class="header"><h1>WORLD DEAD HANG CHAMPIONSHIP</h1><p>Submission Confirmation</p></div>
<div class="content">
<h2>Hey ${name},</h2><p>Your submission has been received and is being reviewed.</p>
<div class="result-box">
<h3>YOUR OFFICIAL TIME</h3><div class="time">${time}</div>
<h3>YOUR GRIP AGE</h3><div class="grip-age">${gripAge}</div>
<p>Based on your time, weight, and other factors</p>
</div>
<h3>📊 Submission Details</h3>
<ul>
<li><strong>Name:</strong> ${name}</li>
<li><strong>Time:</strong> ${time}</li>
<li><strong>Weight:</strong> ${weight} lbs</li>
${height ? `<li><strong>Height:</strong> ${height} inches</li>` : ''}
${training ? `<li><strong>Grip Training:</strong> ${training}</li>` : ''}
</ul>
<p>Your submission will appear on the leaderboard after verification (24-48 hours).</p>
<p style="margin-top:30px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;color:#666;text-align:center">
WORLD DEAD HANG CHAMPIONSHIP © 2026 | <a href="https://worlddeadhang.com">worlddeadhang.com</a>
</p>
</div></body></html>`;
  
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: html
    });
  } catch (error) {
    console.log('Email send error:', error);
  }
}