/**
 * WDHC Email Automation Script v1.6
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
 * v1.6 (2026-03-26): Fixed exact column name matching for "Custom Form Submissions" sheet
 * v1.5 (2026-03-25): Initial fix for targeting correct sheet and column R tracking
 * v1.0-v1.4: Previous versions with various fixes
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
  const cityStateColIndex = headers.findIndex(h => h.toString().trim() === 'City/State');
  const countryColIndex = headers.findIndex(h => h.toString().trim() === 'Country');
  const attemptDateColIndex = headers.findIndex(h => h.toString().trim() === 'Attempt Date');
  const videoUrlColIndex = headers.findIndex(h => h.toString().trim() === 'Video Proof URL');
  
  // Log found indices for debugging
  console.log("Column indices found (using EXACT column names):");
  console.log(`- Email Address: ${emailColIndex} (${headers[emailColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- Athlete Name: ${nameColIndex} (${headers[nameColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- Official Time: ${timeColIndex} (${headers[timeColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- Date of Birth: ${dobColIndex} (${headers[dobColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- Gender: ${genderColIndex} (${headers[genderColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- Bodyweight lbs: ${weightColIndex} (${headers[weightColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- Height (inches): ${heightColIndex} (${headers[heightColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- Grip Training Experience: ${gripTrainingColIndex} (${headers[gripTrainingColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- City/State: ${cityStateColIndex} (${headers[cityStateColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- Country: ${countryColIndex} (${headers[countryColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- Attempt Date: ${attemptDateColIndex} (${headers[attemptDateColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- Video Proof URL: ${videoUrlColIndex} (${headers[videoUrlColIndex] || 'NOT FOUND - check column name'})`);
  console.log(`- Emailed column (R): ${EMAILED_COL_INDEX} (${headers[EMAILED_COL_INDEX] || 'will be created'})`);
  
  // Validate critical columns
  if (emailColIndex === -1) {
    console.error('CRITICAL ERROR: "Email Address" column not found!');
    return;
  }
  if (nameColIndex === -1) {
    console.error('CRITICAL ERROR: "Athlete Name" column not found!');
    return;
  }
  if (timeColIndex === -1) {
    console.error('CRITICAL ERROR: "Official Time" column not found!');
    return;
  }
  
  // Check if emailed column exists, create if not
  if (EMAILED_COL_INDEX >= headers.length || !headers[EMAILED_COL_INDEX] || headers[EMAILED_COL_INDEX].toString().toLowerCase() !== 'emailed') {
    console.log(`Creating "Emailed" column at index ${EMAILED_COL_INDEX} (Column ${String.fromCharCode(65 + EMAILED_COL_INDEX)})`);
    sheet.getRange(1, EMAILED_COL_INDEX + 1).setValue('Emailed');
    // Refresh data after adding column
    const newData = sheet.getDataRange().getValues();
    data.length = 0;
    data.push(...newData);
  }

  const benefits = [
    "Did you know? Hanging for even 10-30 seconds a day decompresses your spine and creates space in your shoulder joints, reversing the effects of slouching.",
    "Did you know? Grip strength is one of the leading biological indicators of longevity and overall systemic resilience. A stronger grip literally means a longer life.",
    "Did you know? Passive hangs stretch your lats and pectoral muscles, which get notoriously tight from driving and computer work.",
    "Did you know? When you hang, gravity naturally applies traction to your spine, pulling nutrient-rich fluid back into your spinal discs."
  ];

  function parseTimeToSeconds(timeStr) {
    let s = String(timeStr || '0').trim();
    
    // Handle colon format (e.g., "4:10" = 4 minutes, 10 seconds)
    if (s.includes(':')) {
      let p = s.split(':');
      return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
    }
    
    // Handle decimal format - COMMON SPREADSHEET ISSUE
    // When users type "4.1" in a time-formatted cell, it often means 4:10 (4 minutes, 10 seconds)
    // because spreadsheets interpret .1 as 10/60 = 0.1667 hours (10 minutes)
    // But for our purposes (minutes:seconds), we need to handle this carefully
    if (s.includes('.')) {
      let parts = s.split('.');
      let minutes = parseInt(parts[0]) || 0;
      let decimalPart = parts[1];
      
      // If decimal part has 1 digit (e.g., "4.1"), treat it as tenths of a minute
      // .1 = 6 seconds, .2 = 12 seconds, .3 = 18 seconds, etc.
      if (decimalPart.length === 1) {
        let tenths = parseInt(decimalPart) || 0;
        let seconds = Math.round(tenths * 6); // .1 = 6 seconds, .2 = 12 seconds, etc.
        return minutes * 60 + seconds;
      }
      // If decimal part has 2 digits (e.g., "4.10"), treat it as seconds
      // .10 = 10 seconds, .25 = 25 seconds, etc.
      else if (decimalPart.length === 2) {
        let seconds = parseInt(decimalPart) || 0;
        if (seconds < 60) {
          return minutes * 60 + seconds;
        }
      }
      // For other cases, fall back to decimal minutes
      let num = parseFloat(s);
      if (!isNaN(num)) {
        return Math.round(num * 60);
      }
    }
    
    // Handle plain numbers
    let num = parseFloat(s);
    if (isNaN(num)) return 0;
    
    // If number is less than 20, assume it's minutes
    if (num < 20) {
      return Math.round(num * 60);
    }
    
    // Otherwise, assume it's already in seconds
    return Math.round(num);
  }

  function formatSecondsToMinutes(sec) {
    if (isNaN(sec) || sec <= 0) return "0 seconds";
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    
    const minText = minutes + (minutes === 1 ? " minute" : " minutes");
    const secText = seconds + (seconds === 1 ? " second" : " seconds");

    if (minutes > 0 && seconds > 0) {
        return `${minText} and ${secText}`;
    } else if (minutes > 0) {
        return minText;
    } else {
        return secText;
    }
  }

  // Calculate grip age using the same algorithm as the WDHC website
  function calculateGripAge(dob, bodyweight, category, hangTime) {
    if (!dob || !(dob instanceof Date) || !bodyweight || !category || !hangTime) {
      return { age: null, chronologicalAge: null, isYounger: false, baseline: null };
    }
    
    // Calculate chronological age
    const today = new Date();
    const birthDate = new Date(dob);
    
    let chronologicalAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      chronologicalAge--;
    }
    
    if (chronologicalAge < 16) chronologicalAge = 35; // Use placeholder for unreasonable ages
    
    const isFemale = category.toLowerCase().includes('women') || category.toLowerCase().includes('female');
    const actualTime = parseTimeToSeconds(hangTime);
    const actualWeight = parseFloat(bodyweight);

    if (isNaN(actualWeight) || actualWeight <= 0) {
      return { age: null, chronologicalAge: chronologicalAge, isYounger: false, baseline: null };
    }

    // Step 1: Base Expected Time (same as website)
    let baseExpectedTime;
    if (chronologicalAge <= 29) baseExpectedTime = isFemale ? 80 : 105;
    else if (chronologicalAge <= 39) baseExpectedTime = isFemale ? 65 : 85;
    else if (chronologicalAge <= 49) baseExpectedTime = isFemale ? 50 : 65;
    else if (chronologicalAge <= 59) baseExpectedTime = isFemale ? 38 : 50;
    else if (chronologicalAge <= 69) baseExpectedTime = isFemale ? 28 : 38;
    else baseExpectedTime = isFemale ? 20 : 28;

    // Step 2: Bodyweight Adjustment
    const refWeight = isFemale ? 135 : 175;
    const adjustedExpectedTime = (baseExpectedTime * (refWeight / actualWeight) * 0.7) + (baseExpectedTime * 0.3);

    // Step 3: Calculate Performance Ratio
    if (adjustedExpectedTime <= 0) {
      return { age: null, chronologicalAge: chronologicalAge, isYounger: false, baseline: Math.round(adjustedExpectedTime) };
    }
    
    const performanceRatio = actualTime / adjustedExpectedTime;

    // Step 4: Convert to Grip Age
    let gripAgeRaw = chronologicalAge - (Math.log(performanceRatio) * 19);

    // Step 5: Apply Caps
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
  
  // Helper to get grip age description for emails
  function getGripAgeDescription(gripAgeData) {
    if (!gripAgeData.age || !gripAgeData.chronologicalAge) {
      return "an impressive";
    }
    
    const ageDiff = gripAgeData.chronologicalAge - gripAgeData.age;
    
    if (gripAgeData.isYounger) {
      if (ageDiff > 10) return "a remarkably youthful";
      if (ageDiff > 5) return "a very young";
      return "a young";
    } else {
      if (ageDiff < -10) return "a remarkably experienced";
      if (ageDiff < -5) return "a very experienced";
      return "an experienced";
    }
  }

  // Process rows from bottom to top (newest first)
  for (let i = data.length - 1; i > 0; i--) {
    const row = data[i];
    
    // Ensure row has enough columns
    while (row.length <= EMAILED_COL_INDEX) {
      row.push('');
    }
    
    const hasBeenEmailed = row[EMAILED_COL_INDEX] && row[EMAILED_COL_INDEX].toString().toLowerCase() === 'yes';
    const email = emailColIndex >= 0 ? row[emailColIndex] : '';
    const name = nameColIndex >= 0 ? row[nameColIndex] || 'Athlete' : 'Athlete';
    const time = timeColIndex >= 0 ? row[timeColIndex] || '' : '';
    const dateOfBirth = dobColIndex >= 0 ? row[dobColIndex] : '';
    const gender = genderColIndex >= 0 ? row[genderColIndex] || '' : '';
    const bodyweight = weightColIndex >= 0 ? row[weightColIndex] || '' : '';
    const height = heightColIndex >= 0 ? row[heightColIndex] || '' : '';
    const gripTraining = gripTrainingColIndex >= 0 ? row[gripTrainingColIndex] || '' : '';
    const cityState = cityStateColIndex >= 0 ? row[cityStateColIndex] || '' : '';
    const country = countryColIndex >= 0 ? row[countryColIndex] || '' : '';
    const attemptDate = attemptDateColIndex >= 0 ? row[attemptDateColIndex] || '' : '';
    const videoUrl = videoUrlColIndex >= 0 ? row[videoUrlColIndex] || '' : '';

    if (email && email.toString().trim() && !hasBeenEmailed) {
      console.log(`Processing new submission for: ${name} (${email})`);
      
      const firstName = name.toString().split(' ')[0];
      const totalSeconds = parseTimeToSeconds(time);
      const formattedTime = formatSecondsToMinutes(totalSeconds);
      
      // Parse date of birth if available
      let dobDate = null;
      if (dateOfBirth) {
        try {
          dobDate = new Date(dateOfBirth);
          if (isNaN(dobDate.getTime())) {
            dobDate = null;
          }
        } catch (e) {
          dobDate = null;
        }
      }
      
      const gripAgeData = calculateGripAge(dobDate, bodyweight, gender, time);
      const gripAgeDesc = getGripAgeDescription(gripAgeData);
      
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

      try {
        GmailApp.sendEmail(email.toString().trim(), subject, "", {
          htmlBody: htmlBody,
          name: "World Dead Hang Championship"
        });
        sheet.getRange(i + 1, EMAILED_COL_INDEX + 1).setValue('Yes');
        console.log(`✓ Email sent to ${email}`);
      } catch(err) {
        console.error(`Error sending email to ${email}:`, err);
      }
    }
  }
  
  console.log("Email processing complete.");
}

// Test function to check column structure without sending emails
function testColumnStructure() {
  console.log("Testing column structure for 'custom form submissions' sheet...");
  
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "custom form submissions";
  const sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    console.error(`Sheet "${sheetName}" not found.`);
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  console.log("=== COLUMN STRUCTURE ANALYSIS ===");
  console.log(`Total columns: ${headers.length}`);
  console.log("\nColumn indices and headers:");
  headers.forEach((header, index) => {
    const columnLetter = String.fromCharCode(65 + (index % 26)) + (index >= 26 ? String.fromCharCode(64 + Math.floor(index / 26)) : '');
    console.log(`${columnLetter} (${index}): "${header}"`);
  });
  
  // Check for specific columns using EXACT names
  console.log("\n=== KEY COLUMNS (EXACT MATCH) ===");
  const exactEmailCol = headers.findIndex(h => h.toString().trim() === 'Email Address');
  console.log(`Email Address: ${exactEmailCol >= 0 ? `Column ${String.fromCharCode(65 + exactEmailCol)} (${exactEmailCol}): "${headers[exactEmailCol]}"` : 'NOT FOUND'}`);
  
  const exactNameCol = headers.findIndex(h => h.toString().trim() === 'Athlete Name');
  console.log(`Athlete Name: ${exactNameCol >= 0 ? `Column ${String.fromCharCode(65 + exactNameCol)} (${exactNameCol}): "${headers[exactNameCol]}"` : 'NOT FOUND'}`);
  
  const exactTimeCol = headers.findIndex(h => h.toString().trim() === 'Official Time');
  console.log(`Official Time: ${exactTimeCol >= 0 ? `Column ${String.fromCharCode(65 + exactTimeCol)} (${exactTimeCol}): "${headers[exactTimeCol]}"` : 'NOT FOUND'}`);
  
  const exactDobCol = headers.findIndex(h => h.toString().trim() === 'Date of Birth');
  console.log(`Date of Birth: ${exactDobCol >= 0 ? `Column ${String.fromCharCode(65 + exactDobCol)} (${exactDobCol}): "${headers[exactDobCol]}"` : 'NOT FOUND'}`);
  
  const exactGenderCol = headers.findIndex(h => h.toString().trim() === 'Gender');
  console.log(`Gender: ${exactGenderCol >= 0 ? `Column ${String.fromCharCode(65 + exactGenderCol)} (${exactGenderCol}): "${headers[exactGenderCol]}"` : 'NOT FOUND'}`);
  
  const exactWeightCol = headers.findIndex(h => h.toString().trim() === 'Bodyweight lbs');
  console.log(`Bodyweight lbs: ${exactWeightCol >= 0 ? `Column ${String.fromCharCode(65 + exactWeightCol)} (${exactWeightCol}): "${headers[exactWeightCol]}"` : 'NOT FOUND'}`);
  
  console.log(`\nColumn R (index 17): "${headers[17] || '(empty or beyond range)'}"`);
  console.log(`Should be "Emailed": ${headers[17] === 'Emailed' ? '✅ CORRECT' : '❌ WRONG - should be "Emailed"'}`);
  console.log("=== TEST COMPLETE ===");
}
// Web App Functions (if deploying as web app)
function doGet(e) {
  return ContentService.createTextOutput("WDHC Email Automation API v1.6\nUse POST to send test emails.");
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'test') {
      // Test the email function
      sendWelcomeEmailOnNewRow({changeType: 'INSERT_ROW'});
      return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Test email sent'}));
    }
    return ContentService.createTextOutput(JSON.stringify({error: 'Unknown action'}));
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()}));
  }
}
