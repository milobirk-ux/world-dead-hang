 2x/week.';
          longevityFact = 'Grip strength is the #1 predictor of longevity—stronger than blood pressure, cholesterol, or even smoking status. You\'re on the right track.';
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
    <span style="color: #666; font-weight: 600;">→</span>
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
      personalMessage = `Welcome to the WDHC! Your first hang of <strong>${formattedTime}</strong> is officially submitted—that's an awesome start! 🎉 Our team is reviewing your video proof now.`;
    } else if (prInfo.submissionCount === 2) {
      personalMessage = 'Second submission received—great consistency! Our team is reviewing your video proof now.';
    } else if (prInfo.submissionCount === 3) {
      personalMessage = 'Third submission received—keep it up! Our team is reviewing your video proof now.';
    } else {
      personalMessage = `Submission #${prInfo.submissionCount} received—you're becoming a WDHC regular! Our team is reviewing your video proof now.`;
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
      <strong>Questions?</strong> Reply to this email or DM us on Instagram <a href="https://instagram.com/worlddeadhang" style="color: