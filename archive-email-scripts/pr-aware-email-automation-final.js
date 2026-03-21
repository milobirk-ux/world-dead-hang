function sendWelcomeEmailOnNewRow(e) {
  if (e && e.changeType !== 'INSERT_ROW') return;

  const activeSheet = SpreadsheetApp.getActiveSheet();
  const data = activeSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Column indices (0-based)
  const emailColIndex = 10; // Column K (Email Address)
  const nameColIndex = 3;   // Column D (Athlete Name)
  const timeColIndex = 12;  // Column M (Official Time)
  const dobColIndex = 7;    // Column H (Date of Birth)
  const genderColIndex = 8; // Column I (Gender)
  const weightColIndex = 9; // Column J (Bodyweight lbs)
  
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

  // Helper functions
  function parseTimeToSeconds(timeStr) {
    let s = String(timeStr || '0').trim();
    if (s.includes(':')) {
      let p = s.split(':');
      return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
    }
    let num = parseFloat(s);
    if (isNaN(num)) return 0;
    if (s.includes('.') && num < 20) {
      return Math.round(num * 60);
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

  // Find athlete's previous best
  function findPreviousBest(athleteName, currentRowIndex) {
    let bestTime = 0;
    let bestTimeFormatted = '';
    
    // Look through all previous rows (above current row)
    for (let j = 1; j < currentRowIndex; j++) {
      const prevName = data[j][nameColIndex];
      if (prevName && prevName.toString().trim() === athleteName.toString().trim()) {
        const prevTime = data[j][timeColIndex];
        const prevSeconds = parseTimeToSeconds(prevTime);
        if (prevSeconds > bestTime) {
          bestTime = prevSeconds;
          bestTimeFormatted = formatSecondsToMinutes(prevSeconds);
        }
      }
    }
    
    return { bestTime, bestTimeFormatted };
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

    const firstName = name.split(' ')[0];
    const totalSeconds = parseTimeToSeconds(time);
    const formattedTime = formatSecondsToMinutes(totalSeconds);
    const age = calculateAgeFromDOB(dob);
    
    // Find previous best
    const previousBest = findPreviousBest(name, i);
    const isPR = totalSeconds > previousBest.bestTime;
    const improvement = isPR && previousBest.bestTime > 0 ? totalSeconds - previousBest.bestTime : 0;
    const improvementFormatted = formatSecondsToMinutes(improvement);
    
    // Update sheet with PR info
    activeSheet.getRange(i + 1, prCol + 1).setValue(isPR ? 'Yes' : 'No');
    activeSheet.getRange(i + 1, previousBestCol + 1).setValue(previousBest.bestTimeFormatted || 'First Submission');
    
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
      if (previousBest.bestTime > 0) {
        prMessage = `<div style="background: linear-gradient(135deg, #D4AF37, #FFD700); color: white; padding: 12px; border-radius: 8px; margin: 15px 0; text-align: center;">
          <h3 style="margin: 0; color: white;">🎉 NEW PERSONAL RECORD! 🎉</h3>
          <p style="margin: 8px 0 0 0; font-size: 1.1em;">You beat your previous best of <strong>${previousBest.bestTimeFormatted}</strong> by <strong>${improvementFormatted}</strong>!</p>
          <p style="margin: 4px 0 0 0; font-size: 0.9em;">This submission will get the PR badge on the leaderboard.</p>
        </div>`;
      } else {
        prMessage = `<div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 12px; border-radius: 8px; margin: 15px 0; text-align: center;">
          <h3 style="margin: 0; color: white;">🏁 FIRST SUBMISSION! 🏁</h3>
          <p style="margin: 8px 0 0 0; font-size: 1.1em;">Welcome to the WDHC! <strong>${formattedTime}</strong> is your starting point.</p>
        </div>`;
      }
    } else if (previousBest.bestTime > 0) {
      prMessage = `<div style="background: #f0f0f0; padding: 12px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #666;">
        <p style="margin: 0; color: #666;">This time of <strong>${formattedTime}</strong> didn't beat your PR of <strong>${previousBest.bestTimeFormatted}</strong>.</p>
        <p style="margin: 8px 0 0 0; font-size: 0.9em;">Keep training! You're <strong>${formatSecondsToMinutes(previousBest.bestTime - totalSeconds)}</strong> away from your best.</p>
      </div>`;
    }

    const motivationalText = gap === -1 
      ? `You're in the <strong>FREAK</strong> tier! You have officially transcended human limits.`
      : `Congrats on hitting <strong>${formattedTime}</strong>! You're in the <strong>${currentTier}</strong> tier, and you're only <strong>${formatSecondsToMinutes(gap)}</strong> away from leveling up to the <strong>${nextTier}</strong> tier. Keep going!`;

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
        gripAgeHtml = '<div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd;">' +
          '<h3 style="color: #000; margin-top: 0;">Your WDHC Grip Age™</h3>' +
          '<p>We couldn\'t calculate your grip age due to invalid data. Please make sure your Date of Birth, Gender, and Bodyweight are valid!</p>' +
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
  <p style="color: #