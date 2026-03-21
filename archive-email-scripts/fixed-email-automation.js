function sendWelcomeEmailOnNewRow(e) {
 if (e && e.changeType !== 'INSERT_ROW') return;

 const activeSheet = SpreadsheetApp.getActiveSheet();
 const data = activeSheet.getDataRange().getValues();
 const headers = data[0];
 
 // --- COLUMN MAPPING ---
 const emailColIndex = headers.findIndex(h => h.toString().toLowerCase().includes('email'));
 const nameColIndex = headers.findIndex(h => h.toString().toLowerCase().includes('name'));
 const timeColIndex = headers.findIndex(h => h.toString().toLowerCase().includes('time') || h.toString().toLowerCase().includes('dead hang'));
 const ageColIndex = headers.findIndex(h => h.toString().toLowerCase().includes('age'));
 const genderColIndex = headers.findIndex(h => h.toString().toLowerCase().includes('gender'));
 const weightColIndex = headers.findIndex(h => h.toString().toLowerCase().includes('bodyweight'));
 let emailedCol = headers.findIndex(h => h === 'Emailed');
 
 if (emailedCol === -1) {
 emailedCol = headers.length;
 activeSheet.getRange(1, emailedCol + 1).setValue('Emailed');
 }

 // --- BENEFITS ---
 const benefits = [
 "Did you know? Hanging for even 10-30 seconds a day decompresses your spine and creates space in your shoulder joints, reversing the effects of slouching.",
 "Did you know? Grip strength is one of the leading biological indicators of longevity and overall systemic resilience. A stronger grip literally means a longer life.",
 "Did you know? Passive hangs stretch your lats and pectoral muscles, which get notoriously tight from driving and computer work.",
 "Did you know? When you hang, gravity naturally applies traction to your spine, pulling nutrient-rich fluid back into your spinal discs."
 ];

 // --- TIME PARSING ---
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

 // --- TIME FORMATTING ---
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

 // --- GRIP AGE ALGORITHM ---
 function calculateWDHCGripAge(timeSeconds, age, weightLbs, gender) {
 const isMale = gender.toString().toLowerCase() === 'male';
 const refWeight = isMale ? 175 : 135;
 let baseExpected = 0;
 if (isMale) {
 if (age < 30) baseExpected = 150; else if (age < 40) baseExpected = 120;
 else if (age < 50) baseExpected = 90; else if (age < 60) baseExpected = 60;
 else if (age < 70) baseExpected = 45; else baseExpected = 30;
 } else {
 if (age < 30) baseExpected = 105; else if (age < 40) baseExpected = 80;
 else if (age < 50) baseExpected = 60; else if (age < 60) baseExpected = 45;
 else if (age < 70) baseExpected = 30; else baseExpected = 20;
 }
 const adjustedExpectedTime = (baseExpected * (refWeight / weightLbs) * 0.7) + (baseExpected * 0.3);
 const performanceRatio = timeSeconds / adjustedExpectedTime;
 let gripAge = age - ((performanceRatio - 1.0) * 50);
 gripAge = Math.max(age - 25, Math.min(age + 25, gripAge));
 gripAge = Math.max(16, Math.min(85, gripAge));
 const yearsSaved = age - Math.round(gripAge);
 return {
 gripAge: Math.round(gripAge), yearsSaved: yearsSaved,
 performanceRatio: performanceRatio.toFixed(2)
 };
 }

 // --- MAIN LOOP---
 for (let i = data.length - 1; i > 0; i--) {
 const row = data[i];
 if (row[emailedCol]) continue; const email = row[emailColIndex];
 if (!email) continue;
 
 const name = row[nameColIndex] || 'Athlete';
 const time = row[timeColIndex] || '';
 const age = row[ageColIndex];
 const gender = row[genderColIndex];
 const weight = row[weightColIndex];

 const firstName = name.split(' ')[0];
 const totalSeconds = parseTimeToSeconds(time);
 const formattedTime = formatSecondsToMinutes(totalSeconds);
 
 // --- TIER CALCULATION ---
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

// --- GRIP AGE HTML ---
let gripAgeHtml = '';
let gripAgeMessage = '';
let longevityFact = '';

// FIXED: Check if we have valid grip age data (non-empty strings/numbers)
// The original code was checking column indices instead of actual data values
const hasGripAgeData = age !== undefined && age !== null && age !== '' &&
                       gender !== undefined && gender !== null && gender !== '' &&
                       weight !== undefined && weight !== null && weight !== '';

if (hasGripAgeData) {
try {
// FIXED: Convert to proper types and handle edge cases
const ageNum = parseInt(String(age).trim());
const weightNum = parseInt(String(weight).trim());
const genderStr = String(gender).trim();

// Validate we have valid numbers
if (isNaN(ageNum) || isNaN(weightNum) || ageNum <= 0 || weightNum <= 0) {
  throw new Error("Invalid age or weight values");
}

const gripAgeResult = calculateWDHCGripAge(totalSeconds, ageNum, weightNum, genderStr);
const yearsSavedText = gripAgeResult.yearsSaved > 0 ? gripAgeResult.yearsSaved + ' years younger' : Math.abs(gripAgeResult.yearsSaved) + ' years older';

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
'<p>We couldn\'t calculate your grip age due to invalid data. Please make sure your Age, Gender, and Bodyweight are valid numbers!</p>' +
'</div>';
}
} else {
gripAgeHtml = '<div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd;">' +
'<h3 style="color: #000; margin-top: 0;">Your WDHC Grip Age™</h3>' +
'<p>To see your personalized grip age and longevity insights, make sure to include your Age, Gender, and Bodyweight in future submissions!</p>' +
'<p style="color: #D4AF37; font-weight: bold;">Grip strength is a powerful predictor of longevity—tracking it could help you live longer.</p>' +
'</div>';
}


 // --- EMAIL COMPOSITION ---
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

 // --- SEND EMAIL ---
 try {GmailApp.sendEmail(email, subject, "", { htmlBody: htmlBody, name: "World Dead Hang Championship" });
 activeSheet.getRange(i + 1, emailedCol + 1).setValue('Yes');
 } catch(err) {
 console.error("Error sending email: " + err);
 }
 }
}