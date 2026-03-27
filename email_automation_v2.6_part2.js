
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

        // Validate required columns
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
        
        // Validate required fields
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
            <meta name="viewport" content="width=device-width, initial-scal...