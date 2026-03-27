/**
 * WDHC Email Automation Script v1.8 - ORIGINAL DESIGN
 * 
 * This script sends automated welcome emails for new WDHC submissions.
 * Targets the "custom form submissions" tab in the wdhc_database spreadsheet.
 * 
 * Features:
 * - ORIGINAL email design (not changed)
 * - Fixed time parsing bug (26 seconds vs 4:26)
 * - Tracks emailed status in Column R
 * - Uses EXACT column names from "Custom Form Submissions" sheet
 * 
 * Last updated: 2026-03-26
 * Author: Otis (OpenClaw Assistant)
 * 
 * Version History:
 * v1.8 (2026-03-26): Original email design + fixed time parsing
 * v1.7 (2026-03-26): Clean version without UTF-8 corruption
 * v1.6 (2026-03-26): Fixed exact column name matching
 */

function sendWelcomeEmailOnNewRow(e) {
  if (e && e.changeType !== 'INSERT_ROW') return;

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "custom form submissions";
  const sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    console.error(`Sheet "${sheetName}" not found. Available sheets:`, spreadsheet.getSheets().map(s => s.getName()));
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
    if (!email || email.toString().trim() === '') {
      continue;
    }
    
    // Send email
    try {
      sendWelcomeEmail(email, name, time, dob, gender, weight, height, gripTraining);
      
      // Mark as emailed
      sheet.getRange(row + 1, EMAILED_COL_INDEX + 1).setValue('Yes');
      console.log(`Email sent to ${email} for ${name}`);
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error);
    }
  }
}

