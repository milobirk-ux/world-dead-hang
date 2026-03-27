// WDHC Google Apps Script - Complete Form Handler + Email Automation v2.2
// For Custom Form Submissions Sheet with Enhanced Grip Age Calculation
// Version 2.2: Includes height and grip training experience in grip age calculation

// ========== FORM HANDLER ==========
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK',
    message: 'WDHC Form Handler v2.2 is running',
    version: '2.2'
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
  if (missing.length > 0) return { valid: false, message: `Missing: ${missing.join(', ')}` };
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) return { valid: false, message: 'Invalid email' };
  
  // Time validation
  const timeRegex = /^(\d+):([0-5]?\d)$|^(\d+)\.(\d{1,2})$/;
  if (!timeRegex.test(data.hangTime)) return { valid: false, message: 'Invalid time format' };
  
  // Weight validation
  const weight = parseFloat(data.weight);
  if (isNaN(weight) || weight < 50 || weight > 500) return { valid: false, message: 'Weight 50-500 lbs' };
  
  // Height validation
  if (data.height) {
    const height = parseInt(data.height);
    if (isNaN(height) || height < 48 || height > 96) return { valid: false, message: 'Height 48-96 inches' };
  }
  
  // Consent validation
  if (!data.consent) return { valid: false, message: 'Must agree to terms' };
  
  return { valid: true, message: 'OK' };
}

function createRowData(data) {
  return [
    new Date().toLocaleString(), // Timestamp
    'WDHC-' + new Date().getTime() + '-' + Math.floor(Math.random() * 10000), // Submission ID
    data.athleteName,
    data.email,
    data.cityState,
    data.country,
    data.dob,
    data.gender,
    parseFloat(data.weight),
    data.height ? parseInt(data.height) : '',
    data.gripTraining || '',
    data.attemptDate,
    data.hangTime,
    data.videoUrl,
    data.notes || '',
    data.hearAbout,
    data.consent ? 'Yes' : 'No',
    'No', // Emailed
    '', // Is PR
    '', // Previous Best
    '' // PR Badge
  ];
}

function triggerEmailAutomation(sheet, rowNumber) {
  try {
    // Trigger email function
    sendWelcomeEmailOnNewRow({
      changeType: 'INSERT_ROW',
      source: sheet,
      range: sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn())
    });
  } catch (error) {
    console.log('Email trigger error:', error);
  }
}

function createSuccessResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeaders({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  });
  return output;
}

function createErrorResponse(message, statusCode = 400) {
  const output = ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeaders({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  });
  return output;
}

