// WDHC Email Automation with PR Tracking - v1.4 (HTML Format with Fixed Time Parsing)
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
   if (minutes > 0 && seconds > 0) return `${minText} and ${secText}`;
   if (minutes > 0) return minText;
   return secText;
 }
 // ========== END FIXED TIME PARSING ==========

 function calculateAgeFromDOB(dob) {
   if (!dob || !(dob instanceof Date)) return null;
   const today = new Date();
   let age = today.getFullYear() - dob.getFullYear();
   const monthDiff = today.getMonth() - dob.getMonth();
   if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
     age--;
   }
   return age;
 }

 function calculateWDHCGripAge(timeSeconds, age, weightLbs, gender) {
   const isMale = gender.toString().toLowerCase() === 'male';
   const refWeight = isMale ? 175 : 135;
   let baseExpected = 0;
   
   if (isMale) {
     if (age < 30) baseExpected = 150;
     else if (age < 40) baseExpected = 120;
     else if (age < 50) baseExpected = 90;
     else if (age < 60) baseExpected = 60;
     else if (age < 70) baseExpected = 45;
     else baseExpected = 30;
   } else {
     if (age < 30) baseExpected = 105;
     else if (age < 40) baseExpected = 80;
     else if (age < 50) baseExpected = 60;
     else if (age < 60) baseExpected = 45;
     else if (age < 70) baseExpected = 30;
     else baseExpected = 20;
   }
   
   const adjustedExpectedTime = (baseExpected * (refWeight / weightLbs) * 0.7) + (baseExpected * 0.3);
   const performanceRatio = timeSeconds / adjustedExpectedTime;
   let gripAge = age - ((performanceRatio - 1.0) * 50);
   gripAge = Math.max(age - 25, Math.min(age + 25, gripAge));
   gripAge = Math.max(16, Math.min(85, gripAge));
   const yearsSaved = age - Math.round(gripAge);
   
   return {
     gripAge: Math.round(gripAge),
     yearsSaved: yearsSaved,
     performanceRatio: performanceRatio.toFixed(2)
   };
 }

 // Find athlete's previous best and update PR badges
 function findAndUpdatePRs(athleteName, currentRowIndex, currentTimeSeconds) {
   let bestTime = 0;
   let bestTimeFormatted = '';
   let bestRowIndex = -1;
   
   // Look through all previous rows (above current row)
   for (let j = 1; j < currentRowIndex; j++) {
     const prevName = data[j][nameColIndex];
     if (prevName && prevName.toString().trim() === athleteName.toString().trim()) {
       const prevTime = data[j][timeColIndex];
       const prevSeconds = parseTimeToSeconds(prevTime);
       if (prevSeconds > bestTime) {
         bestTime = prevSeconds;
         bestTimeFormatted = formatSecondsToMinutes(prevSeconds);
         bestRowIndex = j;
       }
     }
   }
   
   // Check if current time is a PR
   const isPR = currentTimeSeconds > bestTime;
   
   // Update PR badges: remove from old PR, add to new PR if applicable
   if (bestRowIndex !== -1 && prBadgeColIndex !== -1) {
     // Remove PR badge from previous best
     activeSheet.getRange(bestRowIndex + 1, prBadgeColIndex + 1).setValue('');
   }
   
   if (isPR && prBadgeColIndex !== -1) {
     // Add PR badge to current row
     activeSheet.getRange(currentRowIndex + 1, prBadgeColIndex + 1).setValue('🏆 PR');
   }
   
   return { 
     bestTime, 
     bestTimeFormatted, 
     isPR,
     previousPRRow: bestRowIndex 
   };
 }

 // Benefits for random facts
 const benefits = [
   "Did you know? Hanging for even 10-30 seconds a day decompresses your spine and creates space in your shoulder joints, reversing the effects of slouching.",
   "Did you know? Grip strength is one of the leading biological indicators of longevity and overall systemic resilience. A stronger grip literally means a longer life.",
   "Did you know? Passive hangs stretch your lats and pectoral muscles, which get notoriously tight from driving and computer work.",
   "Did you know? When you hang, gravity naturally applies traction to your spine, pulling nutrient-rich fluid back into your spinal discs."
 ];

 // Main loop - process from oldest to newest to track PRs properly
 for (let i = 1; i < data.length; i++) {
   const row = data[i];
   if (row[emailedCol]) continue;
   
   const email = row[emailColIndex];
   if (!email) continue;
   
   const name = row[nameColIndex] || 'Athlete';
   const time = row[timeColIndex] || '';
   const dob = row[dobColIndex];
   const gender = row[genderColIndex];
   const weight = row[weightColIndex];
   const isApproved = approvedColIndex !== -1 ? row[approvedColIndex] === 'Yes' : false;
   
   const firstName = name.split(' ')[0];
   const totalSeconds = parseTimeToSeconds(time);
   const formattedTime = formatSecondsToMinutes(totalSeconds);
   const age = calculateAgeFromDOB(dob);
   
   // Find previous best and update PR badges
   const prInfo = findAndUpdatePRs(name, i, totalSeconds);
   const isPR = prInfo.isPR;
   const improvement = isPR && prInfo.bestTime > 0 ? totalSeconds - prInfo.bestTime : 0;
   const improvementFormatted = formatSecondsToMinutes(improvement);
   
   // Update sheet with PR info
   activeSheet.getRange(i + 1, prCol + 1).setValue(isPR ? 'Yes' : 'No');
   activeSheet.getRange(i + 1, previousBestCol + 1).setValue(prInfo.bestTimeFormatted || 'First Submission');
   
   // Tier calculation
   let currentTier = "", nextTier = "", gap = 0;
   if (totalSeconds >= 360) { currentTier = "Freak"; gap = -1; } 
   else if (totalSeconds >= 240) { currentTier = "Legend"; nextTier = "Freak"; gap = 360 - totalSeconds; } 
   else if (totalSeconds >= 180) { currentTier = "Elite"; nextTier = "Legend"; gap = 240 - totalSeconds; } 
   else if (totalSeconds >= 120) { currentTier = "Pro"; nextTier = "Elite"; gap = 180 - totalSeconds; } 
   else if (totalSeconds >= 60) { currentTier = "Contender"; nextTier = "Pro"; gap = 120 - totalSeconds; } 
   else { currentTier = "Challenger"; nextTier = "Contender"; gap = 60 - totalSeconds; }

   // PR-specific messaging
   let prMessage = '';
   if (isPR) {
     if (prInfo.bestTime > 0) {
       prMessage = `<div style="background: linear-gradient(135deg, #D4AF37, #FFD700); color: white; padding: 12px; border-radius: 8px; margin: 15px 0; text-align: center;">
         <h3 style="margin: 0; color: white;">🎉 NEW PERSONAL RECORD! 🎉</h3>
         <p style="margin: 8px 0 0 0; font-size: 1.1em;">You beat your previous best of <strong>${prInfo.bestTimeFormatted}</strong> by <strong>${improvementFormatted}</strong>!</p>
         <p style="margin: 4px 0 0 0; font-size: 0.9em;">🏆 This submission will get the PR badge on the leaderboard.</p>
       </div>`;
     } else {
       prMessage = `<div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 12px; border-radius: 8px; margin: 15px 0; text-align: center;">
         <h3 style="margin: 0; color: white;">🏁 FIRST SUBMISSION! 🏁</h3>
         <p style="margin: 8px 0 0 0; font-size: 1.1em;">Welcome to the WDHC! <strong>${formattedTime}</strong> is your starting point.</p>
       </div>`;
     }
   } else if (prInfo.bestTime > 0) {
     prMessage = `<div style="background: #f0f0f0; padding: 12px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #666;">
       <p style="margin: 0; color: #666;">This time of <strong>${formattedTime}</strong> didn't beat your PR of <strong>${prInfo.bestTimeFormatted}</strong>.</p>
       <p style="margin: 8px 0 0 0; font-size: 0.9em;">Keep training! You're <strong>${formatSecondsToMinutes(prInfo.bestTime - totalSeconds)}</strong> away from your best.</p>
     </div>`;
   }

   const motivationalText = gap === -1 
     ? `You're in the <strong>FREAK</strong> tier! You have officially transcended human limits.`
     : `Congrats on hitting <strong>${formattedTime}</strong>! You're in the <strong>${currentTier}</strong> tier, and you're only <strong>${formatSecondsToMinutes(gap)}</strong> away from leveling up to the <strong>${nextTier}</strong> tier. Keep going!`;

   // Grip Age HTML - FIXED ALL LINE BREAKS
   let gripAgeHtml = '';
   let gripAgeMessage = '';
   let longevityFact = '';
   
   const hasGripAgeData = dob && dob instanceof Date && 
     gender !== undefined && gender !== null && gender !== '' &&
     weight !== undefined && weight !== null && weight !== '' &&
     age !== undefined && age !== null;

   if (hasGripAgeData) {
     try {
       const weightNum = parseInt(String(weight).trim());
       const genderStr = String(gender).trim();

       if (isNaN(weightNum) || weightNum <= 0) {
         throw new Error("Invalid weight value");
       }

       const gripAgeResult = calculateWDHCGripAge(totalSeconds, age, weightNum, genderStr);
       const yearsSavedText = gripAgeResult.yearsSaved > 0 ? 
         gripAgeResult.yearsSaved + ' years younger' : 
         Math.abs(gripAgeResult.yearsSaved) + ' years older';

       if (gripAgeResult.yearsSaved > 0) {
         gripAgeMessage = 'Your grip is ' + yearsSavedText + ' than your actual age! That\'s elite-level hand strength. To maintain this, try adding 2-3 sets of farmer\'s walks to your routine.';
         longevityFact = 'People with elite grip strength live 5-7 years longer on average. Your younger grip age suggests you\'re biologically exceptional—keep it up!';
       } else if (gripAgeResult.yearsSaved < 0) {
         const yearsToImprove = Math.abs(gripAgeResult.yearsSaved);
         gripAgeMessage = 'Your grip age is ' + yearsToImprove + ' years older than your chronological age. The good news: grip strength responds quickly to training! Try dead hangs 3x/week, starting with 3 sets of 30 seconds.';
         longevityFact = 'Every 5kg increase in grip strength correlates with 16% lower all-cause mortality. Improving your grip could literally add 5+ years to your lifespan.';
       } else {
         gripAgeMessage = 'Your grip age matches your chronological age. Solid foundation! To get younger, add grip-specific work: try towel hangs or fat grip training 2x/week.';
         longevityFact = 'Grip strength is the #1 predictor of longevity—stronger than blood pressure, cholesterol, or even smoking status. You\'re on the right track.';
       }

       gripAgeHtml = '<div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd; background: #f9f9f9; border-radius: 8px;">' +
         '<h3 style="color: #000; margin-top: 0;">Your WDHC Grip Age™: ' + gripAgeResult.gripAge + '</h3>' +
         '<p>Based on your ' + formattedTime + ' hang at ' + weight + 'lbs, your biological grip age is <strong>' + gripAgeResult.gripAge + '</strong> (chronological age: ' + age + '). That\'s <strong>' + yearsSavedText + '</strong>!</p>' +
         '<p style="color: #D4AF37; font-weight: bold;">' + gripAgeMessage + '</p>' +
         '<p><strong>📈 Longevity Connection:</strong> ' + longevityFact + '</p>' +
         '<p style="font-size: 0.8em; color: #666; margin-top: 10px;"><em>Grip strength is one of the strongest biological markers of overall health and longevity. Track your progress monthly!</em></p>' +
         '</div>';
     } catch (err) {
       console.error("Error calculating Grip Age: " + err);
       gripAgeHtml = '<div style="margin-top: 20px;">' + 
         '<h3 style="color: #000; margin-top: 0;">Your WDHC Grip Age™</h3>' + 
         '<p>We couldn\'t calculate your grip age due to incomplete data.</p>' + 
         '</div>';
     }
   } else {
     gripAgeHtml = '<div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd;">' +
       '<h3 style="color: #000; margin-top: 0;">Your WDHC Grip Age™</h3>' +
       '<p>To see your personalized grip age and longevity insights, make sure to include your Date of Birth, Gender, and Bodyweight in future submissions!</p>' +
       '<p style="color: #D4AF37; font-weight: bold;">Grip strength is a powerful predictor of longevity—tracking it could help you live longer.</p>' +
       '</div>';
   }
   
   // Email composition
   const randomFact = benefits[Math.floor(Math.random() * benefits.length)];
   const subject = isPR ? "🎉 NEW PR! We're reviewing your WDHC submission" : "Hang Tight! We're reviewing your WDHC submission ⏱️";
   const htmlBody = `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
  <h2 style="color: #000;">Hey ${firstName},</h2>
  <p>This is Milo from the World Dead Hang Championship.</p>
  <p>I just wanted to personally let you know that we received your submission and our team is reviewing your video proof now.</p>
  ${prMessage}
  <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #D4AF37; margin: 20px 0;">
    ${motivationalText}
    ${gripAgeHtml}
  </div>
  <p>We review every single hang manually to protect the integrity of the leaderboard. You can expect to see your official ranking go live on <strong>worlddeadhang.com</strong> within 24-48 hours if everything looks good.</p>
  <p style="color: #666; font-size: 0.9em;">${randomFact}</p>
  <p>Stay strong,<br><strong>Milo</strong><br>World Dead Hang Championship</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="font-size: 0.8em; color: #999;">This is an automated message. Please do not reply to this email. If you have questions, contact us through the website.</p>
</div>`;

   try {
     // Send email
     MailApp.sendEmail({
       to: email,
       subject: subject,
       htmlBody: htmlBody,
       name: "World Dead Hang Championship"
     });
     
     // Mark as emailed
     activeSheet.getRange(i + 1, emailedCol + 1).setValue('Yes');
     
     Logger.log(`✅ Email sent to ${name} (${email}) - ${isPR ? 'PR!' : 'Not PR'}`);
     
   } catch (err) {
     Logger.log(`❌ Failed to send email to ${email}: ${err.toString()}`);
   }
 }
}

