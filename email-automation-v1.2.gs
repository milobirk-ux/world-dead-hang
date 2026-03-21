// WDHC Email Automation - CORRECTED VERSION for Milo's Sheet
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
  
  // Calculate grip age if DOB available
  let gripAge = null;
  if (dob instanceof Date) {
    gripAge = calculateGripAge(dob, seconds, gender, weight);
  }
  
  // Determine tier
  const tier = getTier(seconds);
  
  // Create email content
  const subject = `🎉 Welcome to the World Dead Hang Championship, ${name.split(' ')[0]}!`;
  const htmlBody = createEmailHTML(name, seconds, tier, gripAge, gender, weight);
  
  // Send email
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody,
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

function calculateGripAge(dob, seconds, gender, weight) {
  if (!(dob instanceof Date) || !seconds) return null;
  
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  // Simplified grip age calculation
  // Base expected time for age
  let expectedSeconds;
  if (age <= 20) expectedSeconds = 30;
  else if (age <= 30) expectedSeconds = 45;
  else if (age <= 40) expectedSeconds = 60;
  else if (age <= 50) expectedSeconds = 45;
  else expectedSeconds = 30;
  
  // Adjust for weight (reference: 175lbs male, 135lbs female)
  const refWeight = (gender && gender.toString().toLowerCase().includes('female')) ? 135 : 175;
  const actualWeight = parseFloat(weight) || refWeight;
  const weightFactor = actualWeight / refWeight;
  
  // Adjust for gender
  const genderFactor = (gender && gender.toString().toLowerCase().includes('female')) ? 1.2 : 1.0;
  
  const adjustedExpected = expectedSeconds * weightFactor * genderFactor;
  const performanceRatio = seconds / adjustedExpected;
  
  // Grip age formula: younger if performs better than expected
  const gripAge = Math.max(18, Math.min(80, Math.round(age * (1 / performanceRatio))));
  
  return {
    chronological: age,
    grip: gripAge,
    difference: gripAge - age,
    performanceRatio: performanceRatio.toFixed(2)
  };
}

function getTier(seconds) {
  if (seconds >= 360) return { name: 'Freak', color: '#FFD700', min: 360 };
  if (seconds >= 240) return { name: 'Legend', color: '#C0C0C0', min: 240 };
  if (seconds >= 180) return { name: 'Elite', color: '#CD7F32', min: 180 };
  if (seconds >= 120) return { name: 'Pro', color: '#4CAF50', min: 120 };
  if (seconds >= 60) return { name: 'Contender', color: '#2196F3', min: 60 };
  return { name: 'Challenger', color: '#9C27B0', min: 0 };
}

