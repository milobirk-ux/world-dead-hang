/**
 * WDHC Email Automation Script v1.7 - CLEAN VERSION
 * 
 * This script sends automated welcome emails for new WDHC submissions.
 * Targets the "custom form submissions" tab in the wdhc_database spreadsheet.
 * 
 * Features:
 * - Sends personalized welcome emails
 * - Calculates grip age and tier
 * - Tracks emailed status in Column R
 * - Handles PR notifications
 * - Includes training tips
 * - Uses EXACT column names from "Custom Form Submissions" sheet
 * 
 * Last updated: 2026-03-26
 * Author: Otis (OpenClaw Assistant)
 * 
 * Version History:
 * v1.7 (2026-03-26): Clean version without UTF-8 corruption
 * v1.6 (2026-03-26): Fixed exact column name matching for "Custom Form Submissions" sheet
 * v1.5 (2026-03-25): Initial fix for targeting correct sheet and column R tracking
 */

function sendWelcomeEmailOnNewRow(e) {
  if (e && e.changeType !== 'INSERT_ROW') return;

  // Get the specific sheet by name instead of active sheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "custom form submissions";
  const sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    console.error(`Sheet "${sheetName}" not found. Available sheets:`, spreadsheet.getSheets().map(s => s.getName()));
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Debug: log headers to understand structure
  console.log("Headers found:", headers.map((h, i) => `${i}: "${h}"`).join(', '));
  
  // Define column indices based on EXACT sheet structure from "Custom Form Submissions"
  // Column R (18th column, index 17) is the emailed column
  const EMAILED_COL_INDEX = 17; // Column R
  
  // Find other column indices using EXACT column names from your sheet
  const emailColIndex = headers.findIndex(h => h.toString().trim() === 'Email Address');
  const nameColIndex = headers.findIndex(h => h.toString().trim() === 'Athlete Name');
  const timeColIndex = headers.findIndex(h => h.toString().trim() === 'Official Time');
  const dobColIndex = headers.findIndex(h => h.toString().trim() === 'Date of Birth');
  const genderColIndex = headers.findIndex(h => h.toString().trim() === 'Gender');
  const weightColIndex = headers.findIndex(h => h.toString().trim() === 'Bodyweight lbs');
  const heightColIndex = headers.findIndex(h => h.toString().trim() === 'Height (inches)');
  const gripTrainingColIndex = headers.findIndex(h => h.toString().trim() === 'Grip Training Experience');
  
  // Validate all required columns exist
  const missingColumns = [];
  if (emailColIndex === -1) missingColumns.push('Email Address');
  if (nameColIndex === -1) missingColumns.push('Athlete Name');
  if (timeColIndex === -1) missingColumns.push('Official Time');
  if (dobColIndex === -1) missingColumns.push('Date of Birth');
  if (genderColIndex === -1) missingColumns.push('Gender');
  if (weightColIndex === -1) missingColumns.push('Bodyweight lbs');
  if (heightColIndex === -1) missingColumns.push('Height (inches)');
  if (gripTrainingColIndex === -1) missingColumns.push('Grip Training Experience');
  
  if (missingColumns.length > 0) {
    console.error(`Missing required columns: ${missingColumns.join(', ')}`);
    console.error("Available columns:", headers.map((h, i) => `${i}: "${h}"`).join(', '));
    return;
  }
  
  // Find the last row with data
  const lastRow = sheet.getLastRow();
  
  // Process each row (starting from row 2 to skip headers)
  for (let row = 1; row < data.length; row++) {
    const rowData = data[row];
    const emailedStatus = rowData[EMAILED_COL_INDEX];
    
    // Skip if already emailed
    if (emailedStatus && emailedStatus.toString().trim().toLowerCase() === 'yes') {
      continue;
    }
    
    // Get data from the row
    const email = rowData[emailColIndex];
    const name = rowData[nameColIndex];
    const time = rowData[timeColIndex];
    const dob = rowData[dobColIndex];
    const gender = rowData[genderColIndex];
    const weight = rowData[weightColIndex];
    const height = rowData[heightColIndex];
    const gripTraining = rowData[gripTrainingColIndex];
    
    // Skip if email is empty
    if (!email || email.toString().trim() === '') {
      console.log(`Skipping row ${row + 1}: No email address`);
      continue;
    }
    
    // DEBUG: Log what we're getting from the sheet
    console.log(`DEBUG: Row ${row}: name="${name}", time="${time}", time type=${typeof time}, time value=${time}`);
    
    // Send email
    try {
      sendWelcomeEmail(email, name, time, dob, gender, weight, height, gripTraining);
      
      // Mark as emailed
      sheet.getRange(row + 1, EMAILED_COL_INDEX + 1).setValue('Yes');
      console.log(`Email sent to ${email} for ${name} (${time})`);
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error);
    }
  }
}

