// WDHC Email Automation with Advanced Grip Age Calculation - COMPLETE FIXED VERSION
// This script sends personalized emails with accurate grip age calculation
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

  // Helper functions
  function parseTimeToSeconds(timeStr) {
    let s = String(timeStr || '0').trim();
    
    // Handle empty or invalid
    if (!s || s === '0' || s === '') return 0;
    
    // Format 1: "MM:SS" (4:26 = 4 minutes 26 seconds)
    if (s.includes(':')) {
      let p = s.split(':');
      if (p.length === 2) {
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
      }
    }
    
    // Format 2: Decimal minutes "M.SS" (4.26 = 4 minutes 26 seconds)
    // This is the FIX: 4.26 should be 4 minutes 26 seconds, NOT 4 minutes 15.6 seconds
    if (s.includes('.')) {
      let parts = s.split('.');
      if (parts.length === 2) {
        let minutes = parseInt(parts[0]) || 0;
        let secondsStr = parts[1];
        
        // Handle cases like "4.26" where 26 is seconds
        // Also handle "4.5" where .5 means 30 seconds
        if (secondsStr.length === 1) {
          // Single digit after decimal: "4.5" = 4 minutes 30 seconds
          let seconds = parseInt(secondsStr) * 6; // .5 = 30 seconds
          return minutes * 60 + seconds;
        } else if (secondsStr.length === 2) {
          // Two digits after decimal: "4.26" = 4 minutes 26 seconds
          let seconds = parseInt(secondsStr);
          return minutes * 60 + seconds;
        }
      }
    }
    
    // Format 3: Just a number (assume seconds if < 120, minutes if >= 120)
    let num = parseFloat(s);
    if (isNaN(num)) return 0;
    
    if (num < 120) {
      // Likely seconds (e.g., "85" = 85 seconds)
      return Math.round(num);
    } else {
      // Likely minutes (e.g., "240" = 4 minutes)
      return Math.round(num) * 60;
    }
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

  // ADVANCED GRIP AGE CALCULATION (from your code)
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

    // Skip if not approved
    if (!isApproved) continue;

    // Parse time
    const seconds = parseTimeToSeconds(time);
    const formattedTime = formatSecondsToMinutes(seconds);
    
    // Calculate age if DOB provided
    let age = null;
    if (dob && dob instanceof Date) {
      age = calculateAgeFromDOB(dob);
    }
    
    // Calculate grip age (advanced calculation)
    let gripAgeResult = null;
    let simpleGripAge = '';
    
    if (age && weight && gender && seconds > 0) {
      // Use advanced calculation
      gripAgeResult = calculateWDHCGripAge(seconds, age, parseFloat(weight) || 150, gender);
      simpleGripAge = `Grip Age: ${gripAgeResult.gripAge} (${gripAgeResult.yearsSaved > 0 ? 'Younger' : 'Older'} by ${Math.abs(gripAgeResult.yearsSaved)} years)`;
    } else {
      // Use simple calculation
      if (seconds >= 240) simpleGripAge = 'Grip Age: 20s';
      else if (seconds >= 180) simpleGripAge = 'Grip Age: 30s';
      else if (seconds >= 120) simpleGripAge = 'Grip Age: 40s';
      else if (seconds >= 90) simpleGripAge = 'Grip Age: 50s';
      else if (seconds >= 60) simpleGripAge = 'Grip Age: 60s';
      else if (seconds >= 45) simpleGripAge = 'Grip Age: 70s';
      else if (seconds >= 30) simpleGripAge = 'Grip Age: 80s';
      else simpleGripAge = 'Grip Age: 90s';
    }
    
    // Find and update PRs
    const prInfo = findAndUpdatePRs(name, i, seconds);
    
    // Send email
    const subject = `Welcome to the World Dead Hang Championship, ${name}!`;
    
    let body = `Hi ${name},\n\n`;
    body += `Thank you for submitting your dead hang time!\n\n`;
    body += `📊 Your Submission Details:\n`;
    body += `• Time: ${formattedTime} (${time})\n`;
    body += `• ${simpleGripAge}\n`;
    
    if (gripAgeResult) {
      body += `• Performance Ratio: ${gripAgeResult.performanceRatio}x expected\n`;
    }
    
    if (age) body += `• Age: ${age}\n`;
    if (gender) body += `• Gender: ${gender}\n`;
    if (weight) body += `• Weight: ${weight} lbs\n`;
    
    body += `\n`;
    
    if (prInfo.isPR) {
      body += `🎉 PERSONAL RECORD! This is your best time so far!\n`;
      if (prInfo.bestTimeFormatted) {
        body += `Previous best: ${prInfo.bestTimeFormatted}\n`;
      } else {
        body += `This is your first submission!\n`;
      }
      body += `\n`;
    }
    
    // Add random benefit
    const randomBenefit = benefits[Math.floor(Math.random() * benefits.length)];
    body += `${randomBenefit}\n\n`;
    
    body += `Your submission is now under review. Once approved, you'll appear on the official leaderboard.\n\n`;
    body += `🔗 Leaderboard: https://worlddeadhang.com\n`;
    body += `📝 Rules & Guidelines: https://worlddeadhang.com/rules.html\n`;
    body += `🎥 Submit Video: https://worlddeadhang.com/submit.html\n\n`;
    body += `Stay strong and keep hanging!\n\n`;
    body += `The WDHC Team\n`;
    body += `World Dead Hang Championship`;
    
    try {
      MailApp.sendEmail(email, subject, body);
      console.log(`Email sent to ${name} (${email})`);
      
      // Mark as emailed
      if (emailedCol >= 0) {
        activeSheet.getRange(i + 1, emailedCol + 1).setValue(true);
      }
      
      // Update PR columns
      if (prCol >= 0) {
        activeSheet.getRange(i + 1, prCol + 1).setValue(prInfo.isPR);
      }
      if (previousBestCol >= 0) {
        const previousBest = prInfo.bestTimeFormatted || 'First submission';
        activeSheet.getRange(i + 1, previousBestCol + 1).setValue(previousBest);
      }
    } catch (error) {
      console.error(`Failed to send email to ${email}: ${error}`);
    }
  }
}