function createEmailHTML(name, seconds, tier, gripAge, gender, weight) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const timeDisplay = minutes > 0 ? 
    `${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}` :
    `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  
  let gripAgeHTML = '';
  if (gripAge) {
    const diff = gripAge.difference;
    const youngerOlder = diff < 0 ? 'younger' : 'older';
    const diffAbs = Math.abs(diff);
    gripAgeHTML = `
      <div style="margin: 20px 0; padding: 15px; background: rgba(212, 175, 55, 0.1); border-left: 4px solid #D4AF37; border-radius: 4px;">
        <h3 style="color: #D4AF37; margin: 0 0 10px 0;">Your WDHC Grip Age™: ${gripAge.grip}</h3>
        <p style="margin: 0; color: #ccc;">
          Based on your ${timeDisplay} hang${weight ? ` at ${weight}lbs` : ''}, 
          your biological grip age is ${gripAge.grip} (chronological age: ${gripAge.chronological}). 
          That's ${diffAbs} year${diffAbs !== 1 ? 's' : ''} ${youngerOlder}!
        </p>
      </div>
    `;
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to WDHC</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #fff;">
    <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-radius: 10px; padding: 30px; border: 1px solid #222;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 28px; font-weight: bold; color: #D4AF37; margin-bottom: 10px;">WORLD DEAD HANG CHAMPIONSHIP</div>
            <div style="color: #888; font-size: 16px;">Official Welcome Email</div>
        </div>
        
        <!-- Greeting -->
        <div style="margin-bottom: 30px;">
            <h1 style="color: #fff; margin: 0 0 10px 0;">Welcome, ${name.split(' ')[0]}! 🎉</h1>
            <p style="color: #ccc; margin: 0;">
                Thank you for submitting your dead hang to the World Dead Hang Championship. 
                Your submission has been received and is now part of the global leaderboard.
            </p>
        </div>
        
        <!-- Submission Details -->
        <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #D4AF37; margin: 0 0 15px 0; font-size: 20px;">📊 Your Submission Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #ccc; width: 40%;">Time:</td>
                    <td style="padding: 8px 0; color: #fff; font-weight: bold;">${timeDisplay} (${(seconds/60).toFixed(2)})</td>
                </tr>
                ${gender ? `<tr>
                    <td style="padding: 8px 0; color: #ccc;">Gender:</td>
                    <td style="padding: 8px 0; color: #fff;">${gender}</td>
                </tr>` : ''}
                ${weight ? `<tr>
                    <td style="padding: 8px 0; color: #ccc;">Weight:</td>
                    <td style="padding: 8px 0; color: #fff;">${weight} lbs</td>
                </tr>` : ''}
            </table>
        </div>
        
        <!-- Tier Badge -->
        <div style="text-align: center; margin: 30px 0; padding: 25px; background: rgba(${tier.name === 'Freak' ? '212,175,55' : tier.name === 'Legend' ? '192,192,192' : tier.name === 'Elite' ? '205,127,50' : '76,175,79'}, 0.1); border-radius: 10px; border: 2px solid ${tier.color};">
            <div style="font-size: 12px; color: #888; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 2px;">YOUR TIER</div>
            <div style="font-size: 32px; font-weight: bold; color: ${tier.color}; margin: 10px 0;">${tier.name}</div>
            <div style="color: #ccc; font-size: 14px; max-width: 400px; margin: 0 auto;">
                Congrats on hitting ${timeDisplay}! You're in the ${tier.name} tier${tier.min > 0 ? `, and you're ${tier.min - seconds} seconds away from leveling up to the next tier` : ''}.
            </div>
        </div>
        
        ${gripAgeHTML}
        
        <!-- Next Steps -->
        <div style="margin: 30px 0; padding: 20px; background: rgba(33, 150, 243, 0.1); border-radius: 8px; border-left: 4px solid #2196F3;">
            <h3 style="color: #2196F3; margin: 0 0 10px 0;">📝 What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #ccc;">
                <li>Your submission is now on the <a href="https://world-dead-hang.com" style="color: #4FC3F7; text-decoration: none;">live leaderboard</a></li>
                <li>Share your achievement on social media with #DeadHang #WDHC</li>
                <li>Check the <a href="https://world-dead-hang.com/rules.html" style="color: #4FC3F7; text-decoration: none;">official rules</a> for verification requirements</li>
                <li>Train and try to beat your time!</li>
            </ul>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; color: #666; font-size: 12px;">
            <p style="margin: 0 0 10px 0;">
                <a href="https://world-dead-hang.com" style="color: #888; text-decoration: none;">Leaderboard</a> • 
                <a href="https://world-dead-hang.com/rules.html" style="color: #888; text-decoration: none;">Rules</a> • 
                <a href="https://world-dead-hang.com/submit.html" style="color: #888; text-decoration: none;">Submit Again</a>
            </p>
            <p style="margin: 0;">© 2026 World Dead Hang Championship • Questions? Reply to this email</p>
            <p style="margin: 10px 0 0 0; font-size: 10px; color: #444;">This is an automated message from Milo at WDHC</p>
        </div>
    </div>
</body>
</html>
  `;
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
      htmlBody: '<h1>Test Email</h1><p>If you receive this, the email system works!</p>',
      name: "Milo - WDHC Test"
    });
    Logger.log('✅ Test email sent to ' + testEmail);
    return true;
  } catch (error) {
    Logger.log('❌ Error sending test email: ' + error.toString());
    return false;
  }
}
