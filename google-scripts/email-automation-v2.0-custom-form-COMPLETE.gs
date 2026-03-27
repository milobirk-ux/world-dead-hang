// WDHC Email Automation with PR Tracking - v2.0 (Custom Form Submissions)
// UPDATED FOR CUSTOM FORM SUBMISSIONS SHEET WITH HEIGHT & GRIP TRAINING ENHANCEMENTS
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
  const emailColIndex = 3; // Column D (Email Address) - WAS 10
  const nameColIndex = 2; // Column C (Athlete Name) - WAS 3
  const timeColIndex = 12; // Column M (Official Time) - WAS 12 (same)
  const dobColIndex = 6; // Column G (Date of Birth) - WAS 7
  const genderColIndex = 7; // Column H (Gender) - WAS 8
  const weightColIndex = 8; // Column I (Bodyweight lbs) - WAS 9
  const heightColIndex = 9; // Column J (Height inches) - NEW FIELD
  const gripTrainingColIndex = 10; // Column K (Grip Training Experience) - NEW FIELD
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

  // ========== ENHANCED GRIP AGE CALCULATION (WITH HEIGHT & GRIP TRAINING) ==========
  function calculateWDHCGripAge(timeSeconds, age, weightLbs, gender, heightInches, gripTraining) {
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
    
    // Height adjustment (taller = harder)
    let heightFactor = 1.0;
    if (heightInches) {
      if (heightInches > 72) heightFactor = 0.9; // Over 6ft = 10% harder
      else if (heightInches < 66) heightFactor = 1.1; // Under 5'6" = 10% easier
    }
    
    // Grip training experience adjustment
    let trainingFactor = 1.0;
    if (gripTraining) {
      const training = gripTraining.toLowerCase();
      if (training.includes('none') || training.includes('first time')) trainingFactor = 1.2; // 20% easier
      else if (training.includes('beginner')) trainingFactor = 1.1; // 10% easier
      else if (training.includes('advanced') || training.includes('competitor') || training.includes('climber') || training.includes('powerlifter')) trainingFactor = 0.8; // 20% harder
      else if (training.includes('intermediate')) trainingFactor = 0.9; // 10% harder
    }
    
    const adjustedExpectedTime = (baseExpected * (refWeight / weightLbs) * 0.7) + (baseExpected * 0.3);
    const adjustedForHeightAndTraining = adjustedExpectedTime * heightFactor * trainingFactor;
    const performanceRatio = timeSeconds / adjustedForHeightAndTraining;
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
    let submissionCount = 0;
    
    // Look through all previous rows (above current row)
    for (let j = 1; j < currentRowIndex; j++) {
      const prevName = data[j][nameColIndex];
      if (prevName && prevName.toString().trim() === athleteName.toString().trim()) {
        submissionCount++;
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
      previousPRRow: bestRowIndex,
      submissionCount: submissionCount + 1 // +1 for current submission
    };
  }

  // Benefits for random facts
  const benefits = [
    "Did you know? Hanging for even 10-30 seconds a day decompresses your spine and creates space in your shoulder joints, reversing the effects of slouching.",
    "Did you know? A 10-30 second dead hang before your gym workout primes your nervous system, improves shoulder mobility, and activates your lats for better performance on pull-ups and rows.",
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
    const height = row[heightColIndex];
    const gripTraining = row[gripTrainingColIndex];
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

    // PR messaging - Clean and concise
    let prMessage = '';
    if (isPR) {
      if (prInfo.bestTime > 0) {
        prMessage = `
<div style="margin: 20px 0; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px;">
  <p style="margin: 0 0 8px 0; font-size: 1em; font-weight: 600;">New Personal Record</p>
  <p style="margin: 0; font-size: 0.95em; color: #555;">
    You beat your previous best of ${prInfo.bestTimeFormatted} by ${improvementFormatted}. This submission will receive the PR badge.
  </p>
</div>`;
      } else {
        // First submission is now celebrated in the greeting message, no separate PR message needed
        prMessage = '';
      }
    } else if (prInfo.bestTime > 0) {
      prMessage = `
<div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px;">
  <p style="margin: 0 0 8px 0; font-size: 1em; font-weight: 600;">Not a Personal Record</p>
  <p style="margin: 0; font-size: 0.95em; color: #555;">
    This time of ${formattedTime} didn't beat your PR of ${prInfo.bestTimeFormatted}. Every hang makes you stronger.
  </p>
</div>`;
    }

    // Grip Age HTML
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
        const heightNum = height ? parseFloat(String(height).trim()) : null;
        const gripTrainingStr = gripTraining ? String(gripTraining).trim() : '';

        if (isNaN(weightNum) || weightNum <= 0) {
          throw new Error("Invalid weight value");
        }

        const gripAgeResult = calculateWDHCGripAge(totalSeconds, age, weightNum, genderStr, heightNum, gripTrainingStr);
        const yearsSavedText = gripAgeResult.yearsSaved > 0 ? 
          gripAgeResult.yearsSaved + ' years younger' : 
          Math.abs(gripAgeResult.yearsSaved) + ' years older';

        // Enhanced grip age message with height and training factors
        if (gripAgeResult.yearsSaved > 0) {
          gripAgeMessage = 'Your grip is ' + yearsSavedText + ' than your actual age! That\'s elite-level hand strength. ';
          if (heightNum && heightNum > 72) gripAgeMessage += 'Especially impressive given your height! ';
          if (gripTrainingStr && (gripTrainingStr.includes('advanced') || gripTrainingStr.includes('competitor'))) {
            gripAgeMessage += 'Your advanced training is clearly paying off. ';
          }
          gripAgeMessage += 'To maintain this, try hanging for 10-30 seconds every day—it\'s the simplest way to preserve your grip longevity.';
          longevityFact =