// Test function - run this manually to test the script
function testEmailAutomation() {
  // Create a mock event object
  const mockEvent = {
    changeType: 'INSERT_ROW'
  };
  
  console.log("Testing email automation...");
  sendWelcomeEmailOnNewRow(mockEvent);
  console.log("Test complete!");
}

// Test time parsing function
function testTimeParsing() {
  const tests = [
    { input: '4.26', expected: 266 }, // 4 minutes 26 seconds (FIXED!)
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
    console.log(`${test.input} → ${result} seconds ${passed ? '✅' : '❌ (expected ' + test.expected + ')'}`);
    if (!passed) allPassed = false;
  });
  
  console.log(allPassed ? '✅ All time parsing tests passed!' : '❌ Some tests failed');
  return allPassed;
}

// Setup function to add required columns
function setupEmailColumns() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Check if "Emailed" column exists
  if (!headers.includes('Emailed')) {
    const newCol = headers.length + 1;
    sheet.getRange(1, newCol).setValue('Emailed');
    sheet.getRange(1, newCol).setFontWeight('bold');
    console.log('Added "Emailed" column');
  }
  
  // Check if "Is PR" column exists
  if (!headers.includes('Is PR')) {
    const newCol = headers.length + 1;
    sheet.getRange(1, newCol).setValue('Is PR');
    sheet.getRange(1, newCol).setFontWeight('bold');
    console.log('Added "Is PR" column');
  }
  
  // Check if "Previous Best" column exists
  if (!headers.includes('Previous Best')) {
    const newCol = headers.length + 1;
    sheet.getRange(1, newCol).setValue('Previous Best');
    sheet.getRange(1, newCol).setFontWeight('bold');
    console.log('Added "Previous Best" column');
  }
  
  // Check if "PR Badge" column exists
  if (!headers.includes('PR Badge')) {
    const newCol = headers.length + 1;
    sheet.getRange(1, newCol).setValue('PR Badge');
    sheet.getRange(1, newCol).setFontWeight('bold');
    console.log('Added "PR Badge" column');
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
    console.log('✅ Test email sent to ' + testEmail);
    return true;
  } catch (error) {
    console.log('❌ Error sending test email: ' + error.toString());
    return false;
  }
}