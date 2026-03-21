// WDHC Email Automation - REVISED SIMPLE VERSION
// Works with column M for time data
// Add to Google Sheets: Extensions > Apps Script

function sendWelcomeEmailOnNewRow(e) {
  if (e && e.changeType !== 'INSERT_ROW') return;

  const activeSheet = SpreadsheetApp.getActiveSheet();
  const data = activeSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find columns dynamically (0-based indices)
  const emailColIndex = headers.findIndex(h => 
    h.toString().toLowerCase().includes('email'));
  const nameColIndex = headers.findIndex(h => 
    h.toString().toLowerCase().includes('name'));
  const timeColIndex = headers.findIndex(h => 
    h.toString().toLowerCase().includes('time') || 
    h.toString().toLowerCase().includes('dead hang'));
  
  // Add 'Emailed' column if it doesn't exist
  let emailedCol = headers.findIndex(h => h === 'Emailed');
  if (emailedCol === -1) {
    emailedCol = headers.length;
    activeSheet.getRange(1, emailedCol + 1).setValue('Emailed');
  }

  // Benefits for random selection
  const benefits = [
    "Did you know? Hanging for even 10-30 seconds a day decompresses your spine and creates space in your shoulder joints, reversing the effects of slouching.",
    "Did you know? Grip strength is one of the leading biological indicators of longevity and overall systemic resilience. A stronger grip literally means a longer life.",
    "Did you know? Passive hangs stretch your lats and pectoral muscles, which get notoriously tight from driving and computer work.",
    "Did you know? When you hang, gravity naturally applies traction to your spine, pulling nutrient-rich fluid back into your spinal discs."
  ];

  // Parse time string to seconds - FIXED VERSION
  function parseTimeToSeconds(timeStr) {
    let s = String(timeStr || '0').trim();
    
    // Handle colon format (e.g., "4:10" = 4 minutes, 10 seconds)
    if (s.includes(':')) {
      let p = s.split(':');
      return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
    }
    
    // Handle decimal format - SIMPLIFIED LOGIC
    // "4.1" = 4 minutes and 10 seconds (common spreadsheet interpretation)
    if (s.includes('.')) {
      let parts = s.split('.');
      let minutes = parseInt(parts[0]) || 0;
      let decimalPart = parts[1] || '';
      
      // If decimal part is 1-2 digits, treat as seconds
      if (decimalPart.length <= 2) {
        let seconds = parseInt(decimalPart) || 0;
        // Handle single digit as tens of seconds: "4.1" = 4:10, "4.2" = 4:20
        if (decimalPart.length === 1) {
          seconds = seconds * 10;
        }
        return minutes * 60 + seconds;
      }
      
      // For longer decimal parts, treat as decimal minutes
      let num = parseFloat(s);
      if (!isNaN(num)) {
        return Math.round(num * 60);
      }
    }
    
    // Handle plain numbers
    let num = parseFloat(s);
    if (isNaN(num)) return 0;
    
    // If number is small (<20), assume it's minutes
    if (num < 20) {
      return Math.round(num * 60);
    }
    
    // Otherwise, assume it's already in seconds
    return Math.round(num);
  }

  // Format seconds to readable text
  function formatSecondsToMinutes(sec) {
    if (isNaN(sec) || sec <= 0) return "0 seconds";
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    
    const minText = minutes + (minutes === 1 ? " minute" : " minutes");
    const secText = seconds + (seconds === 1 ? " second" : " seconds");

    if (minutes > 0 && seconds > 0) {
      return `${minText} and ${secText}`;
    } else if (minutes > 0) {
      return minText;
    } else {
      return secText;
    }
  }

  // Calculate tier based on time
  function getTierInfo(totalSeconds) {
    if (totalSeconds >= 360) {
      return { current: "Freak", next: "", gap: -1 };
    } else if (totalSeconds >= 240) {
      return { current: "Legend", next: "Freak", gap: 360 - totalSeconds };
    } else if (totalSeconds >= 180) {
      return { current: "Elite", next: "Legend", gap: 240 - totalSeconds };
    } else if (totalSeconds >= 120) {
      return { current: "Pro", next: "Elite", gap: 180 - totalSeconds };
    } else if (totalSeconds >= 60) {
      return { current: "Contender", next: "Pro", gap: 120 - totalSeconds };
    } else {
      return { current: "Challenger", next: "Contender", gap: 60 - totalSeconds };
    }
  }

  // Process rows from bottom to top (newest first)
  for (let i = data.length - 1; i > 0; i--) {
    const row = data[i];
    
    // Skip if already emailed
    if (row[emailedCol]) continue;
    
    const email = row[emailColIndex];
    if (!email) continue;
    
    const name = row[nameColIndex] || 'Athlete';
    const time = row[timeColIndex] || '';
    
    const firstName = name.split(' ')[0];
    const totalSeconds = parseTimeToSeconds(time);
    const formattedTime = formatSecondsToMinutes(totalSeconds);
    
    // Get tier information
    const tierInfo = getTierInfo(totalSeconds);
    const motivationalText = tierInfo.gap === -1 
      ? `You're in the <strong>FREAK</strong> tier! You have officially transcended human limits.`
      : `Congrats on hitting <strong>${formattedTime}</strong>! You're in the <strong>${tierInfo.current}</strong> tier, and you're only <strong>${formatSecondsToMinutes(tierInfo.gap)}</strong> away from leveling up to the <strong>${tierInfo.next}</strong> tier. Keep going!`;
    
    // Random benefit fact
    const randomFact = benefits[Math.floor(Math.random() * benefits.length)];
    
    // Email content
    const subject = "Hang Tight! We're reviewing your WDHC submission ⏱️";
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h2 style="color: #000;">Hey ${firstName},</h2>
        <p>This is Milo from the World Dead Hang Championship.</p>
        <p>I just wanted to personally let you know that we received your submission and our team is reviewing your video proof now.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #D4AF37; margin: 20px 0;">
          ${motivationalText}
        </div>
        <p>We review every single hang manually to protect the integrity of the leaderboard. You can expect to see your official ranking go live on <strong>worlddeadhang.com</strong> within 24-48 hours if everything looks good.</p>
        <p style="color: #777; font-size: 0.9em;"><em>${randomFact}</em></p>
        <br>
        <p>Stay gritty,<br>
        <strong>Milo</strong><br>
        Co-Founder, WDHC</p>
      </div>
    `;
    
    // Send email
    try {
      GmailApp.sendEmail(email, subject, "", { 
        htmlBody: htmlBody, 
        name: "World Dead Hang Championship" 
      });
      
      // Mark as emailed
      activeSheet.getRange(i + 1, emailedCol + 1).setValue('Yes');
    } catch(err) {
      console.error("Error sending email to " + email + ": " + err);
    }
  }
}