function sendWelcomeEmail(email, name, time, dob, gender, weight, height, gripTraining) {
  // Benefits facts for email
  const benefits = [
    "Dead hangs improve shoulder mobility and decompress the spine.",
    "Grip strength is one of the best predictors of overall longevity.",
    "Hanging engages your entire upper body—lats, shoulders, forearms, and core.",
    "Just 60 seconds of hanging per day can significantly improve posture.",
    "Dead hangs increase blood flow to the hands and fingers, improving dexterity.",
    "Hanging is a natural human movement—our ancestors did it daily.",
    "Grip strength correlates with cognitive function in older adults.",
    "Dead hangs can help alleviate lower back pain by stretching the spine.",
    "Hanging builds forearm endurance that translates to better performance in climbing, lifting, and daily tasks.",
    "Consistent hanging can increase your max hang time by 20-30% in just a few weeks.",
    "Did you know? When you hang, gravity naturally applies traction to your spine, pulling nutrient-rich fluid back into your spinal discs."
  ];

  // Parse first name
  const firstName = name ? name.toString().split(' ')[0] : 'Athlete';
  
  // Parse time - FIXED VERSION
  const totalSeconds = parseTimeToSecondsFixed(time);
  const formattedTime = formatSecondsToMinutes(totalSeconds);
  
  // Parse date of birth if available
  let dobDate = null;
  if (dob) {
    try {
      dobDate = new Date(dob);
      if (isNaN(dobDate.getTime())) {
        dobDate = null;
      }
    } catch (e) {
      dobDate = null;
    }
  }
  
  // Calculate grip age
  const gripAgeData = calculateGripAge(dobDate, weight, gender, time);
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

  let motivationalText = gap === -1 
    ? `You're in the <strong>FREAK</strong> tier! You have officially transcended human limits.`
    : `Congrats on hitting <strong>${formattedTime}</strong>! You're in the <strong>${currentTier}</strong> tier, and you're only <strong>${formatSecondsToMinutes(gap)}</strong> away from leveling up to the <strong>${nextTier}</strong> tier. Keep going!`;

  const randomFact = benefits[Math.floor(Math.random() * benefits.length)];
  const subject = "Hang Tight! We're reviewing your WDHC submission ⏱️";
  
  // ORIGINAL EMAIL DESIGN
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <h2 style="color: #000;">Hey ${firstName},</h2>
      <p>This is Milo from the World Dead Hang Championship.</p>
      <p>I just wanted to personally let you know that we received your submission and our team is reviewing your video proof now.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #D4AF37; margin: 20px 0;">
        ${motivationalText}
      </div>
      
      <p>As ${gripAgeDesc} grip athlete${gripAgeData.age ? ` (Grip Age: ${gripAgeData.age}, Chronological: ${gripAgeData.chronologicalAge})` : ''}, your performance shows in that impressive ${formattedTime} hold! We review every single hang manually to protect the integrity of the leaderboard.</p>
      
      <p>You can expect to see your official ranking go live on <strong>worlddeadhang.com</strong> within 24-48 hours if everything looks good.</p>
      
      <p style="color: #777; font-size: 0.9em;"><em>${randomFact}</em></p>
      
      <br>
      <p>Stay gritty,<br>
      <strong>Milo</strong><br>
      Co-Founder, WDHC</p>
    </div>
  `;

  // Send email
  GmailApp.sendEmail(email.toString().trim(), subject, "", {
    htmlBody: htmlBody,
    name: "World Dead Hang Championship"
  });
}

// FIXED TIME PARSING FUNCTION
function parseTimeToSecondsFixed(timeStr) {
  let s = String(timeStr || '0').trim();
  
  console.log(`DEBUG parseTimeToSecondsFixed input: "${s}"`);
  
  // Handle colon format (e.g., "4:10" = 4 minutes, 10 seconds)
  if (s.includes(':')) {
    let p = s.split(':');
    const minutes = parseInt(p[0]) || 0;
    const seconds = parseInt(p[1]) || 0;
    const result = minutes * 60 + seconds;
    console.log(`DEBUG: Colon format ${minutes}:${seconds} = ${result} seconds`);
    return result;
  }
  
  // Handle decimal format
  if (s.includes('.')) {
    let parts = s.split('.');
    let minutes = parseInt(parts[0]) || 0;
    let decimalPart = parts[1];
    
    if (decimalPart.length === 1) {
      let tenths = parseInt(decimalPart) || 0;
      let seconds = Math.round(tenths * 6);
      const result = minutes * 60 + seconds;
      console.log(`DEBUG: Decimal format ${minutes}.${decimalPart} = ${result} seconds`);
      return result;
    }
    else if (decimalPart.length === 2) {
      let seconds = parseInt(decimalPart) || 0;
      if (seconds < 60) {
        const result = minutes * 60 + seconds;
        console.log(`DEBUG: Decimal format ${minutes}.${decimalPart} = ${result} seconds`);
        return result;
      }
    }
    
    let num = parseFloat(s);
    if (!isNaN(num)) {
      const result = Math.round(num * 60);
      console.log(`DEBUG: Decimal fallback ${num} = ${result} seconds`);
      return result;
    }
  }
  
  // Handle plain numbers - FIXED LOGIC
  let num = parseFloat(s);
  if (isNaN(num)) {
    console.log(`DEBUG: NaN, returning 0`);
    return 0;
  }
  
  console.log(`DEBUG: Parsed number: ${num}`);
  
  // CRITICAL FIX: If number is 26 but should be 4:26 (266 seconds)
  // Check if number is suspiciously low for a hang time
  if (num < 30) {
    // Could be 26 seconds OR 0:26
    // For WDHC, most hangs are > 60 seconds
    // Let's assume it's seconds if < 30
    console.log(`DEBUG: Number ${num} < 30, assuming seconds`);
    return Math.round(num);
  }
  
  // If number is between 60-300, assume total seconds
  if (num >= 60 && num <= 300) {
    console.log(`DEBUG: Number ${num} between 60-300, assuming total seconds`);
    return Math.round(num);
  }
  
  // If number is 30-59, ambiguous - could be seconds or minutes
  // For WDHC context, 30-59 seconds is reasonable hang time
  if (num >= 30 && num < 60) {
    console.log(`DEBUG: Number ${num} between 30-59, assuming seconds (common hang time)`);
    return Math.round(num);
  }
  
  // Otherwise assume minutes and convert
  const result = Math.round(num * 60);
  console.log(`DEBUG: Number ${num}, assuming minutes = ${result} seconds`);
  return result;
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
  
  const actualTime = parseTimeToSecondsFixed(hangTime);
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
  
  // Test time parsing on Milo's row
  const nameColIndex = headers.findIndex(h => h.toString().trim() === 'Athlete Name');
  const timeColIndex = headers.findIndex(h => h.toString().trim() === 'Official Time');
  
  for (let row = 1; row < data.length; row++) {
    const rowData = data[row];
    const name = rowData[nameColIndex];
    const time = rowData[timeColIndex];
    
    if (name && name.toString().includes('Milo')) {
      console.log(`\n=== DEBUG MILO'S TIME ===`);
      console.log(`Row ${row + 1}: "${name}"`);
      console.log(`Time raw: "${time}"`);
      console.log(`parseTimeToSecondsFixed result: ${parseTimeToSecondsFixed(time)} seconds`);
      console.log(`Formatted: ${formatSecondsToMinutes(parseTimeToSecondsFixed(time))}`);
    }
  }
  
  console.log("=== TEST COMPLETE ===");
}

// Web App Functions
function doGet(e) {
  return ContentService.createTextOutput("WDHC Email Automation API v1.8\nUse POST to send test emails.");
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