// WDHC Email Automation with PR Tracking - v2.0 (Custom Form Submissions)
// COMPLETE VERSION - READY TO COPY AND PASTE
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

  // ========== ENHANCED GRIP AGE CALCULATION ==========
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

  function findAndUpdatePRs(athleteName, currentRowIndex, currentTimeSeconds) {
    let bestTime = 0;
    let bestTimeFormatted = '';
    let bestRowIndex = -1;
    let submissionCount = 0;
    
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
    
    const isPR = currentTimeSeconds > bestTime;
    
    if (bestRowIndex !== -1 && prBadgeColIndex !== -1) {
      activeSheet.getRange(bestRowIndex + 1, prBadgeColIndex + 1).setValue('');
    }
    
    if (isPR && prBadgeColIndex !== -1) {
      activeSheet.getRange(currentRowIndex + 1, prBadgeColIndex + 1).setValue('ðŸ† PR');
    }
    
    return { 
      bestTime, 
      bestTimeFormatted, 
      isPR,
      previousPRRow: bestRowIndex,
      submissionCount: submissionCount + 1
    };
  }

  const benefits = [
    "Did you know? Hanging for even 10-30 seconds a day decompresses your spine and creates space in your shoulder joints, reversing the effects of slouching.",
    "Did you know? A 10-30 second dead hang before your gym workout primes your nervous system, improves shoulder mobility, and activates your lats for better performance on pull-ups and rows.",
    "Did you know? Passive hangs stretch your lats and pectoral muscles, which get notoriously tight from driving and computer work.",
    "Did you know? When you hang, gravity naturally applies traction to your spine, pulling nutrient-rich fluid back into your spinal discs."
  ];

  // Main loop
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
    
    const firstName = name.split(' ')[0];
    const totalSeconds = parseTimeToSeconds(time);
    const formattedTime = formatSecondsToMinutes(totalSeconds);
    const age = calculateAgeFromDOB(dob);
    
    const prInfo = findAndUpdatePRs(name, i, totalSeconds);
    const isPR = prInfo.isPR;
    const improvement = isPR && prInfo.bestTime > 0 ? totalSeconds - prInfo.bestTime : 0;
    const improvementFormatted = formatSecondsToMinutes(improvement);
    
    activeSheet.getRange(i + 1, prCol + 1).setValue(isPR ? 'Yes' : 'No');
    activeSheet.getRange(i + 1, previousBestCol + 1).setValue(prInfo.bestTimeFormatted || 'First Submission');
    
    let currentTier = "", nextTier = "", gap = 0;
    if (totalSeconds >= 360) { currentTier = "Freak"; gap = -1; } 
    else if (totalSeconds >= 240) { currentTier = "Legend"; nextTier = "Freak"; gap = 360 - totalSeconds; } 
    else if (totalSeconds >= 180) { currentTier = "Elite"; nextTier = "Legend"; gap = 240 - totalSeconds; } 
    else if (totalSeconds >= 120) { currentTier = "Pro"; nextTier = "Elite"; gap = 180 - totalSeconds; } 
    else if (totalSeconds >= 60) { currentTier = "Contender"; nextTier = "Pro"; gap = 120 - totalSeconds; } 
    else { currentTier = "Challenger"; nextTier = "Contender"; gap = 60 - totalSeconds; }

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

        if (gripAgeResult.yearsSaved > 0) {
          gripAgeMessage = 'Your grip is ' + yearsSavedText + ' than your actual age! That\'s elite-level hand strength. ';
          if (heightNum && heightNum > 72) gripAgeMessage += 'Especially impressive given your height! ';
          if (gripTrainingStr && (gripTrainingStr.includes('advanced') || gripTrainingStr.includes('competitor'))) {
            gripAgeMessage += 'Your advanced training is clearly paying off. ';
          }
          gripAgeMessage += 'To maintain this, try hanging for 10-30 seconds every dayâ€”it\'s the simplest way to preserve your grip longevity.';
          longevityFact = 'People with elite grip strength live 5-7 years longer on average. Your younger grip age suggests you\'re biologically exceptionalâ€”keep it up!';
        } else if (gripAgeResult.yearsSaved < 0) {
          const yearsToImprove = Math.abs(gripAgeResult.yearsSaved);
          gripAgeMessage = 'Your grip age is ' + yearsToImprove + ' years older than your chronological age. ';
          if (heightNum && heightNum > 72) gripAgeMessage += 'Taller athletes often face more leverage challenges. ';
          if (gripTrainingStr && (gripTrainingStr.includes('none') || gripTrainingStr.includes('first time'))) {
            gripAgeMessage += 'As a beginner, you have huge potential for rapid improvement! ';
          }
          gripAgeMessage += 'The good news: grip strength responds quickly to training! Try dead hangs 3x/week, starting with 3 sets of 30 seconds.';
          longevityFact = 'Every 5kg increase in grip strength correlates with 16% lower all-cause mortality. Improving your grip could literally add 5+ years to your lifespan.';
        } else {
          gripAgeMessage = 'Your grip age matches your chronological age. Solid foundation! ';
          if (heightNum) gripAgeMessage += 'Your height-adjusted performance is right on track. ';
          gripAgeMessage += 'To get younger, add grip-specific work: try towel hangs or fat grip training 2x/week.';
          longevityFact = 'Grip strength is the #1 predictor of longevityâ€”stronger than blood pressure, cholesterol, or even smoking status. You\'re on the right track.';
        }

        let additionalInfoHtml = '';
        if (heightNum) {
          additionalInfoHtml += `<p style="margin: 5px 0; font-size: 0.9em; color: #666;"><strong>Height:</strong> ${heightNum} inches</p>`;
        }
        if (gripTrainingStr) {
          additionalInfoHtml += `<p style="margin: 5px 0; font-size: 0.9em; color: #666;"><strong>Grip Training:</strong> ${gripTrainingStr}</p>`;
        }

        gripAgeHtml = `
<div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #e6f7ff, #f0f9ff); border-radius: 8px; border-left: 4px solid #007bff;">
  <h3 style="margin: 0 0 12px 0; font-size: 1.2em; color: #0056b3; font-weight: 700;">Grip Age Analysis</h3>
  <p style="margin: 0 0 10px 0; font-size: 1.05em; line-height: 1.5; color: #333;">
    Your biological grip age is <strong style="color: #0056b3;">${gripAgeResult.gripAge}</strong> (chronological age: ${age}).
  </p>
  ${additionalInfoHtml}
  <div style="background: rgba(0, 123, 255, 0.1); padding: 12px; border-radius: 6px; margin: 15px 0;">
    <p style="margin: 0; font-size: 0.95em; line-height: 1.5; color: #495057; font-style: italic;">
      ${gripAgeMessage}
    </p>
  </div>
  <p style="margin: 10px 0 0 0; font-size: 0.9em; color: #666;">
    <strong>Longevity Insight:</strong> ${longevityFact}
  </p>
</div>`;
      } catch (err) {
        console.error("Error calculating Grip Age: " + err);
        gripAgeHtml = `
<div style="margin: 20px 0;">
  <h3 style="margin: 0 0 10px 0; font-size: 1.1em; color: #333; font-weight: 600;">Grip Age Analysis</h3>
  <p style="margin: 0; font-size: 1em; line-height: 1.5; color: #666;">
    Could not calculate grip age due to incomplete data. Please ensure all fields are filled correctly.
  </p>
</div>`;
      }
    } else {
      gripAgeHtml = `
<div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px; border-left: 4px solid #6c757d;">
  <h3 style="margin: 0 0 12px 0; font-size: 1.2em; color: #495057; font-weight: 700;">Grip Age Analysis</h3>
  <p style="margin: 0 0 10px 0; font-size: 1.05em; line-height: 1.5; color: #333;">
    Complete your profile for personalized insights
  </p>
  <div style="background: rgba(108, 117, 125, 0.1); padding: 12px; border-radius: 6px; margin: 15px 0;">
    <p style="margin: 0; font-size: 0.95em; line-height: 1.5; color: #495057;">
      Add your date of birth, gender, and bodyweight to calculate your biological grip age and get personalized training recommendations.
    </p>
  </div>
  <p style="margin: 10px 0 0 0; font-size: 0.9em; color: #666;">
    <strong>Why it matters:</strong> Grip strength is the #1 predictor of longevity - stronger than blood pressure or cholesterol.
  </p>
</div>`;
    }

    const motivationalText = gap === -1 
      ? `You're in the <strong>FREAK</strong> tier! You have officially transcended human limits.`
      : `Congrats on hitting <strong>${formattedTime}</strong>! You're in the <strong>${currentTier}</strong> tier, and you're only <strong>${formatSecondsToMinutes(gap)}</strong> away from leveling up to the <strong>${nextTier}</strong> tier. Keep going!`;

    // Tier badge helper function with correct colors from website
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

    // Training hint function based on current tier and gap
    function getTrainingHint(currentTier, gapSeconds) {
      const tier = currentTier.toUpperCase();
      const gapMinutes = Math.floor(gapSeconds / 60);
      
      if (tier === 'CHALLENGER') {
        if (gapSeconds < 30) return "Try 3 sets of 30-second hangs with 2 minutes rest between sets, 3x per week.";
        if (gapSeconds < 60) return "Focus on grip endurance: hang for 45 seconds, rest 90 seconds, repeat 4 times.";
        return "Build a foundation: start with 20-second hangs, 5 sets, resting 60 seconds between.";
      }
      
      if (tier === 'CONTENDER') {
        if (gapSeconds < 30) return "Add towel hangs once a week to build crushing grip strength.";
        if (gapSeconds < 60) return "Try 'grease the groove': do 5-10 short hangs throughout the day.";
        return "Work on finger strength: dead hangs with 2-3 fingers for shorter durations.";
      }
      
      if (tier === 'PRO') {
        if (gapSeconds < 30) return "Incorporate weighted hangs: add 5-10lbs for 15-20 second holds.";
        if (gapSeconds < 60) return "Try interval training: 45s hang, 30s rest, repeat 6-8 times.";
        return "Focus on mental endurance: practice breathing control during longer hangs.";
      }
      
      if (tier === 'ELITE') {
        if (gapSeconds < 30) return "Experiment with different grip widths to find your strongest position.";
        if (gapSeconds < 60) return "Add eccentric training: jump up, lower as slowly as possible.";
        return "Consider grip-specific accessories like fat grips or climbing putty.";
      }
      
      if (tier === 'LEGEND') {
        if (gapSeconds < 30) return "Perfect your technique: ensure shoulders are packed, core engaged.";
        if (gapSeconds < 60) return "Try 'density training': accumulate 5+ minutes of hang time in one session.";
        return "Focus on recovery: ensure 48+ hours between intense grip sessions.";
      }
      
      // Default for FREAK or any other tier
      return "Maintain consistency: 2-3 sessions per week with varied intensity.";
    }

    // Enhanced tier section with correct colors and better design
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
    You've reached the pinnacle! Your ${formattedTime} hang places you in the <strong>${currentTier}</strong> tier - the maximum level of achievement.
  </p>
  <div style="margin-top: 12px; padding: 10px; background: rgba(197, 160, 101, 0.1); border-radius: 6px; border-left: 3px solid #C5A065;">
    <p style="margin: 0; font-size: 0.9em; color: #666; font-style: italic;">
      <strong>Maintenance tip:</strong> ${getTrainingHint(currentTier, 0)}
    </p>
  </div>
