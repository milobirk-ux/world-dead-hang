// WDHC Email Automation with PR Tracking - FIXED TIME PARSING
// This script sends personalized emails and tracks Personal Records (PRs)
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

  function calculateGripAge(seconds) {
    if (seconds >= 240) return '20s';
    if (seconds >= 180) return '30s';
    if (seconds >= 120) return '40s';
    if (seconds >= 90) return '50s';
    if (seconds >= 60) return '60s';
    if (seconds >= 45) return '70s';
    if (seconds >= 30) return '80s';
    return '90s';
  }

  // Process each row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const email = row[emailColIndex];
    const name = row[nameColIndex];
    const timeStr = row[timeColIndex];
    const dob = row[dobColIndex];
    const gender = row[genderColIndex];
    const weight = row[weightColIndex];
    const approved = approvedColIndex >= 0 ? row[approvedColIndex] : false;
    const alreadyEmailed = emailedCol >= 0 ? row[emailedCol] : false;
    
    // Skip if no email, already emailed, or not approved
    if (!email || alreadyEmailed || !approved) continue;
    
    // Parse time
    const seconds = parseTimeToSeconds(timeStr);
    const formattedTime = formatSecondsToMinutes(seconds);
    const gripAge = calculateGripAge(seconds);
    
    // Calculate age if DOB provided
    let age = null;
    if (dob && dob instanceof Date) {
      age = calculateAgeFromDOB(dob);
    }
    
    // Check if this is a PR
    let isPR = false;
    let previousBest = '';
    
    if (prCol >= 0 && previousBestCol >= 0) {
      // Find all previous submissions by this athlete
      const athleteTimes = [];
      for (let j = 1; j < i; j++) {
        const prevRow = data[j];
        const prevName = prevRow[nameColIndex];
        const prevTimeStr = prevRow[timeColIndex];
        const prevApproved = approvedColIndex >= 0 ? prevRow[approvedColIndex] : false;
        
        if (prevName === name && prevApproved) {
          const prevSeconds = parseTimeToSeconds(prevTimeStr);
          if (prevSeconds > 0) {
            athleteTimes.push(prevSeconds);
          }
        }
      }
      
      // Determine if this is a PR (longer time = better)
      if (athleteTimes.length === 0) {
        isPR = true;
        previousBest = 'First submission';
      } else {
        const bestPrevious = Math.max(...athleteTimes);
        if (seconds > bestPrevious) {
          isPR = true;
          previousBest = formatSecondsToMinutes(bestPrevious);
        } else {
          previousBest = formatSecondsToMinutes(bestPrevious);
        }
      }
      
      // Update PR columns
      activeSheet.getRange(i + 1, prCol + 1).setValue(isPR);
      activeSheet.getRange(i + 1, previousBestCol + 1).setValue(previousBest);
      
      // Add PR badge if applicable
      if (isPR && prBadgeColIndex >= 0) {
        activeSheet.getRange(i + 1, prBadgeColIndex + 1).setValue('🏆 PR');
      }
    }
    
    // Send email
    const subject = `Welcome to the World Dead Hang Championship, ${name}!`;
    
    let body = `Hi ${name},\n\n`;
    body += `Thank you for submitting your dead hang time!\n\n`;
    body += `📊 Your Submission Details:\n`;
    body += `• Time: ${formattedTime} (${timeStr})\n`;
    body += `• Grip Age: ${gripAge}\n`;
    
    if (age) body += `• Age: ${age}\n`;
    if (gender) body += `• Gender: ${gender}\n`;
    if (weight) body += `• Weight: ${weight} lbs\n`;
    
    body += `\n`;
    
    if (isPR) {
      body += `🎉 PERSONAL RECORD! This is your best time so far!\n`;
      if (previousBest !== 'First submission') {
        body += `Previous best: ${previousBest}\n`;
      }
      body += `\n`;
    }
    
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
  const approvedColIndex = headers.findIndex(h => h === 'Approved');
  const emailedCol = headers.findIndex(h => h === 'Emailed');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const email = row[emailColIndex];
    const name = row[nameColIndex];
    const timeStr = row[timeColIndex];
    const approved = approvedColIndex >= 0 ? row[approvedColIndex] : false;
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
      
      const subject = `Welcome to the World Dead Hang Championship, ${name}!`;
      const body = `Hi ${name},\n\nThank you for submitting your dead hang time of ${formattedTime} (${timeStr})!\n\nYour submission is now under review. Once approved, you'll appear on the official leaderboard.\n\nLeaderboard: https://worlddeadhang.com\n\nStay strong!\nThe WDHC Team`;
      
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