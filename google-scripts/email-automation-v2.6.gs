// WDHC Google Apps Script - Complete Form Handler + Email Automation v2.6
// For Custom Form Submissions Sheet with Grip Age Calculation
// Version 2.6: Fixed email automation trigger bug, added direct sheet/row function

// ========== FORM HANDLER ==========
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK',
    message: 'WDHC Form Handler v2.6 is running',
    version: '2.6'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Validate
    const validation = validateFormData(data);
    if (!validation.valid) {
      return createErrorResponse(validation.message, 400);
    }
    
    // Get sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Custom Form Submissions');
    if (!sheet) return createErrorResponse('Custom Form Submissions sheet not found', 500);
    
    // Add row
    const rowData = createRowData(data);
    sheet.appendRow(rowData);
    
    // Trigger email
    const lastRow = sheet.getLastRow();
    triggerEmailAutomation(sheet, lastRow);
    
    return createSuccessResponse({
      success: true,
      message: 'Submission successful! Check your email.',
      submissionId: 'WDHC-' + new Date().getTime()
    });
    
  } catch (error) {
    return createErrorResponse('Server error: ' + error.message, 500);
  }
}

function validateFormData(data) {
  const required = ['athleteName', 'email', 'cityState', 'country', 'dob', 'gender', 'weight', 'attemptDate', 'hangTime', 'videoUrl', 'hearAbout', 'consent'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    return { valid: false, message: 'Missing required fields: ' + missing.join(', ') };
  }
  
  // Validate consent
  if (data.consent !== true) {
    return { valid: false, message: 'Consent must be accepted' };
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { valid: false, message: 'Invalid email format' };
  }
  
  // Validate hang time format
  const timeRegex = /^(\d+):([0-5]\d)$/;
  if (!timeRegex.test(data.hangTime)) {
    return { valid: false, message: 'Invalid hang time format. Use MM:SS' };
  }
  
  return { valid: true };
}

function createRowData(data) {
  const now = new Date();
  return [
    now.toISOString(), // Timestamp
    data.athleteName,
    data.email,
    data.cityState,
    data.country,
    data.dob,
    data.gender,
    parseFloat(data.weight),
    parseFloat(data.height) || null,
    data.gripTraining,
    data.attemptDate,
    data.hangTime,
    data.videoUrl,
    data.hearAbout,
    data.consent ? 'Yes' : 'No'
  ];
}

function createSuccessResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function createErrorResponse(message, statusCode = 400) {
  const output = ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function triggerEmailAutomation(sheet, row) {
  // This function triggers the email automation
  // We'll call a modified version of sendWelcomeEmailOnNewRow that accepts sheet and row
  try {
    sendEmailForRow(sheet, row);
  } catch (error) {
    console.error('Email automation failed:', error);
    // Log more details for debugging
    console.error('Error details:', error.toString());
    console.error('Stack:', error.stack);
  }
}

// Modified version of sendWelcomeEmailOnNewRow that accepts sheet and row directly
function sendEmailForRow(sheet, rowNumber) {
  try {
    const sheetName = sheet.getName();
    
    // Only process Custom Form Submissions sheet
    if (sheetName !== 'Custom Form Submissions') return;
    
    const data = sheet.getDataRange().getValues();
    const header = data[0];
    
    // Column indices (0-based)
    const emailCol = header.indexOf('Email Address');
    const nameCol = header.indexOf('Athlete Name');
    const timeCol = header.indexOf('Official Time');
    const dobCol = header.indexOf('Date of Birth');
    const genderCol = header.indexOf('Gender');
    const weightCol = header.indexOf('Bodyweight lbs');
    const heightCol = header.indexOf('Height inches');
    const trainingCol = header.indexOf('Grip Training Experience');
    
    if (emailCol === -1 || nameCol === -1 || timeCol === -1 || dobCol === -1 || genderCol === -1 || weightCol === -1) {
      console.error('Required columns not found');
      return;
    }
    
    // Use the specific row number passed in
    const rowIndex = rowNumber - 1; // Convert to 0-based index
    if (rowIndex >= data.length) {
      console.error('Row index out of bounds:', rowNumber);
      return;
    }
    
    const row = data[rowIndex];
    const email = row[emailCol];
    const name = row[nameCol];
    const timeStr = row[timeCol];
    const dob = row[dobCol];
    const gender = row[genderCol];
    const weight = parseFloat(row[weightCol]);
    const height = row[heightCol] ? parseFloat(row[heightCol]) : null;
    const training = row[trainingCol];
    
    if (!email || !name || !timeStr || !dob || !gender || !weight) {
      console.error('Missing required data in row:', rowNumber);
      return;
    }
    
    // Calculate values
    const age = calculateAge(dob);
    const hangTimeSeconds = parseTimeToSeconds(timeStr);
    const formattedTime = formatTime(hangTimeSeconds);
    const gripAge = calculateGripAge(age, hangTimeSeconds, weight, gender, height, training);
    const tier = determineTier(hangTimeSeconds);
    const prInfo = getPRInfo(sheet, email, hangTimeSeconds);
    const randomBenefit = getRandomBenefit();
    
    const firstName = name.split(' ')[0];
    let personalMessage = '';
    if (prInfo.submissionCount === 1) {
      personalMessage = `Welcome to the WDHC! Your first hang of <strong>${formattedTime}</strong> is officially submitted—that's an awesome start! Our team will review your video proof.`;
    } else if (prInfo.submissionCount === 2) {
      personalMessage = 'Second submission received—great consistency! Our team will review your video proof.';
    } else if (prInfo.submissionCount === 3) {
      personalMessage = 'Third submission received—keep it up! Our team will review your video proof.';
    } else {
      personalMessage = `Submission #${prInfo.submissionCount} received—you're becoming a WDHC regular! Our team will review your video proof.`;
    }

    // Subject line
    let subject;
    if (prInfo.submissionCount === 1) {
      subject = `Welcome to WDHC, ${firstName}! Your ${formattedTime} hang is submitted`;
    } else if (prInfo.isPR) {
      subject = `New PR! ${firstName} just hung for ${formattedTime} in WDHC`;
    } else {
      subject = `WDHC Submission: ${firstName} hung for ${formattedTime}`;
    }
    
    // PR badge HTML
    const prBadge = prInfo.isPR ? 
      `<div style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0;">
        🏆 PERSONAL RECORD
      </div>` : '';
    
    // Tier badge HTML
    const tierBadge = `
      <div style="background: ${tier.color}; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; font-weight: bold; margin: 10px 0; border: 3px solid ${tier.color}20;">
        ${tier.name.toUpperCase()} TIER
      </div>
    `;
    
    // Next tier progress
    let nextTierHTML = '';
    if (tier.nextThreshold) {
      const secondsToNext = tier.nextThreshold - hangTimeSeconds;
      const formattedNext = formatTime(tier.nextThreshold);
      const trainingTip = getTrainingTip(secondsToNext);
      nextTierHTML = `
        <div style="margin: 15px 0; padding: 20px; background: #f8f9fa; border-radius: 10px; border-left: 4px solid ${tier.color};">
          <div style="margin-bottom: 10px;">
            <strong>Next Tier:</strong> ${formattedNext} (${secondsToNext} more seconds to ${determineTier(tier.nextThreshold).name})
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
            <strong style="color: #2c3e50;">🎯 Training Tip to Reach ${determineTier(tier.nextThreshold).name}:</strong><br>
            ${trainingTip}
          </div>
        </div>
      `;
    }
    
    // Previous best comparison
    let previousBestHTML = '';
    if (prInfo.previousBest && !prInfo.isPR) {
      previousBestHTML = `
        <div style="margin: 15px 0; padding: 15px; background: #fff3cd; border-radius: 10px; border-left: 4px solid #ffc107;">
          <strong>Previous Best:</strong> ${prInfo.previousBest}
        </div>
      `;
    }
    
    // HTML email template (same as before)
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
    .card { background: white; border-radius: 10px; padding: 25px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
    .stat-label { font-size: 14px; color: #7f8c8d; margin-top: 5px; }
    .highlight { color: #e74c3c; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #7f8c8d; font-size: 14px; }
    .benefit { background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4caf50; }
    @media (max-width: 600px) {
      .stats-grid { grid-template-columns: 1fr; }
      .card { padding: 15px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://raw.githubusercontent.com/milobirk/world-dead-hang/main/assets/logo.png" alt="WDHC Logo" class="logo">
    <h1 style="color: #2c3e50; margin-bottom: 5px;">World Dead Hang Championship</h1>
    <p style="color: #7f8c8d; margin-top: 0;">Official Submission Confirmation</p>
  </div>
  
  <div class="card">
    <h2 style="color: #2c3e50; margin-top: 0;">Hey ${firstName}!</h2>
    <p>${personalMessage}</p>
    
    ${prBadge}
    ${tierBadge}
    
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value">${formattedTime}</div>
        <div class="stat-label">Hang Time</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${age}</div>
        <div class="stat-label">Chronological Age</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${gripAge}</div>
        <div class="stat-label">Grip Age</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${weight} lbs</div>
        <div class="stat-label">Bodyweight</div>
      </div>
    </div>
    
    <!-- Grip Age Comparison -->
    ${getGripAgeComparison(gripAge, age)}
    
    <!-- Grip Age Explanation -->
    <div style="margin: 20px 0; padding: 20px; background: #f0f8ff; border-radius: 10px; border-left: 4px solid #2196f3;">
      <strong style="color: #1976d2;">🔬 How Grip Age is Calculated:</strong><br><br>
      Your grip age is more than just a number—it's a <strong>biomarker of overall health</strong>. Research shows grip strength is a <strong>better predictor of all-cause mortality than blood pressure, cholesterol, or even smoking status</strong>.<br><br>
      
      <strong>Our formula considers:</strong><br>
      1. <strong>Hang Time</strong> (primary factor)<br>
      2. <strong>Bodyweight</strong> (strength-to-weight ratio)<br>
      3. <strong>Age & Gender</strong> (population norms)<br>
      4. <strong>Height & Training Experience</strong> (hidden factors)<br><br>
      
      <strong>Why it matters:</strong> Grip strength correlates with:<br>
      • Muscle mass & sarcopenia risk<br>
      • Cognitive function & brain health<br>
      • Bone density & fracture risk<br>
      • Cardiovascular health & longevity<br><br>
      
      <em>Improving your grip age isn't just about hanging longer—it's about living better, longer.</em>
    </div>
    
    ${previousBestHTML}
    ${nextTierHTML}
    
    <div class="benefit">
      <strong>💪 Grip Benefit:</strong> ${randomBenefit}
    </div>
    
    <p><strong>Submission Details:</strong></p>
    <ul>
      <li><strong>Athlete:</strong> ${name}</li>
      <li><strong>Location:</strong> ${row[header.indexOf('City/State')] || 'N/A'}, ${row[header.indexOf('Country')] || 'N/A'}</li>
      <li><strong>Gender:</strong> ${gender}</li>
      <li><strong>Attempt Date:</strong> ${row[header.indexOf('Attempt Date')] || 'N/A'}</li>
      <li><strong>Video Proof:</strong> <a href="${row[header.indexOf('Video URL')] || '#'}">View Submission</a></li>
    </ul>
    
    <p><strong>What's next?</strong></p>
    <ol>
      <li>Your submission has been added to the <a href="https://b2083508.world-dead-hang.pages.dev/leaderboard-full.html">WDHC Leaderboard</a></li>
      <li>Check your ranking and see how you compare to athletes worldwide</li>
      <li>Share your achievement on social media using #WDHC</li>
      <li>Train smart and submit again to improve your time!</li>
    </ol>
  </div>
  
  <div class="footer">
    <p>This is an automated message from the World Dead Hang Championship.</p>
    <p>Questions? Reply to this email or visit <a href="https://b2083508.world-dead-hang.pages.dev">world-dead-hang.pages.dev</a></p>
    <p>© ${new Date().getFullYear()} World Dead Hang Championship. All rights reserved.</p>
  </div>
</body>
</html>`;
    
    // Send email
    GmailApp.sendEmail(email, subject, '', {
      htmlBody: htmlBody,
      name: 'World Dead Hang Championship',
      replyTo: 'milobirk@gmail.com'
    });
    
    console.log(`Email sent to ${email} for ${formattedTime} hang`);
    
  } catch (error) {
    console.error('Error in sendEmailForRow:', error);
  }
}

// ========== UTILITY FUNCTIONS FOR EMAIL AUTOMATION ==========
function parseTimeToSeconds(timeStr) {
  if (!timeStr || timeStr === '' || timeStr === 'N/A') return null;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseFloat(timeStr);
}

function formatTime(seconds) {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function calculateGripAge(age, hangTimeSeconds, weight, gender, height, training) {
  // Base grip age starts at chronological age
  let gripAge = age;
  
  // Time adjustment: better time = younger grip age
  const referenceTime = gender === 'Male' ? 60 : 45; // Reference times in seconds
  if (hangTimeSeconds > referenceTime) {
    const timeBonus = (hangTimeSeconds - referenceTime) / 10; // Every 10 seconds better = 1 year younger
    gripAge -= timeBonus;
  } else {
    const timePenalty = (referenceTime - hangTimeSeconds) / 10; // Every 10 seconds worse = 1 year older
    gripAge += timePenalty;
  }
  
  // Weight adjustment: lighter = advantage
  const referenceWeight = gender === 'Male' ? 175 : 140; // Reference weights in lbs
  if (weight < referenceWeight) {
    const weightBonus = (referenceWeight - weight) / 10; // Every 10 lbs lighter = 0.5 years younger
    gripAge -= (weightBonus * 0.5);
  } else {
    const weightPenalty = (weight - referenceWeight) / 10; // Every 10 lbs heavier = 0.5 years older
    gripAge += (weightPenalty * 0.5);
  }
  
  // Height adjustment (NEW in v2.2)
  if (height) {
    if (height > 72) { // Taller than 6ft
      gripAge *= 0.9; // 10% younger (taller athletes have advantage)
    } else if (height < 66) { // Shorter than 5'6"
      gripAge *= 1.1; // 10% older (shorter athletes have disadvantage)
    }
  }
  
  // Training experience adjustment (NEW in v2.2)
  const trainingMultipliers = {
    'None/First time': 1.2,   // 20% younger (beginners get credit)
    'Beginner': 1.1,          // 10% younger
    'Intermediate': 0.9,      // 10% older (more experienced = higher expectations)
    'Advanced': 0.8,
    'Competitor': 0.8,
    'Climber': 0.8,
    'Powerlifter': 0.8
  };
  
  if (training && trainingMultipliers[training]) {
    gripAge *= trainingMultipliers[training];
  }
  
  // Ensure grip age is reasonable (not negative, not too old)
  gripAge = Math.max(10, Math.min(100, gripAge));
  
  return Math.round(gripAge * 10) / 10; // Round to 1 decimal
}

function determineTier(hangTimeSeconds) {
  if (!hangTimeSeconds) return { name: 'N/A', color: '#666666', nextThreshold: 0 };
  
  if (hangTimeSeconds >= 180) {
    return { name: 'Legend', color: '#FFD700', nextThreshold: null };
  } else if (hangTimeSeconds >= 120) {
    return { name: 'Elite', color: '#C0C0C0', nextThreshold: 180 };
  } else if (hangTimeSeconds >= 60) {
    return { name: 'Pro', color: '#CD7F32', nextThreshold: 120 };
  } else if (hangTimeSeconds >= 30) {
    return { name: 'Intermediate', color: '#4CAF50', nextThreshold: 60 };
  } else {
    return { name: 'Beginner', color: '#2196F3', nextThreshold: 30 };
  }
}

function getPRInfo(sheet, email, currentTimeSeconds) {
  const data = sheet.getDataRange().getValues();
  const header = data[0];
  
  const emailCol = header.indexOf('Email Address') + 1;
  const timeCol = header.indexOf('Official Time') + 1;
  
  if (emailCol === 0 || timeCol === 0) {
    return { isPR: true, submissionCount: 1, previousBest: null };
  }
  
  let submissionCount = 0;
  let previousBest = null;
  
  for (let i = 1; i < data.length; i++) {
    const rowEmail = data[i][emailCol - 1];
    const rowTime = parseTimeToSeconds(data[i][timeCol - 1]);
    
    if (rowEmail === email) {
      submissionCount++;
      if (rowTime && (previousBest === null || rowTime > previousBest)) {
        previousBest = rowTime;
      }
    }
  }
  
  const isPR = previousBest === null || currentTimeSeconds > previousBest;
  
  return {
    isPR,
    submissionCount,
    previousBest: previousBest ? formatTime(previousBest) : null
  };
}

function getRandomBenefit() {
  const benefits = [
    "Improves grip strength for daily tasks",
    "Reduces risk of age-related grip decline",
    "Enhances forearm muscle endurance",
    "Supports wrist stability and injury prevention",
    "Boosts mental toughness and focus",
    "Improves climbing and pulling performance",
    "Helps maintain independence in later years",
    "Strengthens tendons and connective tissue"
  ];
  return benefits[Math.floor(Math.random() * benefits.length)];
}

function getTrainingTip(secondsToNext) {
  const tips = [
    `Try adding <strong>dead hangs 2-3 times per week</strong> after your regular workout. Start with 3 sets of 50-70% of your max time.`,
    `Focus on <strong>forearm-specific exercises</strong> like farmer's walks, wrist curls, and plate pinches to build supporting muscles.`,
    `Improve your <strong>mental endurance</strong> by practicing breathing techniques during your hangs—slow, deep breaths help you relax and last longer.`,
    `Incorporate <strong>grip-specific training</strong> like towel hangs or thick bar work to challenge your grip in different ways.`,
    `Work on <strong>scapular engagement</strong>—actively pull your shoulder blades down and back during the hang to reduce strain on your arms.`,
    `Try <strong>greasing the groove</strong>—do multiple short hangs throughout the day (30-50% of max) to build endurance without fatigue.`,
    `Focus on <strong>body tension</strong>—engage your core, glutes, and legs to create a solid foundation and reduce swinging.`,
    `Practice <strong>negative training</strong>—jump up to the bar and lower yourself as slowly as possible to build eccentric strength.`
  ];
  
  // Add a specific tip based on how many seconds they need
  let specificTip = '';
  if (secondsToNext <= 10) {
    specificTip = `You're <strong>so close</strong> to the next tier! Focus on mental toughness—those last few seconds are often psychological.`;
  } else if (secondsToNext <= 30) {
    specificTip = `Aim for <strong>consistent small improvements</strong>. Adding just 1-2 seconds per session will get you there in a few weeks.`;
  } else if (secondsToNext <= 60) {
    specificTip = `Break it down—try to add <strong>5 seconds per week</strong>. That's less than 1 second per day of improvement!`;
  } else {
    specificTip = `Set <strong>intermediate goals</strong>. Aim for 10-second improvements every 2-3 weeks rather than trying to jump all at once.`;
  }
  
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  return `${specificTip}<br><br><strong>Pro Tip:</strong> ${randomTip}`;
}

function getGripAgeComparison(gripAge, chronologicalAge) {
  const ageDifference = gripAge - chronologicalAge;
  const absoluteDifference = Math.abs(ageDifference);
  
  if (ageDifference < -5) {
    // Much younger grip age (5+ years younger)
    return `
      <div style="margin: 15px 0; padding: 20px; background: linear-gradient(135deg, #e8f5e9, #c8e6c9); border-radius: 10px; border-left: 4px solid #4caf50;">
        <strong style="color: #2e7d32;">🎉 Amazing Grip Age!</strong><br>
        Your grip age is <strong>${absoluteDifference} years younger</strong> than your chronological age. 
        This means your grip strength is performing like someone ${absoluteDifference} years younger—excellent work!
      </div>
    `;
  } else if (ageDifference < 0) {
    // Slightly younger grip age (1-4 years younger)
    return `
      <div style="margin: 15px 0; padding: 20px; background: #e8f5e9; border-radius: 10px; border-left: 4px solid #4caf50;">
        <strong style="color: #2e7d32;">👍 Strong Grip!</strong><br>
        Your grip age is <strong>${absoluteDifference} years younger</strong> than your chronological age. 
        You're maintaining better-than-average grip strength for your age—keep it up!
      </div>
    `;
  } else if (ageDifference === 0) {
    // Same age
    return `
      <div style="margin: 15px 0; padding: 20px; background: #fff3e0; border-radius: 10px; border-left: 4px solid #ff9800;">
        <strong style="color: #ef6c00;">📊 Solid Foundation!</strong><br>
        Your grip age matches your chronological age. This is a <strong>great starting point</strong>—most people's 
        grip strength declines faster than their age. You're maintaining what you have, which is an achievement!
      </div>
    `;
  } else if (ageDifference <= 5) {
    // Slightly older grip age (1-5 years older)
    return `
      <div style="margin: 15px 0; padding: 20px; background: #fff3e0; border-radius: 10px; border-left: 4px solid #ff9800;">
        <strong style="color: #ef6c00;">💪 Room for Growth!</strong><br>
        Your grip age is <strong>${absoluteDifference} years older</strong> than your chronological age. 
        This is <strong>completely normal</strong> for beginners—grip strength is a skill that improves quickly with practice. 
        The training tips above will help you close this gap!
      </div>
    `;
  } else {
    // Much older grip age (5+ years older)
    return `
      <div style="margin: 15px 0; padding: 20px; background: #ffebee; border-radius: 10px; border-left: 4px solid #f44336;">
        <strong style="color: #c62828;">🚀 Huge Potential!</strong><br>
        Your grip age is <strong>${absoluteDifference} years older</strong> than your chronological age. 
        This means you have <strong>massive room for improvement</strong>—which is exciting! Grip strength responds 
        quickly to training, so you'll see dramatic progress as you practice. Check the training tips above!
      </div>
    `;
  }
}

// ========== EMAIL AUTOMATION ==========
function sendWelcomeEmailOnNewRow(e) {
  try {
    const ss = e.source;
    const sheet = ss.getActiveSheet();
    const sheetName = sheet.getName();
    
    // Only process Custom Form Submissions sheet
    if (sheetName !== 'Custom Form Submissions') return;
    
    const lastRow = sheet.getLastRow();
    const data = sheet.getDataRange().getValues();
    const header = data[0];
    
    // Column indices (0-based)
    const emailCol = header.indexOf('Email Address');
    const nameCol = header.indexOf('Athlete Name');
    const timeCol = header.indexOf('Official Time');
    const dobCol = header.indexOf('Date of Birth');
    const genderCol = header.indexOf('Gender');
    const weightCol = header.indexOf('Bodyweight lbs');
    const heightCol = header.indexOf('Height inches');
    const trainingCol = header.indexOf('Grip Training Experience');
    
    if (emailCol === -1 || nameCol === -1 || timeCol === -1 || dobCol === -1 || genderCol === -1 || weightCol === -1) {
      console.error('Required columns not found');
      return;
    }
    
    const row = data[lastRow - 1];
    const email = row[emailCol];
    const name = row[nameCol];
    const timeStr = row[timeCol];
    const dob = row[dobCol];
    const gender = row[genderCol];
    const weight = parseFloat(row[weightCol]);
    const height = row[heightCol] ? parseFloat(row[heightCol]) : null;
    const training = row[trainingCol];
    
    if (!email || !name || !timeStr || !dob || !gender || !weight) {
      console.error('Missing required data in row:', lastRow);
      return;
    }
    
    // Calculate values
    const age = calculateAge(dob);
    const hangTimeSeconds = parseTimeToSeconds(timeStr);
    const formattedTime = formatTime(hangTimeSeconds);
    const gripAge = calculateGripAge(age, hangTimeSeconds, weight, gender, height, training);
    const tier = determineTier(hangTimeSeconds);
    const prInfo = getPRInfo(sheet, email, hangTimeSeconds);
    const randomBenefit = getRandomBenefit();
    
    const firstName = name.split(' ')[0];
    let personalMessage = '';
    if (prInfo.submissionCount === 1) {
      personalMessage = `Welcome to the WDHC! Your first hang of <strong>${formattedTime}</strong> is officially submitted—that's an awesome start! Our team will review your video proof.`;
    } else if (prInfo.submissionCount === 2) {
      personalMessage = 'Second submission received—great consistency! Our team will review your video proof.';
    } else if (prInfo.submissionCount === 3) {
      personalMessage = 'Third submission received—keep it up! Our team will review your video proof.';
    } else {
      personalMessage = `Submission #${prInfo.submissionCount} received—you're becoming a WDHC regular! Our team will review your video proof.`;
    }

    // Subject line
    let subject;
    if (prInfo.submissionCount === 1) {
      subject = `Welcome to WDHC, ${firstName}! Your ${formattedTime} hang is submitted`;
    } else if (prInfo.isPR) {
      subject = `New PR! ${firstName} just hung for ${formattedTime} in WDHC`;
    } else {
      subject = `WDHC Submission: ${firstName} hung for ${formattedTime}`;
    }
    
    // PR badge HTML
    const prBadge = prInfo.isPR ? 
      `<div style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0;">
        🏆 PERSONAL RECORD
      </div>` : '';
    
    // Tier badge HTML
    const tierBadge = `
      <div style="background: ${tier.color}; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; font-weight: bold; margin: 10px 0; border: 3px solid ${tier.color}20;">
        ${tier.name.toUpperCase()} TIER
      </div>
    `;
    
    // Next tier progress
    let nextTierHTML = '';
    if (tier.nextThreshold) {
      const secondsToNext = tier.nextThreshold - hangTimeSeconds;
      const formattedNext = formatTime(tier.nextThreshold);
      const trainingTip = getTrainingTip(secondsToNext);
      nextTierHTML = `
        <div style="margin: 15px 0; padding: 20px; background: #f8f9fa; border-radius: 10px; border-left: 4px solid ${tier.color};">
          <div style="margin-bottom: 10px;">
            <strong>Next Tier:</strong> ${formattedNext} (${secondsToNext} more seconds to ${determineTier(tier.next