</div>`;
    } else {
      tierBadgeHtml = `
<div style="margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid ${currentTierColor.border};">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
    <div style="background: ${currentTierColor.bg}; color: ${currentTierColor.text}; border: 1px solid ${currentTierColor.border}; padding: 8px 16px; border-radius: 6px; font-family: 'Roboto Mono', monospace; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      ${currentTier}
    </div>
    <span style="color: #666; font-weight: 600;">â†’</span>
    <div style="background: ${nextTierColor.bg}; color: ${nextTierColor.text}; border: 1px solid ${nextTierColor.border}; padding: 8px 16px; border-radius: 6px; font-family: 'Roboto Mono', monospace; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8;">
      ${nextTier}
    </div>
  </div>
  
  <p style="margin: 0; font-size: 1em; line-height: 1.5; color: #333;">
    You're <strong>${formatSecondsToMinutes(gap)}</strong> away from the <strong>${nextTier}</strong> tier.
  </p>
  <div style="margin-top: 12px; padding: 10px; background: rgba(197, 160, 101, 0.1); border-radius: 6px; border-left: 3px solid #C5A065;">
    <p style="margin: 0; font-size: 0.9em; color: #666; font-style: italic;">
      <strong>Quick tip:</strong> ${getTrainingHint(currentTier, gap)}
    </p>
  </div>