// Manual trigger function for testing
function manualSendAllPendingEmails() {
  const activeSheet = SpreadsheetApp.getActiveSheet();
  const data = activeSheet.getDataRange().getValues();
  const headers = data[0];
  
  const emailColIndex = 10; // Column K
  const nameColIndex = 3; // Column D
  const timeColIndex = 12; // Column M
  const dobColIndex = 7; // Column H
  const genderColIndex = 8; // Column I
  const weightColIndex = 9; // Column J
  const approvedColIndex = headers.findIndex(h => h === 'Approved');
  const emailedCol = headers.findIndex(h => h === 'Emailed');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const email = row[emailColIndex];
    const name = row[nameColIndex] || 'Athlete';
    const timeStr = row[timeColIndex] || '';
    const dob = row[dobColIndex];
    const gender = row[genderColIndex];
    const weight = row[weightColIndex];
    const approved = approvedColIndex >= 0 ? row[approvedColIndex] === 'Yes' : false;
    const alreadyEmailed = emailedCol >= 0 ? row[emailedCol] : false;
    
    if (email && approved && !alreadyEmailed) {
      // Parse time using fixed function
      function parseTimeToSeconds(timeStr) {
        let s = String(timeStr || '0').trim();
        
        if (!s || s === '0' || s === '') return 0;
        
        if (s.includes(':')) {
          let p = s.split(':');
          if (p.length === 2) {
            return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
          }
        }
        
        if (s.includes('.')) {
          let parts = s.split('.');
          if (parts.length === 2) {
            let minutes = parseInt(parts[0]) || 0;
            let secondsStr = parts[1];
            
            if (secondsStr.length === 1) {
              let seconds = parseInt(secondsStr) * 6;
              return minutes * 60 + seconds;
            } else if (secondsStr.length === 2) {
              let seconds = parseInt(secondsStr);
              return minutes * 60 + seconds;
            }
          }
        }
        
        let num = parseFloat(s);
        if (isNaN(num)) return 0;
        
        if (num < 120) {
          return Math.round(num);
        } else {
          return Math.round(num) * 60;
        }
      }
      
      const seconds = parseTimeToSeconds(timeStr);
      
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
      
      const formattedTime = formatSecondsToMinutes(seconds);
      
      // Simple grip age calculation
      let simpleGripAge = '';
      if (seconds >= 240) simpleGripAge = 'Grip Age: 20s';
      else if (seconds >= 180) simpleGripAge = 'Grip Age: 30s';
      else if (seconds >= 120) simpleGripAge = 'Grip Age: 40s';
      else if (seconds >= 90) simpleGripAge = 'Grip Age: 50s';
      else if (seconds >= 60) simpleGripAge = 'Grip Age: 60s';
      else if (seconds >= 45) simpleGripAge = 'Grip Age: 70s';
      else if (seconds >= 30) simpleGripAge = 'Grip Age: 80s';
      else simpleGripAge = 'Grip Age: 90s';
      
      const subject = `Welcome to the World Dead Hang Championship, ${name}!`;
      const body = `Hi ${name},\n\nThank you for submitting your dead hang time of ${formattedTime} (${timeStr})!\n\n${simpleGripAge}\n\nYour submission is now under review. Once approved, you'll appear on the official leaderboard.\n\nLeaderboard: https://worlddeadhang.com\n\nStay strong!\nThe WDHC Team`;
      
      try {
        MailApp.sendEmail(email, subject, body);
        console.log(`Manual email sent to ${name} (${email})`);
        
        if (emailedCol >= 0) {
          activeSheet.getRange(i + 1, emailedCol + 1).setValue(true);
        }
        
        // Add delay to avoid rate limits
        Utilities.sleep(1000);
      } catch (error) {
        console.error(`Failed to send manual email to ${email}: ${error}`);
      }
    }
  }
}

