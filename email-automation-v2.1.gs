// WDHC Email Automation with PR Tracking - v2.1 (Tally-compatible with Height & Grip Training)
// Updated to work with Tally form column naming variations
// Milo's original HTML email format with FIXED time calculation
// 4.26 = 4 minutes 26 seconds (not 4 minutes 16 seconds)
// Add to Google Sheets: Extensions > Apps Script

function sendWelcomeEmailOnNewRow(e) {
 if (e && e.changeType !== 'INSERT_ROW') return;

 const activeSheet = SpreadsheetApp.getActiveSheet();
 const data = activeSheet.getDataRange().getValues();
 const headers = data[0];
 
 // Column indices (0-based)
 const emailColIndex = 10; // Column K (Email Address)
 const nameColIndex = 3; // Column D (Athlete Name)
 const timeColIndex = 12; // Column M (Official Time)
 const dobColIndex = 7; // Column H (Date of Birth)
 const genderColIndex = 8; // Column I (Gender)
 const weightColIndex = 9; // Column J (Bodyweight lbs)
 
 // Look for height column with multiple possible names (Tally might use different naming)
 let heightColIndex = headers.findIndex(h => h === 'Height (inches)');
 if (heightColIndex === -1) heightColIndex = headers.findIndex(h => h === 'Height');
 if (heightColIndex === -1) heightColIndex = headers.findIndex(h => h.includes('Height'));
 
 // Look for grip training column with multiple possible names
 let gripTrainingColIndex = headers.findIndex(h => h === 'Grip Training Experience');
 if (gripTrainingColIndex === -1) gripTrainingColIndex = headers.findIndex(h => h === 'Grip Training');
 if (gripTrainingColIndex === -1) gripTrainingColIndex = headers.findIndex(h => h.includes('Grip') && h.includes('Training'));
 if (gripTrainingColIndex === -1) gripTrainingColIndex = headers.findIndex(h => h.includes('Grip') && h.includes('Experience'));
 
 const approvedColIndex = headers.findIndex(h => h === 'Approved');
 const prBadgeColIndex = headers.findIndex(h => h === 'PR Badge');
 
 // Add tracking columns if they don't exist
 let emailedCol = headers.findIndex(h => h === 'Emailed');
 let prCol = headers.findIndex(h => h === 'Is PR');
 let previousBestCol = headers.findIndex(h => h === 'Previous Best');
 
 if (emailedCol === -1) {
   emailedCol = headers.length;
   activeSheet.getRange(1, emailedCol + 1).setValue('Emailed');
 }
 if (prCol === -1) {
   prCol = headers.length + (emailedCol === headers.length ? 0 : 1);
   activeSheet.getRange(1, prCol + 1).setValue('Is PR');
 }
 if (previousBestCol === -1) {
   previousBestCol = headers.length + (emailedCol === headers.length ? 0 : 1) + (prCol === headers.length + 1 ? 0 : 1);
   activeSheet.getRange(1, previousBestCol + 1).setValue('Previous Best');
 }
 if (prBadgeColIndex === -1) {
   const newPrBadgeCol = headers.length + (emailedCol === headers.length ? 0 : 1) + 
     (prCol === headers.length + 1 ? 0 : 1) + 
     (previousBestCol === headers.length + 2 ? 0 : 1);
   activeSheet.getRange(1, newPrBadgeCol + 1).setValue('PR Badge');
 }
 
 // Add height and grip training columns if they don't exist (for enhanced grip age calculation)
 if (heightColIndex === -1) {
   const newHeightCol = headers.length + (emailedCol === headers.length ? 0 : 1) + 
     (prCol === headers.length + 1 ? 0 : 1) + 
     (previousBestCol === headers.length + 2 ? 0 : 1) +
     (prBadgeColIndex === -1 ? 1 : 0);
   heightColIndex = newHeightCol;
   activeSheet.getRange(1, heightColIndex + 1).setValue('Height (inches)');
 }
 
 if (gripTrainingColIndex === -1) {
   const newGripTrainingCol = headers.length + (emailedCol === headers.length ? 0 : 1) + 
     (prCol === headers.length + 1 ? 0 : 1) + 
     (previousBestCol === headers.length + 2 ? 0 : 1) +
     (prBadgeColIndex === -1 ? 1 : 0) +
     (heightColIndex >= headers.length ? 1 : 0);
   gripTrainingColIndex = newGripTrainingCol;
   activeSheet.getRange(1, gripTrainingColIndex + 1).setValue('Grip Training Experience');
   // Don't add sample data to row 2 - it might interfere with actual submissions
 }

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
   return minutes > 0 ? minText : secText;
 }

 // ========== ENHANCED GRIP AGE CALCULATION ==========
 function calculateGripAge(seconds, weight, gender, height, gripTraining) {
   // Base grip age calculation (same as website)
   let baseGripAge;
   
   if (seconds >= 300) { // 5+ minutes
     baseGripAge = 20;
   } else if (seconds >= 240) { // 4-5 minutes
     baseGripAge = 30;
   } else if (seconds >= 180) { // 3-4 minutes
     baseGripAge = 40;
   } else if (seconds >= 120) { // 2-3 minutes
     baseGripAge = 50;
   } else if (seconds >= 60) { // 1-2 minutes
     baseGripAge = 60;
   } else if (seconds >= 30) { // 30-60 seconds
     baseGripAge = 70;
   } else { // < 30 seconds
     baseGripAge = 80;
   }
   
   // Weight adjustment (heavier = younger grip age)
   const weightAdjustment = Math.max(0, (200 - weight) / 10); // Heavier than 200lbs gets bonus
   
   // Gender adjustment (males typically have stronger grip)
   const genderAdjustment = gender === 'Female' ? 5 : 0;
   
   // Height adjustment (taller = potentially harder due to leverage)
   let heightAdjustment = 0;
   if (height) {
     // Average male height is 69 inches (5'9"), female is 64 inches (5'4")
     const avgHeight = gender === 'Female' ? 64 : 69;
     heightAdjustment = Math.max(0, (height - avgHeight) / 2); // Taller than average = slightly older
   }
   
   // Grip training experience adjustment
   let trainingAdjustment = 0;
   if (gripTraining) {
     const trainingLevel = String(gripTraining).toLowerCase();
     if (trainingLevel.includes('none') || trainingLevel.includes('first')) {
       trainingAdjustment = -5; // No experience = younger (it's impressive!)
     } else if (trainingLevel.includes('beginner')) {
       trainingAdjustment = -3;
     } else if (trainingLevel.includes('intermediate')) {
       trainingAdjustment = 0;
     } else if (trainingLevel.includes('advanced') || trainingLevel.includes('competitor') || trainingLevel.includes('climber')) {
       trainingAdjustment = 5; // Advanced training = older (expected to be good)
     }
   }
   
   // Calculate final grip age
   let finalGripAge = baseGripAge - weightAdjustment + genderAdjustment + heightAdjustment + trainingAdjustment;
   
   // Clamp between 20 and 80
   finalGripAge = Math.max(20, Math.min(80, Math.round(finalGripAge)));
   
   return {
     base: baseGripAge,
     weightAdjustment: -weightAdjustment, // Negative because we subtract it
     genderAdjustment,
     heightAdjustment,
     trainingAdjustment,
     final: finalGripAge
   };
 }

 // ========== PROCESS NEW ROWS ==========
 for (let i = 1; i < data.length; i++) {
   const row = data[i];
   
   // Skip if already emailed or not approved
   if (emailedCol !== -1 && row[emailedCol] === 'Yes') continue;
   if (approvedColIndex !== -1 && row[approvedColIndex] !== 'TRUE') continue;
   
   const email = row[emailColIndex];
   const name = row[nameColIndex];
   const timeStr = row[timeColIndex];
   const dob = row[dobColIndex];
   const gender = row[genderColIndex];
   const weight = parseFloat(row[weightColIndex]) || 0;
   const height = heightColIndex !== -1 ? (parseInt(row[heightColIndex]) || null) : null;
   const gripTraining = gripTrainingColIndex !== -1 ? (row[gripTrainingColIndex] || '') : '';
   
   if (!email || !name) continue;
   
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
   let previousBest = '';
   if (prCol !== -1 && previousBestCol !== -1) {
     previousBest = row[previousBestCol] || '';
     const prevBestSeconds = parseTimeToSeconds(previousBest);
     
     if (seconds > prevBestSeconds) {
       isPR = true;
       // Update previous best
       activeSheet.getRange(i + 1, previousBestCol + 1).setValue(timeStr);
       // Mark as PR
       activeSheet.getRange(i + 1, prCol + 1).setValue('Yes');
       
       // Add PR badge if enabled
       if (prBadgeColIndex !== -1) {
         activeSheet.getRange(i + 1, prBadgeColIndex + 1).setValue('🏆 PR');
       }
     }
   }
   
   // Build email content
   const subject = `WDHC Submission Confirmation: ${name}`;
   
   let htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); color: #FFD700; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none; }
    .result-box { background: white; border: 2px solid #FFD700; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .grip-age { font-size: 48px; font-weight: bold; color: #FFD700; margin: 10px 0; }
    .time { font-size: 32px; color: #333; margin: 10px 0; }
    .pr-badge { background: #FFD700; color: #1a1a1a; padding: 5px 15px; border-radius: 20px; font-weight: bold; display: inline-block; margin: 10px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
    .factor { display: inline-block; background: #f0f0f0; padding: 5px 10px; border-radius: 5px; margin: 2px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 28px;">WORLD DEAD HANG CHAMPIONSHIP</h1>
    <p style="margin: 5px 0 0 0; font-size: 18px; opacity: 0.9;">Submission Confirmation</p>
  </div>
  
  <div class="content">
    <h2>Hey ${name},</h2>
    <p>Your dead hang submission has been received and is being reviewed by our team.</p>
    
    <div class="result-box">
      <h3 style="margin-top: 0; color: #666;">YOUR OFFICIAL TIME</h3>
      <div class="time">${timeStr}</div>
      <p>(${formattedTime})</p>
      
      <h3 style="color: #666; margin-top: 25px;">YOUR GRIP AGE</h3>
      <div class="grip-age">${gripAgeResult.final}</div>
      <p style="color: #666; font-size: 14px;">Based on your time, weight, and other factors</p>
      
      ${isPR ? '<div class="pr-badge">🏆 PERSONAL RECORD!</div>' : ''}
    </div>
    
    <h3>📊 Grip Age Breakdown</h3>
    <p>Your grip age of <strong>${gripAgeResult.final}</strong> was calculated from:</p>
    <div style="margin: 15px 0;">
      <span class="factor">Base: ${gripAgeResult.base}</span>
      <span class="factor">Weight: ${gripAgeResult.weightAdjustment >= 0 ? '+' : ''}${gripAgeResult.weightAdjustment}</span>
      <span class="factor">Gender: ${gripAgeResult.genderAdjustment >= 0 ? '+' : ''}${gripAgeResult.genderAdjustment}</span>
      ${height ? `<span class="factor">Height: ${gripAgeResult.heightAdjustment >= 0 ? '+' : ''}${gripAgeResult.heightAdjustment}</span>` : ''}
      ${gripTraining ? `<span class="factor">Training: ${gripAgeResult.trainingAdjustment >= 0 ? '+' : ''}${gripAgeResult.trainingAdjustment}</span>` : ''}
    </div>
    
    <h3>📋 Submission Details</h3>
    <ul>
      <li><strong>Name:</strong> ${name}</li>
      <li><strong>Age:</strong> ${age}</li>
      <li><strong>Gender:</strong> ${gender}</li>
      <li><strong>Weight:</strong> ${weight} lbs</li>
      ${height ? `<li><strong>Height:</strong> ${height} inches</li>` : ''}
      ${gripTraining ? `<li><strong>