</div>`;
    }

    // Dynamic message based on submission count
    let personalMessage = '';
    if (prInfo.submissionCount === 1) {
      personalMessage = `Welcome to the WDHC! Your first hang of <strong>${formattedTime}</strong> is officially submittedâ€”that's an awesome start! ðŸŽ‰ Our team is reviewing your video proof now.`;
    } else if (prInfo.submissionCount === 2) {
      personalMessage = 'Second submission receivedâ€”great consistency! Our team is reviewing your video proof now.';
    } else if (prInfo.submissionCount === 3) {
      personalMessage = 'Third submission receivedâ€”keep it up! Our team is reviewing your video proof now.';
    } else {
      personalMessage = `Submission #${prInfo.submissionCount} receivedâ€”you're becoming a WDHC regular! Our team is reviewing your video proof now.`;
    }

    // Email composition with enhanced design
    const randomFact = benefits[Math.floor(Math.random() * benefits.length)];
    
    // Fix subject line logic: first submissions aren't "NEW PR"
    let subject;
    if (prInfo.submissionCount === 1) {
      subject = "WDHC Submission Received - Welcome!";
    } else if (isPR) {
      subject = "NEW PR - WDHC Submission Review";
    } else {
      subject = "WDHC Submission Received";
    }
    
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


  // Mark as emailed
  activeSheet.getRange(i + 1, emailedCol + 1).setValue('Yes');

  // Send email
  GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
  console.log(Email sent to  for );
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

// Test function
function testEmail() {
  const testRow = 2; // Change this to test a specific row
  const e = {
    changeType: 'INSERT_ROW',
    source: SpreadsheetApp.getActiveSpreadsheet()
  };
  sendWelcomeEmailOnNewRow(e);
}

