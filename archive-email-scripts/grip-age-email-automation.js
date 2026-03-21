// Google Apps Script for WDHC Email Automation with Grip Age Personalization
// Add this to your Google Sheet's Apps Script (Extensions > Apps Script)

// Configuration
const CONFIG = {
  sheetName: 'Sheet1',
  emailColumn: 11, // Column K (Email Address)
  nameColumn: 4,   // Column D (Athlete Name)
  dobColumn: 8,    // Column H (Date of Birth)
  genderColumn: 9, // Column I (Gender)
  weightColumn: 10, // Column J (Bodyweight lbs)
  timeColumn: 25,  // Column Y (Total Dead Hang Time)
  videoColumn: 26  // Column Z (Video Link)
};

// Main function triggered on form submission
function onFormSubmit(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetName);
    const lastRow = sheet.getLastRow();
    const range = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn());
    const rowData = range.getValues()[0];
    
    // Extract data from the new submission
    const athleteName = rowData[CONFIG.nameColumn - 1];
    const email = rowData[CONFIG.emailColumn - 1];
    const dateOfBirth = rowData[CONFIG.dobColumn - 1];
    const gender = rowData[CONFIG.genderColumn - 1];
    const weight = rowData[CONFIG.weightColumn - 1];
    const hangTime = rowData[CONFIG.timeColumn - 1];
    const videoLink = rowData[CONFIG.videoColumn - 1];
    
    // Calculate grip age with full algorithm
    const gripAgeResult = calculateWDHCGripAge(hangTime, dateOfBirth, gender, weight);
    
    // Send personalized confirmation email
    sendConfirmationEmail(email, athleteName, hangTime, videoLink, gripAgeResult, weight);
    
    Logger.log(`Confirmation email sent to ${athleteName} (${email}) with grip age: ${gripAgeResult.gripAge}`);
    
  } catch (error) {
    Logger.log(`Error in onFormSubmit: ${error.toString()}`);
  }
}

// Calculate WDHC Grip Age with full algorithm (matches website)
function calculateWDHCGripAge(timeSeconds, dateOfBirth, gender, weightLbs) {
  // Parse time to seconds
  const totalSeconds = parseTimeToSeconds(timeSeconds);
  
  // Calculate age from date of birth
  let age = 30; // default if DOB not provided
  if (dateOfBirth && dateOfBirth instanceof Date) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }
  
  // Default values if gender/weight not provided
  const isMale = gender && gender.toString().toLowerCase().includes('male');
  const weight = weightLbs && !isNaN(weightLbs) ? parseFloat(weightLbs) : (isMale ? 175 : 135);
  
  // WDHC Grip Age Algorithm (matches website)
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
  
  const adjustedExpectedTime = (baseExpected * (refWeight / weight) * 0.7) + (baseExpected * 0.3);
  const performanceRatio = totalSeconds / adjustedExpectedTime;
  let gripAge = age - ((performanceRatio - 1.0) * 50);
  gripAge = Math.max(age - 25, Math.min(age + 25, gripAge));
  gripAge = Math.max(16, Math.min(85, gripAge));
  const yearsSaved = age - Math.round(gripAge);
  
  return {
    gripAge: Math.round(gripAge),
    yearsSaved: yearsSaved,
    performanceRatio: performanceRatio.toFixed(2),
    age: age,
    hasAllData: !!(dateOfBirth && gender && weightLbs)
  };
}

// Parse time string to seconds (supports MM:SS, M.SS, etc.)
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  
  const str = timeStr.toString().trim();
  
  // Handle MM:SS format
  if (str.includes(':')) {
    const parts = str.split(':');
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return (minutes * 60) + seconds;
  }
  
  // Handle decimal format (e.g., 1.5 = 1 minute 30 seconds)
  if (str.includes('.')) {
    const minutes = parseFloat(str);
    return Math.round(minutes * 60);
  }
  
  // Assume seconds if just a number
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Format seconds to minutes and seconds
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