// Test time parsing function
function testTimeParsing() {
  const testCases = [
    ['4:26', 266],      // 4 minutes 26 seconds
    ['4.26', 266],      // 4 minutes 26 seconds (FIXED!)
    ['4.5', 270],       // 4 minutes 30 seconds
    ['1:30', 90],       // 1 minute 30 seconds
    ['2.15', 135],      // 2 minutes 15 seconds
    ['85', 85],         // 85 seconds
    ['240', 14400],     // 240 minutes (4 hours) - edge case
    ['0', 0],           // Zero
    ['', 0],            // Empty
    ['invalid', 0],     // Invalid
  ];
  
  console.log('Testing time parsing:');
  for (const [input, expected] of testCases) {
    const result = parseTimeToSeconds(input);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} "${input}" -> ${result} seconds (expected: ${expected})`);
  }
}

// Test grip age calculation
function testGripAgeCalculation() {
  console.log('\nTesting grip age calculation:');
  
  // Test cases: [timeSeconds, age, weight, gender, expectedGripAgeRange]
  const testCases = [
    [180, 35, 175, 'male', '25-35'],      // Good time for 35yo male
    [120, 35, 175, 'male', '35-45'],      // Average time
    [240, 35, 175, 'male', '15-25'],      // Excellent time
    [90, 35, 175, 'male', '45-55'],       // Below average
    [180, 35, 135, 'female', '25-35'],    // Good time for 35yo female
    [120, 35, 135, 'female', '35-45'],    // Average time
  ];
  
  for (const [time, age, weight, gender, expectedRange] of testCases) {
    const result = calculateWDHCGripAge(time, age, weight, gender);
    console.log(`${time}s, ${age}yo, ${weight}lbs, ${gender}: Grip Age = ${result.gripAge} (${result.yearsSaved > 0 ? 'Younger' : 'Older'} by ${Math.abs(result.yearsSaved)} years)`);
  }
}

// Helper function for test
function parseTimeToSeconds(timeStr) {
  let s = String(timeStr || '0').trim();
  
  if (!s || s === '0' || s === '') return 0;
  
  if (s.includes(':')) {
    let p = s.split(':');
    if (p.length === 2) {
      return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
    }
  }
  
  if (s.includes('.')) {
    let parts = s.split('.');
    if (parts.length === 2) {
      let minutes = parseInt(parts[0]) || 0;
      let secondsStr = parts[1];
      
      if (secondsStr.length === 1) {
        let seconds = parseInt(secondsStr) * 6;
        return minutes * 60 + seconds;
      } else if (secondsStr.length === 2) {
        let seconds = parseInt(secondsStr);
        return minutes * 60 + seconds;
      }
    }
  }
  
  let num = parseFloat(s);
  if (isNaN(num)) return 0;
  
  if (num < 120) {
    return Math.round(num);
  } else {
    return Math.round(num) * 60;
  }
}

// Helper function for test
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