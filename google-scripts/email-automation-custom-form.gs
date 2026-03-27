// WDHC Email Automation with PR Tracking - v2.2 (Custom Form Submissions)
// Updated for Custom Form Submissions sheet with exact column indices
// Milo's original HTML email format with FIXED time calculation
// 4.26 = 4 minutes 26 seconds (not 4 minutes 16 seconds)
// Add to Google Sheets: Extensions > Apps Script

function sendWelcomeEmailOnNewRow(e) {
 if (e && e.changeType !== 'INSERT_ROW') return;

 const activeSheet = SpreadsheetApp.getActiveSheet();
 const sheetName = activeSheet.getName();
 
 // Only run for Custom Form Submissions sheet
 if (sheetName !== 'Custom Form Submissions') return;
 
 const data = activeSheet.getDataRange().getValues();
 const headers = data[0];
 
 // ========== CUSTOM FORM SUBMISSIONS COLUMN INDICES (0-based) ==========
 const timestampIndex = 0; // Column A: Timestamp
 const submissionIdIndex = 1; // Column B: Submission ID
 const nameColIndex = 2; // Column C: Athlete Name
 const emailColIndex = 3; // Column D: Email Address
 const cityStateIndex = 4; // Column E: City/State
 const countryIndex = 5; // Column F: Country
 const dobColIndex = 6; // Column G: Date of Birth
 const genderColIndex = 7; // Column H: Gender
 const weightColIndex = 8; // Column I: Bodyweight lbs
 const heightColIndex = 9; // Column J: Height (inches)
 const gripTrainingColIndex = 10; // Column K: Grip Training Experience
 const attemptDateIndex = 11; // Column L: Attempt Date
 const timeColIndex = 12; // Column M: Official Time
 const videoUrlIndex = 13; // Column N: Video Proof URL
 const notesIndex = 14; // Column O: Additional Notes
 const hearAboutIndex = 15; // Column P: How did you hear about us?
 const consentIndex = 16; // Column Q: Consent
 const emailedCol = 17; // Column R: Emailed (already exists)
 const prCol = 18; // Column S: Is PR (already exists)
 const previousBestCol = 19; // Column T: Previous Best (already exists)
 const prBadgeColIndex = 20; // Column U: PR Badge (already exists)

 // ========== FIXED TIME PARSING ==========
 // Helper functions
 function parseTimeToSeconds(timeStr) {
   let s = String(timeStr || '0').trim();
   
   // Handle "MM:SS" format
   if (s.includes(':')) {
     let p = s.split(':');
     return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
   }
   
   // Handle decimal format "M.SS" or "M.S"
   if (s.includes('.')) {
     let parts = s.split('.');
     let minutes = parseInt(parts[0]) || 0;
     let secondsPart = parts[1] || '0';
     
     if (secondsPart.length === 1) {
       // "4.5" = 4 minutes 30 seconds
       return minutes * 60 + (parseInt(secondsPart) * 6);
     } else if (secondsPart.length === 2) {
       // "4.26" = 4 minutes 26 seconds (FIXED!)
       return minutes * 60 + parseInt(secondsPart);
     } else {
       // Fallback: treat as decimal minutes
       let decimalMinutes = parseFloat(s);
       return Math.round(decimalMinutes * 60);
     }
   }
   
   let num = parseFloat(s);
   if (isNaN(num)) return 0;
   
   // If number is less than 60, assume seconds
   if (num < 60) {
     return Math.round(num);
   }
   
   // Otherwise assume it's already seconds
   return Math.round(num);
 }

 function formatSecondsToMinutes(sec) {
   if (isNaN(sec) || sec <= 0) return "0 seconds";
   const minutes = Math.floor(sec / 60);
   const seconds = sec % 60;
   const minText = minutes + (minutes === 1 ? " minute" : " minutes");
   const secText = seconds + (seconds === 1 ? " second" : " seconds");
   if (minutes > 0 && seconds > 0) return minText + " " + secText;
   if (minutes > 0) return minText;
   return secText;
 }

 // ========== ENHANCED GRIP AGE CALCULATION ==========
 function calculateGripAge(timeSeconds, dob, gender, weight, height, gripTraining) {
   // Base grip age calculation (same as website)
   let baseGripAge = 0;
   
   // Time-based calculation
   if (timeSeconds <= 30) baseGripAge = 60;
   else if (timeSeconds <= 60) baseGripAge = 50;
   else if (timeSeconds <= 90) baseGripAge = 40;
   else if (timeSeconds <= 120) baseGripAge = 30;
   else if (timeSeconds <= 180) baseGripAge = 20;
   else baseGripAge = 10;
   
   // Gender adjustment
   if (gender === 'Female') baseGripAge += 5;
   
   // Weight adjustment (heavier = harder)
   if (weight > 200) baseGripAge -= 5;
   else if (weight > 180) baseGripAge -= 3;
   else if (weight < 140) baseGripAge += 3;
   else if (weight < 120) baseGripAge += 5;
   
   // Height adjustment (taller = harder)
   if (height) {
     if (height > 72) baseGripAge -= 3; // Over 6ft
     else if (height < 66) baseGripAge += 3; // Under 5'6"
   }
   
   // Grip training experience adjustment
   if (gripTraining) {
     const training = gripTraining.toLowerCase();
     if (training.includes('none') || training.includes('first time')) baseGripAge += 5;
     else if (training.includes('beginner')) baseGripAge += 3;
     else if (training.includes('advanced') || training.includes('competitor') || training.includes('climber') || training.includes('powerlifter')) baseGripAge -= 5;
     else if (training.includes('intermediate')) baseGripAge -= 2;
   }
   
   // Clamp between 10-60
   return Math.max(10, Math.min(60, baseGripAge));
 }

 // ========== PROCESS NEW ROWS ==========
 for (let i = 1; i < data.length; i++) {
   const row = data[i];
   
   // Skip if already emailed
   if (row[emailedCol] === 'Yes') continue;
   
   const email = row[emailColIndex];
   const name = row[nameColIndex];
   const timeStr = row[timeColIndex];
   const dob = row[dobColIndex];
   const gender = row[genderColIndex];
   const weight = parseFloat(row[weightColIndex]) || 0;
   const height = row[heightColIndex] ? parseFloat(row[heightColIndex]) : null;
   const gripTraining = row[gripTrainingColIndex] || '';
   const videoUrl = row[videoUrlIndex] || '';
   const cityState = row[cityStateIndex] || '';
   const country = row[countryIndex] || '';
   const notes = row[notesIndex] || '';
   const hearAbout = row[hearAboutIndex] || '';
   
   if (!email || !name || !timeStr) continue;
   
   // Parse time
   const timeSeconds = parseTimeToSeconds(timeStr);
   const formattedTime = formatSecondsToMinutes(timeSeconds);
   
   // Calculate grip age
   const gripAge = calculateGripAge(timeSeconds, dob, gender, weight, height, gripTraining);
   
   // Check if this is a PR
   let isPR = false;
   let previousBest = '';
   
   // Look for previous submissions by same email
   for (let j = 1; j < data.length; j++) {
     if (j === i) continue; // Skip current row
     const otherRow = data[j];
     if (otherRow[emailColIndex] === email) {
       const otherTimeStr = otherRow[timeColIndex];
       if (otherTimeStr) {
         const otherTimeSeconds = parseTimeToSeconds(otherTimeStr);
         if (timeSeconds > otherTimeSeconds) {
           isPR = true;
           previousBest = formatSecondsToMinutes(otherTimeSeconds);
         }
       }
     }
   }
   
   // ========== BUILD HTML EMAIL ==========
   const subject = `🎉 WDHC Submission Received: ${name} - ${formattedTime}`;
   
   const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WDHC Submission Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .header .subtitle { margin: 10px 0 0; font-size: 16px; opacity: 0.9; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd; }
        .highlight-box { background: white; border-left: 4px solid #d4af37; padding: 20px; margin: 20px 0; border-radius: 0 5px 5px 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .stat-item { background: white; padding: 15px; border-radius: 5px; border: 1px solid #eee; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #d4af37; }
        .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
        .pr-badge { background: #d4af37; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0; }
        .button { display: inline-block; background: #d4af37; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        .gold { color: #d4af37; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>WORLD DEAD HANG CHAMPIONSHIP</h1>
        <div class="subtitle">Submission Confirmation & Grip Age Analysis</div>
    </div>
    
    <div class="content">
        <h2>Hey ${name},</h2>
        <p>Your dead hang submission has been received and is being reviewed by our team. Here's your personalized grip age analysis:</p>
        
        <div class="highlight-box">
            <h3 style="margin-top: 0;">📊 Your Performance Analysis</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${formattedTime}</div>
                    <div class="stat-label">Official Hang Time</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${gripAge}</div>
                    <div class="stat-label">Grip Age</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${weight} lbs</div>
                    <div class="stat-label">Bodyweight</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${gender}</div>
                    <div class="stat-label">Division</div>
                </div>
            </div>
            
            ${height ? `<p><strong>Height:</strong> ${height} inches</p>` : ''}
            ${gripTraining ? `<p><strong>Grip Training Experience:</strong> ${gripTraining}</p>` : ''}
            ${cityState || country ? `<p><strong>Location:</strong> ${cityState}${cityState && country ? ', ' : ''}${country}</p>` : ''}
        </div>
        
        ${isPR ? `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">🎉 PERSONAL RECORD!</h3>
            <p>You've beaten your previous best of <strong>${previousBest}</strong>! This is now your official PR on the leaderboard.</p>
            <div class="pr-badge">🏆 NEW PR</div>
        </div>
        ` : ''}
        
        <h3>📝 What's Next?</h3>
        <ul>
            <li>Your submission will be reviewed within <strong>24-48 hours</strong></li>
            <li>Once approved, you'll appear on the <a href="https://world-dead-hang.pages.dev">official leaderboard</a></li>
            <li>You'll receive another email when your submission is approved</li>
            <li>Check the leaderboard regularly to see how you stack up against athletes worldwide</li>
        </ul>
        
        ${videoUrl ? `<p><strong>Video Proof:</strong> <a href="${videoUrl}">${videoUrl}</a></p>` : ''}
        
        <a href="https://world-dead-hang.pages.dev" class="button">View Leaderboard</a>
        
        <div class="footer">
            <p>Questions? Reply to this email or contact us at <a href="mailto:contact@worlddeadhang.com">contact@worlddeadhang.com</a></p>
            <p>Follow us for updates: <a href="https://instagram.com/worlddeadhang">Instagram</a> | <a href="https://tiktok.com/@worlddeadhang">TikTok</a></p>
            <p style="font-size: 12px; margin-top: 20px;">World Dead Hang Championship © 2026</p>
        </div>
    </div>
</body>
</html>
   `;
   
   // ========== SEND EMAIL ==========
   try {
     MailApp.sendEmail({
       to: email,
       subject: subject,
       htmlBody: htmlBody,
       name: "World Dead Hang Championship"
     });
     
     // Mark as emailed
     activeSheet.getRange(i + 1, emailedCol + 1).setValue('Yes');
     
     // Update PR tracking
     activeSheet.getRange(i + 1, prCol + 1).setValue(isPR ? 'Yes' : 'No');
     if (previousBest) {
       activeSheet.getRange(i + 1, previousBestCol + 1).setValue(previousBest);
     }
     
     console.log(`✅ Email sent to ${name} (${email}) - Time: ${formattedTime}, Grip Age: ${gripAge}`);
     
   } catch (error) {
     console.error(`❌ Failed to send email to ${email}:`, error);
   }
 }
}

// ========== TRIGGER SETUP ==========
function setupTrigger() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const triggerId = scriptProperties.getProperty('triggerId');
  
  // Remove existing trigger if it exists
  if (triggerId) {
    try {
      ScriptApp.getProjectTriggers().forEach(trigger => {
        if (trigger.getUniqueId() === triggerId) {
          ScriptApp.deleteTrigger(trigger);
        }
      });
    } catch (e) {
      console.log('No existing trigger to delete');
    }
  }
  
  // Create new trigger
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Custom Form Submissions');
  if (!sheet) {
    throw new Error('Custom Form Submissions sheet not found');
  }
  
  const trigger = ScriptApp.newTrigger('sendWelcomeEmailOnNewRow')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();
  
  // Save trigger ID
  scriptProperties.setProperty('triggerId', trigger.getUniqueId());
  
  console.log('✅ Trigger set up successfully for Custom Form Submissions sheet');
}

// Run this once to set up the trigger
// setupTrigger();