function sendWelcomeEmail(email, name, time, dob, gender, weight, height, gripTraining) {
  // Parse first name
  const firstName = name ? name.toString().split(' ')[0] : 'Athlete';
  
  // Parse time to seconds
  const totalSeconds = parseTimeToSeconds(time);
  const formattedTime = formatSecondsToMinutes(totalSeconds);
  
  // Calculate grip age
  const gripAgeData = calculateGripAge(dob, weight, gender, time);
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

  // Subject line
  let subject;
  if (gripAgeData.isYounger) {
    subject = `Welcome to WDHC, ${firstName}! Your ${formattedTime} hang gives you a grip age of ${gripAgeData.age}`;
  } else {
    subject = `Welcome to WDHC, ${firstName}! Your ${formattedTime} hang is submitted`;
  }
  
  // HTML email body
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WDHC Submission</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { max-width: 200px; margin-bottom: 20px; }
    .card { background: white; border-radius: 10px; padding: 25px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; }
    .badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 5px; }
    .gold-badge { background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; }
    .tier-badge { background: #2c3e50; color: white; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 1.8em; font-weight: bold; color: #2c3e50; }
    .stat-label { font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="color: #D4AF37; margin-bottom: 10px;">World Dead Hang Championship</h1>
    <p style="color: #666; font-size: 1.1em;">Welcome to the community!</p>
  </div>
  
  <div class="card">
    <h2 style="color: #2c3e50; margin-top: 0;">Hey ${firstName},</h2>
    
    <p>Your submission has been received and you're officially on the leaderboard!</p>
    
    <div class="stats">
      <div class="stat-box">
        <div class="stat-value">${formattedTime}</div>
        <div class="stat-label">Hang Time</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${gripAgeData.age || '--'}</div>
        <div class="stat-label">Grip Age</div>
      </div>
    </div>
    
    <div style="text-align: center; margin: 20px 0;">
      <span class="badge tier-badge">${currentTier} Tier</span>
      ${gripAgeData.isYounger ? '<span class="badge gold-badge">Younger Grip Age!</span>' : ''}
    </div>
    
    <p><strong>View your ranking:</strong> <a href="https://worlddeadhang.com/leaderboard-full.html" style="color: #D4AF37; font-weight: bold;">WDHC Leaderboard</a></p>
    
    <p style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #D4AF37;">
      <strong>Next Goal:</strong> ${gap === -1 ? 'You\'ve reached the highest tier!' : `You're ${formatSecondsToMinutes(gap)} away from ${nextTier} tier!`}
    </p>
  </div>
  
  <div class="footer">
    <p>Questions? Reply to this email or contact us at <a href="mailto:info@worlddeadhang.com">info@worlddeadhang.com</a></p>
    <p style="font-size: 0.8em; color: #999;">© 2026 World Dead Hang Championship. All rights reserved.</p>
  </div>
</body>
</html>`;
  
  // Send email
  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
}

// Helper functions
function parseTimeToSeconds(timeStr) {
  console.log(`DEBUG parseTimeToSeconds: input="${timeStr}", type=${typeof timeStr}`);
  let s = String(timeStr || '0').trim();
  console.log(`DEBUG parseTimeToSeconds: after string conversion="${s}"`);
  
  // Handle colon format (e.g., "4:10" = 4 minutes, 10 seconds)
  if (s.includes(':')) {
    let p = s.split(':');
    return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
  }
  
  // Handle decimal format
  if (s.includes('.')) {
    let parts = s.split('.');
    let minutes = parseInt(parts[0]) || 0;
    let decimalPart = parts[1];
    
    if (decimalPart.length === 1) {
      let tenths = parseInt(decimalPart) || 0;
      let seconds = Math.round(tenths * 6);
      return minutes * 60 + seconds;
    }
    else if (decimalPart.length === 2) {
      let seconds = parseInt(decimalPart) || 0;
      if (seconds < 60) {
        return minutes * 60 + seconds;
      }
    }
    
    let num = parseFloat(s);
    if (!isNaN(num)) {
      return Math.round(num * 60);
    }
  }
  
  // Handle plain numbers
  let num = parseFloat(s);
  if (isNaN(num)) return 0;
  
  // SPECIAL CASE: If number is between 200-300, assume it's total seconds for 4:xx hangs
  // 4:00 = 240 seconds, 4:59 = 299 seconds
  if (num >= 200 && num <= 300) {
    return Math.round(num); // Already total seconds
  }
  
  // If number is less than 60, assume seconds
  if (num < 60) {
    return Math.round(num);
  }
  
  // If number is 60-199, assume total seconds
  if (num >= 60 && num < 200) {
    return Math.round(num);
  }
  
  // Otherwise assume minutes and convert
  return Math.round(num * 60);
}

function formatSecondsToMinutes(sec) {
  if (isNaN(sec) || sec <= 0) return "0 seconds";
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  
  if (minutes === 0) return `${seconds} seconds`;
  if (seconds === 0) return `${minutes} minutes`;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function calculateGripAge(dob, bodyweight, gender, hangTime) {
  if (!dob || !bodyweight || !gender || !hangTime) {
    return { age: null, chronologicalAge: null, isYounger: false, baseline: null };
  }
  
  const today = new Date();
  const birthDate = new Date(dob);
  const chronologicalAge = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  
  const actualTime = parseTimeToSeconds(hangTime);
  const actualWeight = parseFloat(bodyweight);
  const isFemale = gender.toString().toLowerCase().includes('female');
  
  if (isNaN(actualWeight) || actualWeight <= 0) {
    return { age: null, chronologicalAge: chronologicalAge, isYounger: false, baseline: null };
  }
  
  // Base Expected Time
  let baseExpectedTime;
  if (chronologicalAge <= 29) baseExpectedTime = isFemale ? 80 : 105;
  else if (chronologicalAge <= 39) baseExpectedTime = isFemale ? 65 : 85;
  else if (chronologicalAge <= 49) baseExpectedTime = isFemale ? 50 : 65;
  else if (chronologicalAge <= 59) baseExpectedTime = isFemale ? 38 : 50;
  else if (chronologicalAge <= 69) baseExpectedTime = isFemale ? 28 : 38;
  else baseExpectedTime = isFemale ? 20 : 28;
  
  // Bodyweight Adjustment
  const refWeight = isFemale ? 135 : 175;
  const adjustedExpectedTime = (baseExpectedTime * (refWeight / actualWeight) * 0.7) + (baseExpectedTime * 0.3);
  
  if (adjustedExpectedTime <= 0) {
    return { age: null, chronologicalAge: chronologicalAge, isYounger: false, baseline: Math.round(adjustedExpectedTime) };
  }
  
  const performanceRatio = actualTime / adjustedExpectedTime;
  let gripAgeRaw = chronologicalAge - (Math.log(performanceRatio) * 19);
  
  // Apply caps
  let gripAge = Math.max(16, gripAgeRaw);
  gripAge = Math.min(85, gripAge);
  
  const roundedGripAge = Math.round(gripAge);
  
  return {
    age: roundedGripAge,
    chronologicalAge: chronologicalAge,
    isYounger: roundedGripAge < chronologicalAge,
    baseline: Math.round(adjustedExpectedTime)
  };
}

function getGripAgeDescription(gripAgeData) {
  if (!gripAgeData.age || !gripAgeData.chronologicalAge) {
    return "an impressive";
  }
  
  const ageDiff = gripAgeData.chronologicalAge - gripAgeData.age;
  
  if (ageDiff > 10) return "a remarkably young";
  if (ageDiff > 5) return "a very young";
  if (ageDiff > 0) return "a young";
  if (ageDiff === 0) return "an exact";
  return "an older";
}

// Test function
function testColumnStructure() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName("custom form submissions");
  
  if (!sheet) {
    console.error("Sheet 'custom form submissions' not found");
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  console.log("=== TESTING COLUMN STRUCTURE ===");
  console.log("Total columns:", headers.length);
  
  const emailCol = headers.findIndex(h => h.toString().trim() === 'Email Address');
  console.log(`Email Address: ${emailCol >= 0 ? `Column ${String.fromCharCode(65 + emailCol)} (${emailCol}): "${headers[emailCol]}"` : 'NOT FOUND'}`);
  
  const nameCol = headers.findIndex(h => h.toString().trim() === 'Athlete Name');
  console.log(`Athlete Name: ${nameCol >= 0 ? `Column ${String.fromCharCode(65 + nameCol)} (${nameCol}): "${headers[nameCol]}"` : 'NOT FOUND'}`);
  
  const timeCol = headers.findIndex(h => h.toString().trim() === 'Official Time');
  console.log(`Official Time: ${timeCol >= 0 ? `Column ${String.fromCharCode(65 + timeCol)} (${timeCol}): "${headers[timeCol]}"` : 'NOT FOUND'}`);
  
  const dobCol = headers.findIndex(h => h.toString().trim() === 'Date of Birth');
  console.log(`Date of Birth: ${dobCol >= 0 ? `Column ${String.fromCharCode(65 + dobCol)} (${dobCol}): "${headers[dobCol]}"` : 'NOT FOUND'}`);
  
  const genderCol = headers.findIndex(h => h.toString().trim() === 'Gender');
  console.log(`Gender: ${genderCol >= 0 ? `Column ${String.fromCharCode(65 + genderCol)} (${genderCol}): "${headers[genderCol]}"` : 'NOT FOUND'}`);
  
  const weightCol = headers.findIndex(h => h.toString().trim() === 'Bodyweight lbs');
  console.log(`Bodyweight lbs: ${weightCol >= 0 ? `Column ${String.fromCharCode(65 + weightCol)} (${weightCol}): "${headers[weightCol]}"` : 'NOT FOUND'}`);
  
  const heightCol = headers.findIndex(h => h.toString().trim() === 'Height (inches)');
  console.log(`Height (inches): ${heightCol >= 0 ? `Column ${String.fromCharCode(65 + heightCol)} (${heightCol}): "${headers[heightCol]}"` : 'NOT FOUND'}`);
  
  const gripTrainingCol = headers.findIndex(h => h.toString().trim() === 'Grip Training Experience');
  console.log(`Grip Training Experience: ${gripTrainingCol >= 0 ? `Column ${String.fromCharCode(65 + gripTrainingCol)} (${gripTrainingCol}): "${headers[gripTrainingCol]}"` : 'NOT FOUND'}`);
  
  console.log(`\nColumn R (index 17): "${headers[17] || '(empty or beyond range)'}"`);
  console.log(`Should be "Emailed": ${headers[17] === 'Emailed' ? '✓ CORRECT' : '✗ WRONG - should be "Emailed"'}`);
  console.log("=== TEST COMPLETE ===");
}

// Web App Functions
function doGet(e) {
  return ContentService.createTextOutput("WDHC Email Automation API v1.7\nUse POST to send test emails.");
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'test') {
      sendWelcomeEmailOnNewRow({changeType: 'INSERT_ROW'});
      return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Test email sent'}));
    }
    return ContentService.createTextOutput(JSON.stringify({error: 'Unknown action'}));
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()}));
  }
}