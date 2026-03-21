// WDHC Email Automation - v1.3 (Simple Email Format)
// Milo's preferred simple email format with fixed time parsing
// Looks for "yes" in Column AF (column 32) and sends email immediately
// Also sends on form submission (new row added)

function sendWelcomeEmailOnNewRow(e) {
  // If triggered by form submission
  if (e && e.changeType === 'FORM_SUBMIT') {
    sendEmailForRow(e.range.getRow());
    return;
  }
  
  // If triggered by manual edit (checking Column AF for "yes")
  if (e && e.changeType === 'EDIT') {
    const sheet = SpreadsheetApp.getActiveSheet();
    const range = e.range;
    
    // Check if edited cell is in Column AF (column 32)
    if (range.getColumn() === 32) {
      const value = range.getValue();
      if (value && value.toString().toLowerCase().trim() === 'yes') {
        sendEmailForRow(range.getRow());
      }
    }
    return;
  }
  
  // Manual trigger: check all rows for "yes" in Column AF
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) { // Start from row 2 (skip header)
    const row = data[i];
    const approvedValue = row[31]; // Column AF is index 31 (0-based)
    
    if (approvedValue && approvedValue.toString().toLowerCase().trim() === 'yes') {
      // Check if already emailed (Column AG = "Emailed")
      const emailedValue = row[32]; // Column AG is index 32
      if (!emailedValue || emailedValue.toString().toLowerCase().trim() !== 'yes') {
        sendEmailForRow(i + 1); // +1 because i is 0-based, rows are 1-based
      }
    }
  }
}

function sendEmailForRow(rowNumber) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Column indices (0-based)
  const emailColIndex = 10; // Column K (Email Address) - index 10
  const nameColIndex = 3;   // Column D (Athlete Name) - index 3
  const timeColIndex = 12;  // Column M (Official Time) - index 12
  const dobColIndex = 7;    // Column H (Date of Birth) - index 7
  const genderColIndex = 8; // Column I (Gender) - index 8
  const weightColIndex = 9; // Column J (Bodyweight lbs) - index 9
  
  const row = data[rowNumber - 1]; // Convert to 0-based
  
  const email = row[emailColIndex];
  const name = row[nameColIndex];
  const timeStr = row[timeColIndex];
  const dob = row[dobColIndex];
  const gender = row[genderColIndex];
  const weight = row[weightColIndex];
  
  // Validate email
  if (!email || !email.toString().includes('@')) {
    Logger.log('Invalid email for row ' + rowNumber + ': ' + email);
    return;
  }
  
  // Parse time correctly (FIXED: 4.26 = 4 minutes 26 seconds)
  const seconds = parseTimeToSeconds(timeStr);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  // Format time display
  let timeDisplay;
  if (minutes > 0 && remainingSeconds > 0) {
    timeDisplay = `${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    timeDisplay = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    timeDisplay = `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }
  
  // Determine tier
  const tier = getTier(seconds);
  
  // Create SIMPLE email content (Milo's preferred format)
  const subject = `Welcome to the World Dead Hang Championship, ${name.split(' ')[0]}!`;
  
  const body = `
Welcome to the World Dead Hang Championship!

Thank you for submitting your dead hang. Your submission has been received and is now part of the global leaderboard.

Your Submission Details:
Time: ${timeDisplay} (${timeStr})
${gender ? `Gender: ${gender}` : ''}
${weight ? `Weight: ${weight} lbs` : ''}

Your Tier: ${tier.name}
Congratulations on hitting ${timeDisplay}! You're in the ${tier.name} tier.

Next Steps:
1. Your submission is now on the live leaderboard: https://world-dead-hang.com
2. Share your achievement on social media with #DeadHang #WDHC
3. Check the official rules for verification requirements: https://world-dead-hang.com/rules.html
4. Train and try to beat your time!

Questions? Reply to this email.

- Milo
World Dead Hang Championship
https://world-dead-hang.com
  `.trim();
  
  // Send email
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body,
      name: "Milo - World Dead Hang Championship"
    });
    
    // Mark as emailed in Column AG (index 32)
    sheet.getRange(rowNumber, 33).setValue('yes'); // Column AG = column 33 (1-based)
    sheet.getRange(rowNumber, 33).setNote('Emailed on ' + new Date().toLocaleString());
    
    Logger.log('Email sent to ' + email + ' for row ' + rowNumber);
  } catch (error) {
    Logger.log('Error sending email to ' + email + ': ' + error.toString());
  }
}

// FIXED TIME PARSING: 4.26 = 4 minutes 26 seconds
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  
  let s = String(timeStr).trim();
  
  // Handle "MM:SS" format
  if (s.includes(':')) {
    const parts = s.split(':');
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  
  // Handle decimal format "M.SS" or "M.S"
  if (s.includes('.')) {
    const parts = s.split('.');
    const minutes = parseInt(parts[0]) || 0;
    const secondsPart = parts[1] || '0';
    
    if (secondsPart.length === 1) {
      // "4.5" = 4 minutes 30 seconds
      return minutes * 60 + (parseInt(secondsPart) * 6);
    } else if (secondsPart.length === 2) {
      // "4.26" = 4 minutes 26 seconds
      return minutes * 60 + parseInt(secondsPart);
    } else {
      // Fallback: treat as decimal minutes
      const decimalMinutes = parseFloat(s);
      return Math.round(decimalMinutes * 60);
    }
  }
  
  // Handle plain number (assume seconds if < 60, minutes if >= 60)
  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  
  if (num < 60) {
    // Likely seconds (e.g., "45" = 45 seconds)
    return Math.round(num);
  } else {
    // Likely seconds already (e.g., "266" = 4:26)
    return Math.round(num);
  }
}

