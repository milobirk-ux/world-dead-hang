15px; border-top: 1px solid #ddd;">' +
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
  <p style="color: #666; font-size: 0.9em;">${randomFact}</p>
  <p>Stay strong,<br><strong>Milo</strong><br>World Dead Hang Championship</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="font-size: 0.8em; color: #999;">This is an automated message. Please do not reply to this email. If you have questions, contact us through the website.</p>
</div>`;

    try {
      // Send email
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: htmlBody,
        name: "World Dead Hang Championship"
      });
      
      // Mark as emailed
      activeSheet.getRange(i + 1, emailedCol + 1).setValue('Yes');
      
      Logger.log(`✅ Email sent to ${name} (${email}) - ${isPR ? 'PR!' : 'Not PR'}`);
      
    } catch (err) {
      Logger.log(`❌ Failed to send email to ${email}: ${err.toString()}`);
    }
  }
}

// Test function - run this manually to test the script
function testEmailAutomation() {
  // Create a mock event object
  const mockEvent = {
    changeType: 'INSERT_ROW'
  };
  
  console.log("Testing email automation...");
  sendWelcomeEmailOnNewRow(mockEvent);
  console.log("Test complete!");
}