// Send confirmation email with grip age personalization
function sendConfirmationEmail(email, name, hangTime, videoLink, gripAge, weight) {
  const firstName = name.split(' ')[0];
  const totalSeconds = parseTimeToSeconds(hangTime);
  const formattedTime = formatSecondsToMinutes(totalSeconds);
  
  // --- TIER CALCULATION (matches your code) ---
  let currentTier = "", nextTier = "", gap = 0;
  if (totalSeconds >= 360) { currentTier = "Freak"; gap = -1; } 
  else if (totalSeconds >= 240) { currentTier = "Legend"; nextTier = "Freak"; gap = 360 - totalSeconds; } 
  else if (totalSeconds >= 180) { currentTier = "Elite"; nextTier = "Legend"; gap = 240 - totalSeconds; } 
  else if (totalSeconds >= 120) { currentTier = "Pro"; nextTier = "Elite"; gap = 180 - totalSeconds; } 
  else if (totalSeconds >= 60) { currentTier = "Contender"; nextTier = "Pro"; gap = 120 - totalSeconds; } 
  else { currentTier = "Challenger"; nextTier = "Contender"; gap = 60 - totalSeconds; }

  const motivationalText = gap === -1 
    ? `You're in the <strong>FREAK</strong> tier! You have officially transcended human limits.`
    : `Congrats on hitting <strong>${formattedTime}</strong>! You're in the <strong>${currentTier}</strong> tier, and you're only <strong>${formatSecondsToMinutes(gap)}</strong> away from leveling up to the <strong>${nextTier}</strong> tier. Keep going!`;

  // --- GRIP AGE HTML (matches your code exactly) ---
  let gripAgeHtml = '';
  let gripAgeMessage = '';
  let longevityFact = '';

  if (gripAge.hasAllData) {
    try {
      const yearsSavedText = gripAge.yearsSaved > 0 ? gripAge.yearsSaved + ' years younger' : Math.abs(gripAge.yearsSaved) + ' years older';

      if (gripAge.yearsSaved > 0) {
        gripAgeMessage = 'Your grip is ' + yearsSavedText + ' than your actual age! That\'s elite-level hand strength. To maintain this, try adding 2-3 sets of farmer\'s walks to your routine.';
        longevityFact = 'People with elite grip strength live 5-7 years longer on average. Your younger grip age suggests you\'re biologically exceptional—keep it up!';
      } else if (gripAge.yearsSaved < 0) {
        const yearsToImprove = Math.abs(gripAge.yearsSaved);
        gripAgeMessage = 'Your grip age is ' + yearsToImprove + ' years older than your chronological age. The good news: grip strength responds quickly to training! Try dead hangs 3x/week, starting with 3 sets of 30 seconds.';
        longevityFact = 'Every 5kg increase in grip strength correlates with 16% lower all-cause mortality. Improving your grip could literally add 5+ years to your lifespan.';
      } else {
        gripAgeMessage = 'Your grip age matches your chronological age. Solid foundation! To get younger, add grip-specific work: try towel hangs or fat grip training 2x/week.';
        longevityFact = 'Grip strength is the #1 predictor of longevity—stronger than blood pressure, cholesterol, or even smoking status. You\'re on the right track.';
      }

      gripAgeHtml = '<div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd; background: #f9f9f9; border-radius: 8px;">' +
        '<h3 style="color: #000; margin-top: 0;">Your WDHC Grip Age™: ' + gripAge.gripAge + '</h3>' +
        '<p>Based on your ' + formattedTime + ' hang at ' + weight + 'lbs, your biological grip age is <strong>' + gripAge.gripAge + '</strong> (chronological age: ' + gripAge.age + '). That\'s <strong>' + yearsSavedText + '</strong>!</p>' +
        '<p style="color: #D4AF37; font-weight: bold;">' + gripAgeMessage + '</p>' +
        '<p><strong>📈 Longevity Connection:</strong> ' + longevityFact + '</p>' +
        '<p style="font-size: 0.8em; color: #666; margin-top: 10px;"><em>Grip strength is one of the strongest biological markers of overall health and longevity. Track your progress monthly!</em></p>' +
        '</div>';
    } catch (err) {
      console.error("Error calculating Grip Age: " + err);
      gripAgeHtml = '<div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd;">' +
        '<h3 style="color: #000; margin-top: 0;">Your WDHC Grip Age™</h3>' +
        '<p>We couldn\'t calculate your grip age due to missing data. Make sure your Age, Gender, and Bodyweight are filled in the submission form!</p>' +
        '</div>';
    }
  } else {
    gripAgeHtml = '<div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd;">' +
      '<h3 style="color: #000; margin-top: 0;">Your WDHC Grip Age™</h3>' +
      '<p>To see your personalized grip age and longevity insights, make sure to include your Age, Gender, and Bodyweight in future submissions!</p>' +
      '<p style="color: #D4AF37; font-weight: bold;">Grip strength is a powerful predictor of longevity—tracking it could help you live longer.</p>' +
      '</div>';
  }

  // --- RANDOM FACTS (matches your code) ---
  const benefits = [
    "Grip strength is a stronger predictor of mortality than systolic blood pressure.",
    "Every 5kg increase in grip strength reduces all-cause mortality by 16%.",
    "People with strong grips have 50% lower risk of developing Alzheimer's.",
    "Grip strength correlates with bone density—strong hands mean strong bones.",
    "Elite grip athletes show 30% faster reaction times than average.",
    "Dead hangs decompress the spine, relieving back pain for 80% of practitioners."
  ];
  const randomFact = benefits[Math.floor(Math.random() * benefits.length)];

  const subject = "Hang Tight! We're reviewing your WDHC submission ⏱️";
  
  const htmlBody = `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
<h2 style="color: #000;">Hey ${firstName},</h2>
<p>This is Milo from the World Dead Hang Championship.</p>
<p>I just wanted to personally let you know that we received your submission and our team is reviewing your video proof now.</p>
<div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #D4AF37; margin: 20px 0;">
${motivationalText}
${gripAgeHtml}
</div>
<p>We review every single hang manually to protect the integrity of the leaderboard. You can expect to see your official ranking go live on <strong>worlddeadhang.com</strong> within 24-48 hours if everything looks good.</p>
<p style="color: #777; font-size: 0.9em;"><em>${randomFact}</em></p>
<br>
<p>Stay gritty,<br>
<strong>Milo</strong><br>
Co-Founder, WDHC</p>
</div>
  `;
  
  // Create plain text version (simplified for GmailApp)
  const plainBody = `Hey ${firstName},

This is Milo from the World Dead Hang Championship.

I just wanted to personally let you know that we received your submission and our team is reviewing your video proof now.

${motivationalText.replace(/<[^>]*>/g, '')}

${gripAge.hasAllData ? 
  `Your WDHC Grip Age™: ${gripAge.gripAge}
  
Based on your ${formattedTime} hang at ${weight}lbs, your biological grip age is ${gripAge.gripAge} (chronological age: ${gripAge.age}). That's ${gripAge.yearsSaved > 0 ? gripAge.yearsSaved + ' years younger' : Math.abs(gripAge.yearsSaved) + ' years older'}!

${gripAgeMessage}

📈 Longevity Connection: ${longevityFact}

Grip strength is one of the strongest biological markers of overall health and longevity. Track your progress monthly!` :
  `Your WDHC Grip Age™
  
To see your personalized grip age and longevity insights, make sure to include your Age, Gender, and Bodyweight in future submissions!

Grip strength is a powerful predictor of longevity—tracking it could help you live longer.`
}

We review every single hang manually to protect the integrity of the leaderboard. You can expect to see your official ranking go live on worlddeadhang.com within 24-48 hours if everything looks good.

${randomFact}

Stay gritty,
Milo
Co-Founder, WDHC`;

  // Send email using GmailApp (matches your code)
  try {
    GmailApp.sendEmail(email, subject, "", { 
      htmlBody: htmlBody, 
      name: "World Dead Hang Championship" 
    });
  } catch(err) {
    console.error("Error sending email: " + err);
  }
}

// Test function (run this manually to test)
function testEmailAutomation() {
  const testData = {
    name: "Test Athlete",
    email: "test@example.com",
    dob: new Date(1990, 0, 1), // Jan 1, 1990
    gender: "Male",
    weight: 180,
    hangTime: "2:45",
    videoLink: "https://youtube.com/watch?v=test"
  };
  
  const gripAgeResult = calculateWDHCGripAge(testData.hangTime, testData.dob, testData.gender, testData.weight);
  sendConfirmationEmail(testData.email, testData.name, testData.hangTime, testData.videoLink, gripAgeResult, testData.weight);
  Logger.log(`Test email sent! Grip Age: ${gripAgeResult.gripAge}, Has All Data: ${gripAgeResult.hasAllData}`);
}

// Instructions for setup:
// 1. Go to your Google Sheet
// 2. Click Extensions > Apps Script
// 3. Paste this entire code
// 4. Save the project (File > Save)
// 5. Click the clock icon (Triggers) in left sidebar
// 6. Click "+ Add Trigger" in bottom right
// 7. Configure:
//    - Choose function: onFormSubmit
//    - Choose deployment: Head
//    - Select event source: From spreadsheet
//    - Select event type: On form submit
// 8. Click Save
// 9. Authorize the script when prompted