function getTier(seconds) {
  if (seconds >= 360) return { name: 'Freak', color: '#FFD700', min: 360 };
  if (seconds >= 240) return { name: 'Legend', color: '#C0C0C0', min: 240 };
  if (seconds >= 180) return { name: 'Elite', color: '#CD7F32', min: 180 };
  if (seconds >= 120) return { name: 'Pro', color: '#4CAF50', min: 120 };
  if (seconds >= 60) return { name: 'Contender', color: '#2196F3', min: 60 };
  return { name: 'Challenger', color: '#9C27B0', min: 0 };
}

// Test function to verify time parsing
function testTimeParsing() {
  const tests = [
    { input: '4.26', expected: 266 }, // 4 minutes 26 seconds
    { input: '4:26', expected: 266 }, // 4:26 format
    { input: '4.5', expected: 270 },  // 4 minutes 30 seconds
    { input: '4:30', expected: 270 }, // 4:30 format
    { input: '2.15', expected: 135 }, // 2 minutes 15 seconds
    { input: '1.08', expected: 68 },  // 1 minute 8 seconds
    { input: '0.45', expected: 45 },  // 45 seconds
    { input: '45', expected: 45 },    // 45 seconds (no decimal)
    { input: '120', expected: 120 },  // 2 minutes as seconds
  ];
  
  let allPassed = true;
  tests.forEach(test => {
    const result = parseTimeToSeconds(test.input);
    const passed = result === test.expected;
    Logger.log(`${test.input} → ${result} seconds ${passed ? '✅' : '❌ (expected ' + test.expected + ')'}`);
    if (!passed) allPassed = false;
  });
  
  Logger.log(allPassed ? '✅ All time parsing tests passed!' : '❌ Some tests failed');
  return allPassed;
}

// Manual trigger to send all pending emails
function manualSendAllPendingEmails() {
  sendWelcomeEmailOnNewRow();
}

// Setup function to add "Emailed" column if missing
function setupEmailColumns() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Check if Column AG (33) exists and is named "Emailed"
  if (headers.length < 33 || headers[32] !== 'Emailed') {
    sheet.getRange(1, 33).setValue('Emailed');
    sheet.getRange(1, 33).setFontWeight('bold');
    Logger.log('Added "Emailed" column to Column AG');
  }
  
  // Check if Column AF (32) exists and is named "Approved"
  if (headers.length < 32 || headers[31] !== 'Approved') {
    sheet.getRange(1, 32).setValue('Approved');
    sheet.getRange(1, 32).setFontWeight('bold');
    Logger.log('Added "Approved" column to Column AF');
  }
}

// Test email sending with your email
function testEmailToMilo() {
  const testEmail = 'YOUR_EMAIL@gmail.com'; // REPLACE WITH YOUR EMAIL
  try {
    MailApp.sendEmail({
      to: testEmail,
      subject: 'WDHC Email System Test',
      body: 'If you receive this, the email system works!',
      name: "Milo - WDHC Test"
    });
    Logger.log('✅ Test email sent to ' + testEmail);
    return true;
  } catch (error) {
    Logger.log('❌ Error sending test email: ' + error.toString());
    return false;
  }
}

// Test the email format
function testEmailFormat() {
  const testData = {
    name: 'John Doe',
    timeStr: '4.26',
    gender: 'Male',
    weight: '175'
  };
  
  const seconds = parseTimeToSeconds(testData.timeStr);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  let timeDisplay;
  if (minutes > 0 && remainingSeconds > 0) {
    timeDisplay = `${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    timeDisplay = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    timeDisplay = `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }
  
  const tier = getTier(seconds);
  
  const sampleEmail = `
Welcome to the World Dead Hang Championship!

Thank you for submitting your dead hang. Your submission has been received and is now part of the global leaderboard.

Your Submission Details:
Time: ${timeDisplay} (${testData.timeStr})
Gender: ${testData.gender}
Weight: ${testData.weight} lbs

Your Tier: ${tier.name}
Congratulations on hitting ${timeDisplay}! You're in the ${tier.name} tier.

Next Steps:
1. Your submission is now on the live leaderboard: https://world-dead-hang.com
2. Share your achievement on social media with #DeadHang #WDHC
3. Check the official rules for verification requirements: https://world-dead-hang.com/rules.html
4. Train and try to beat your time!

Questions? Reply to this email.

- Milo
World Dead Hang Championship
https://world-dead-hang.com
  `.trim();
  
  Logger.log('=== SAMPLE EMAIL FORMAT ===');
  Logger.log(sampleEmail);
  Logger.log('=== END SAMPLE ===');
  
  return sampleEmail;
}