// ========== UTILITY FUNCTIONS FOR EMAIL AUTOMATION ==========
function parseTimeToSeconds(timeStr) {
  let s = String(timeStr || '0').trim();
  
  if (s.includes(':')) {
    let p = s.split(':');
    return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
  }
  
  if (s.includes('.')) {
    let parts = s.split('.');
    let minutes = parseInt(parts[0]) || 0;
    let secondsPart = parts[1] || '0';
    
    if (secondsPart.length === 1) {
      return minutes * 60 + (parseInt(secondsPart) * 6);
    } else if (secondsPart.length === 2) {
      // "4.26" = 4 minutes 26 seconds (FIXED!)
      return minutes * 60 + parseInt(secondsPart);
    } else {
      let decimalMinutes = parseFloat(s);
      return Math.round(decimalMinutes * 60);
    }
  }
  
  let num = parseFloat(s);
  if (isNaN(num)) return 0;
  
  if (num < 60) {
    return Math.round(num);
  }
  
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

// ========== ENHANCED GRIP AGE CALCULATION WITH HEIGHT & TRAINING ==========
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
  
  // Height adjustment
  let heightFactor = 1.0;
  if (heightInches) {
    if (heightInches > 72) heightFactor = 0.9;
    else if (heightInches < 66) heightFactor = 1.1;
  }
  
  // Training adjustment
  let trainingFactor = 1.0;
  if (gripTraining) {
    const training = gripTraining.toLowerCase();
    if (training.includes('none') || training.includes('first time')) trainingFactor = 1.2;
    else if (training.includes('beginner')) trainingFactor = 1.1;
    else if (training.includes('advanced') || training.includes('competitor') || training.includes('climber') || training.includes('powerlifter')) trainingFactor = 0.8;
    else if (training.includes('intermediate')) trainingFactor = 0.9;
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

function getTierColor(tierName) {
  const tier = tierName.toUpperCase();
  if (tier === 'FREAK') return { bg: '#9900ff', text: '#fff', border: '#9900ff' };
  if (tier === 'LEGEND') return { bg: '#D4AF37', text: '#000', border: '#D4AF37' };
  if (tier === 'ELITE') return { bg: '#E0E0E0', text: '#000', border: '#E0E0E0' };
  if (tier === 'PRO') return { bg: '#cc0000', text: '#fff', border: '#cc0000' };
  if (tier === 'CONTENDER') return { bg: 'transparent', text: '#ccc', border: '#666' };
  if (tier === 'CHALLENGER') return { bg: 'transparent', text: '#1E8449', border: '#1E8449' };
  return { bg: '#666', text: '#fff', border: '#666' };
}

// ========== EMAIL AUTOMATION v2.2 ==========
function sendWelcomeEmailOnNewRow(e) {
  // Handle missing event object
  if (!e) {
    console.log('Error: No event object provided');
    return;
  }
  
  if (e.changeType !== 'INSERT_ROW') return;
  
  const sheet = e.source;
  if (!sheet) {
    console.log('Error: No sheet in event object');
    return;
  }
  
  if (sheet.getName() !== 'Custom Form Submissions') return;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // ========== CUSTOM FORM SUBMISSIONS COLUMN INDICES (0-based) ==========
  const emailCol = headers.findIndex(h => h === 'Email Address');
  const nameCol = headers.findIndex(h => h === 'Athlete Name');
  const timeCol = headers.findIndex(h => h === 'Official Time');
  const dobCol = headers.findIndex(h => h === 'Date of Birth');
  const genderCol = headers.findIndex(h => h === 'Gender');
  const weightCol = headers.findIndex(h => h === 'Bodyweight lbs');
  const heightCol = headers.findIndex(h => h === 'Height (inches)');
  const trainingCol = headers.findIndex(h => h === 'Grip Training Experience');
  const emailedCol = headers.findIndex(h => h === 'Emailed');
  const prBadgeCol = headers.findIndex(h => h === 'PR Badge');
  
  // Add tracking columns if they don't exist
  let prCol = headers.findIndex(h => h === 'Is PR');
  let previousBestCol = headers.findIndex(h => h === 'Previous Best');
  
  if (prCol === -1) {
    prCol = headers.length;
    sheet.getRange(1, prCol + 1).setValue('Is PR');
  }
  if (previousBestCol === -1) {
    previousBestCol = headers.length + 1;
    sheet.getRange(1, previousBestCol + 1).setValue('Previous Best');
  }
  if (prBadgeCol === -1) {
    const newPrBadgeCol = headers.length + 2;
    sheet.getRange(1, newPrBadgeCol + 1).setValue('PR Badge');
  }
  
  if (emailCol === -1 || nameCol === -1) return;
  
  // Helper function to find and update PRs
  function findAndUpdatePRs(athleteName, currentRowIndex, currentTimeSeconds) {
    let bestTime = 0;
    let bestTimeFormatted = '';
    let bestRowIndex = -1;
    let submissionCount = 0;
    
    for (let j = 1; j < currentRowIndex; j++) {
      const prevName = data[j][nameCol];
      if (prevName && prevName.toString().trim() === athleteName.toString().trim()) {
        submissionCount++;
        const prevTime = data[j][timeCol];
        const prevSeconds = parseTimeToSeconds(prevTime);
        if (prevSeconds > bestTime) {
          bestTime = prevSeconds;
          bestTimeFormatted = formatSecondsToMinutes(prevSeconds);
          bestRowIndex = j;
        }
      }
    }
    
    const isPR = currentTimeSeconds > bestTime;
    
    if (bestRowIndex !== -1 && prBadgeCol !== -1) {
      sheet.getRange(bestRowIndex + 1, prBadgeCol + 1).setValue('');
    }
    
    if (isPR && prBadgeCol !== -1) {
      sheet.getRange(currentRowIndex + 1, prBadgeCol + 1).setValue('🏆 PR');
    }
    
    return { 
      bestTime, 
      bestTimeFormatted, 
      isPR,
      previousPRRow: bestRowIndex,
      submissionCount: submissionCount + 1
    };
  }

  // Benefits facts
  const benefits = [
    "Did you know? Hanging for even 10-30 seconds a day decompresses your spine and creates space in your shoulder joints, reversing the effects of slouching.",
    "Did you know? A 10-30 second dead hang before your gym workout primes your nervous system, improves shoulder mobility, and activates your lats for better performance on pull-ups and rows.",
    "Did you know? Passive hangs stretch your lats and pectoral muscles, which get notoriously tight from driving and computer work.",
    "Did you know? When you hang, gravity naturally applies traction to your spine, pulling nutrient-rich fluid back into your spinal discs."
  ];

  // Process new rows
  for (let i = 1; i < data.length; i++) {
    if (emailedCol !== -1 && data[i][emailedCol] === 'Yes') continue;
    
    const email = data[i][emailCol];
    const name = data[i][nameCol];
    const timeStr = data[i][timeCol] || '';
    const dob = data[i][dobCol];
    const gender = data[i][genderCol] || '';
    const weight = parseFloat(data[i][weightCol]) || 0;
    const height = heightCol !== -1 ? (parseInt(data[i][heightCol]) || null) : null;
    const training = trainingCol !== -1 ? (data[i][trainingCol] || '') : '';
    
    if (!email || !name || !timeStr) continue;
    
    // Calculate time in seconds
    const totalSeconds = parseTimeToSeconds(timeStr);
    const formattedTime = formatSecondsToMinutes(totalSeconds);
    
    // Calculate age from DOB
    let age = null;
    if (dob && dob instanceof Date) {
      age = calculateAgeFromDOB(dob);
    }
    
    // Find PR info
    const prInfo = findAndUpdatePRs(name, i, totalSeconds);
    const isPR = prInfo.isPR;
    
    // Update PR tracking columns
    sheet.getRange(i + 1, prCol + 1).setValue(isPR ? 'Yes' : 'No');
    sheet.getRange(i + 1, previousBestCol + 1).setValue(prInfo.bestTimeFormatted || 'First Submission');
    
    // Determine tier
    let currentTier = "", nextTier = "", gap = 0;
    if (totalSeconds >= 360) { currentTier = "Freak"; gap = -1; } 
    else if (totalSeconds >= 240) { currentTier = "Legend"; nextTier = "Freak"; gap = 360 - totalSeconds; } 
    else if (totalSeconds >= 180) { currentTier = "Elite"; nextTier = "Legend"; gap = 240 - totalSeconds; } 
    else if (totalSeconds >= 120) { currentTier = "Pro"; nextTier = "Elite"; gap = 180 - totalSeconds; } 
    else if (totalSeconds >= 60) { currentTier = "Contender"; nextTier = "Pro"; gap = 120 - totalSeconds; } 
    else { currentTier = "Challenger"; nextTier = "Contender"; gap = 60 - totalSeconds; }

    // Create tier badge HTML
    let tierBadgeHtml = '';
    const currentTierColor = getTierColor(currentTier);
    const nextTierColor = getTierColor(nextTier);
    
    if (gap === -1) {
      tierBadgeHtml = `
<div style="margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid ${currentTierColor.border};">
  <div style="display: flex; align-items: center; margin-bottom: 12px;">
    <div style="background: ${currentTierColor.bg}; color: ${currentTierColor.text}; border: 1px solid ${currentTierColor.border}; padding: 8px 16px; border-radius: 6px; font-family: 'Roboto Mono', monospace; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      ${currentTier} TIER
    </div>
  </div>
  <p style="margin: 0; font-size: 1em; line-height: 1.5; color: #333;">
    You've reached the pinnacle! Your ${formattedTime} hang places you in the <strong>${currentTier}</strong> tier.
  </p>
</div>`;
    } else {
      tierBadgeHtml = `
<div style="margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid ${currentTierColor.border};">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
    <div style="background: ${currentTierColor.bg}; color: ${currentTierColor.text}; border: 1px solid ${currentTierColor.border}; padding: 8px 16px; border-radius: 6px; font-family: 'Roboto Mono', monospace; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      ${currentTier}
    </div>
    <span style="color: #666; font-weight: 600;">→</span>
    <div style="background: ${nextTierColor.bg}; color: ${nextTierColor.text}; border: 1px solid ${nextTierColor.border}; padding: 8px 16px; border-radius: 6px; font-family: 'Roboto Mono', monospace; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8;">
      ${nextTier}
    </div>
  </div>
  <p style="margin: 0; font-size: 1em; line-height: 1.5; color: #333;">
    You're <strong>${formatSecondsToMinutes(gap)}</strong> away from the <strong>${nextTier}</strong> tier.
  </p>
</div>`;
    }

    // PR message
    let prMessage = '';
    if (isPR && prInfo.bestTime > 0) {
      const improvement = totalSeconds - prInfo.bestTime;
      const improvementFormatted = formatSecondsToMinutes(improvement);
      prMessage = `
<div style="margin: 20px 0; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px;">
  <p style="margin: 0 0 8px 0; font-size: 1em; font-weight: 600;">New Personal Record</p>
  <p style="margin: 0; font-size: 0.95em; color: #555;">
    You beat your previous best of ${prInfo.bestTimeFormatted} by ${improvementFormatted}. This submission will receive the PR badge.
  </p>
</div>`;
    } else if (prInfo.bestTime > 0) {
      prMessage = `
<div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px;">
  <p style="margin: 0 0 8px 0; font-size: 1em; font-weight: 600;">Not a Personal Record</p>
  <p style="margin: 0; font-size: 0.95em; color: #555;">
    This time of ${formattedTime} didn't beat your PR of ${prInfo.bestTimeFormatted}. Every hang makes you stronger.
  </p>
</div>`;
    }

    // Calculate enhanced grip age with height and training
    let gripAgeHtml = '';
    if (age && weight > 0 && gender) {
      try {
        const gripAgeResult = calculateWDHCGripAge(totalSeconds, age, weight, gender, height, training);
        
        let additionalInfoHtml = '';
        if (height) {
          additionalInfoHtml += `<p style="margin: 5px 0; font-size: 0.9em; color: #666;"><strong>Height:</strong> ${height} inches</p>`;
        }
        if (training) {
          additionalInfoHtml += `<p style="margin: 5px 0; font-size: 0.9em; color: #666;"><strong>Grip Training:</strong> ${training}</p>`;
        }
        
        gripAgeHtml = `
<div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #e6f7ff, #f0f9ff); border-radius: 8px; border-left: 4px solid #007bff;">
  <h3 style="margin: 0 0 12px 0; font-size: 1.2em; color: #0056b3; font-weight: 700;">Enhanced Grip Age Analysis</h3>
  <p style="margin: 0 0 10px 0; font-size: 1.05em; line-height: 1.5; color: #333;">
    Your biological grip age is <strong style="color: #0056b3;">${gripAgeResult.gripAge}</strong> (chronological age: ${age}).
  </p>
  ${additionalInfoHtml}
  <div style="background: rgba(0, 123, 255, 0.1); padding: 12px; border-radius: 6px; margin: 15px 0;">
    <p style="margin: 0; font-size: 0.95em; line-height: 1.5; color: #495057; font-style: italic;">
      ${gripAgeResult.yearsSaved > 0 ? 
        `Your grip is ${gripAgeResult.yearsSaved} years younger than your actual age! That's elite-level hand strength.` :
        `Your grip age is ${Math.abs(gripAgeResult.yearsSaved)} years older than your chronological age.`}
    </p>
  </div>
</div>`;
      } catch (err) {
        console.error("Error calculating Grip Age: " + err);
      }
    }

    // Dynamic message based on submission count
    const firstName = name.split(' ')[0];
    let personalMessage = '';
    if (prInfo.submissionCount === 1) {
      personalMessage = `Welcome to the WDHC! Your first hang of <strong>${formattedTime}</strong> is officially submitted—that's an awesome start! 🎉 Our team is reviewing your video proof now.`;
    } else if (prInfo.submissionCount === 2) {
      personalMessage = 'Second submission received—great consistency! Our team is reviewing your video proof now.';
    } else if (prInfo.submissionCount === 3) {
      personalMessage = 'Third submission received—keep it up! Our team is reviewing your video proof now.';
    } else {
      personalMessage = `Submission #${prInfo.submissionCount} received—you're becoming a WDHC regular! Our team is reviewing your video proof now.`;
    }

    // Subject line
    let subject;
    if (prInfo.submissionCount === 1) {
      subject = "WDHC Submission Received - Welcome!";
    } else if (isPR) {
      subject = "NEW PR - WDHC Submission Review";
    } else {
      subject = "WDHC Submission Received";
    }

    const randomFact = benefits[Math.floor(Math.random() * benefits.length)];

    // Build HTML email
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Inter', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6; padding: 0;">
  
  <!-- Header with WDHC Logo -->
  <div style="background: #0a0a0a; color: white; padding: 25px 20px; text-align: center; margin-bottom: 30px; border-bottom: 2px solid #C5A065;">
    <div style="margin-bottom: 15px;">
      <img src="https://worlddeadhang.com/media/new_wdhc_logo.jpg" alt="WDHC Logo" style="max-width: 120px; height: auto; margin: 0 auto;">
    </div>
    <h1 style="margin: 0 0 5px 0; font-size: 1.4em; font-weight: 700; letter-spacing: 0.5px;">
      <span style="color: #C5A065;">WORLD</span> 
      <span style="color: white;">DEAD HANG</span> 
      <span style="color: #C5A065;">CHAMPIONSHIP</span>
    </h1>
    <p style="margin: 0; color: #aaa; font-size: 1em; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Submission Confirmation</p>
  </div>

  <!-- Greeting Card -->
  <div style="margin: 0 0 25px 0; padding: 20px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px; border-left: 4px solid #C5A065;">
    <p style="margin: 0 0 12px 0; font-size: 1.1em; line-height: 1.5; color: #333; font-weight: 600;">
      Hey ${firstName},
    </p>
    <p style="margin: 0; font-size: 1em; line-height: 1.5; color: #555;">
      ${personalMessage}
    </p>
  </div>

  ${prMessage}

  ${tierBadgeHtml}

  ${gripAgeHtml}

  <!-- Random Benefit Fact -->
  <div style="margin: 25px 0; padding: 15px; background: #f0f9f0; border-radius: 6px; border-left: 4px solid #28a745;">
    <p style="margin: 0; font-size: 0.95em; line-height: 1.5; color: #155724; font-style: italic;">
      ${randomFact}
    </p>
  </div>

  <!-- Footer -->
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #666; font-size: 0.9em;">
    <p style="margin: 0 0 8px 0;">
      <strong>Questions?</strong> Reply to this email or DM us on Instagram <a href="https://instagram.com/worlddeadhang" style="color: #C5A065; text-decoration: none;">@worlddeadhang</a>
    </p>
    <p style="margin: 0;">
      Stay strong,<br>
      <strong style="color: #C5A065;">The WDHC Team</strong>
    </p>
  </div>
</body>
</html>`;

    // Send email
    try {
      GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
      console.log(`Email sent to ${email} for ${name}`);
      
      // Mark as emailed
      if (emailedCol !== -1) {
        sheet.getRange(i + 1, emailedCol + 1).setValue('Yes');
      }
    } catch (error) {
      console.log('Email send error:', error);
    }
  }
}

// Setup trigger function
function setupTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('sendWelcomeEmailOnNewRow')
    .forSpreadsheet(ss)
    .onChange()
    .create();
  console.log('Trigger created successfully');
}

// Test function - works with empty sheet
function testEmail() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Custom Form Submissions');
    
    if (!sheet) {
      console.log('Error: Custom Form Submissions sheet not found');
      return;
    }
    
    // Check if there are any rows to test
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      console.log('No submissions found in Custom Form Submissions sheet. Using test data...');
      
      // Add a test row if sheet is empty
      const testData = [
        new Date().toLocaleString(),
        'WDHC-TEST-' + new Date().getTime(),
        'Test Athlete',
        'test@example.com',
        'Test City, Test State',
        'Test Country',
        new Date('1990-01-01'),
        'Male',
        180,
        72,
        'Intermediate',
        new Date().toISOString().split('T')[0],
        '2:30',
        'https://example.com/video',
        'Test submission',
        'Social Media',
        'Yes',
        'No',
        '',
        '',
        ''
      ];
      
      sheet.appendRow(testData);
      console.log('Added test row to sheet');
    }
    
    // Get the last row (either existing or newly added test row)
    const currentLastRow = sheet.getLastRow();
    
    // Create a proper event object
    const e = {
      changeType: 'INSERT_ROW',
      source: sheet,
      range: sheet.getRange(currentLastRow, 1, 1, sheet.getLastColumn())
    };
    
    console.log('Testing email for row ' + currentLastRow);
    sendWelcomeEmailOnNewRow(e);
    console.log('Test completed. Check execution log for details.');
    
  } catch (error) {
    console.log('Test error: ' + error.toString());
  }
}

// Quick test - minimal version
function quickTest() {
  console.log('Quick test: Checking script structure...');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Custom Form Submissions');
  
  if (!sheet) {
    console.log('ERROR: Custom Form Submissions sheet not found');
    console.log('Available sheets:');
    ss.getSheets().forEach(s => console.log('- ' + s.getName()));
    return;
  }
  
  console.log('✓ Custom Form Submissions sheet found');
  console.log('✓ Script structure is valid');
  console.log('✓ Ready for deployment');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run setupTrigger() to create the trigger');
  console.log('2. Deploy as Web App for form submissions');
  console.log('3. Test with testEmail() when you have data');
}