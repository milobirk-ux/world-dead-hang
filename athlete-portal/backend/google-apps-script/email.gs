// ==============================================
// WDHC Athlete Portal - Email Service
// Email templates and sending functions
// ==============================================

// Configuration
const EMAIL_CONFIG = {
  SENDER_EMAIL: 'noreply@worlddeadhang.com',
  SENDER_NAME: 'WDHC Athlete Portal',
  
  // Templates
  TEMPLATES: {
    MAGIC_LINK: 'magic_link',
    WELCOME: 'welcome',
    PR_VERIFICATION: 'pr_verification',
    PR_APPROVED: 'pr_approved',
    PR_REJECTED: 'pr_rejected',
    WEEKLY_SUMMARY: 'weekly_summary',
    MILESTONE: 'milestone',
    TRAINING_REMINDER: 'training_reminder'
  }
};

// ==================== EMAIL SENDING ====================

/**
 * Send email using template
 */
function sendEmail(to, templateType, data) {
  try {
    const template = getEmailTemplate(templateType, data);
    
    if (!template) {
      throw new Error(`Template not found: ${templateType}`);
    }
    
    MailApp.sendEmail({
      to: to,
      subject: template.subject,
      htmlBody: template.htmlBody,
      body: template.textBody,
      name: EMAIL_CONFIG.SENDER_NAME,
      replyTo: 'support@worlddeadhang.com'
    });
    
    console.log(`✅ Email sent to ${to}: ${template.subject}`);
    return true;
    
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return false;
  }
}

/**
 * Send magic link email
 */
function sendMagicLinkEmail(email, token, isNewAthlete, athleteName) {
  const loginUrl = `${CONFIG.FRONTEND_URL}/auth/verify?token=${token}`;
  
  const data = {
    athleteName: athleteName || 'Athlete',
    loginUrl: loginUrl,
    isNewAthlete: isNewAthlete,
    expiryHours: CONFIG.TOKEN_EXPIRY_HOURS
  };
  
  return sendEmail(email, EMAIL_CONFIG.TEMPLATES.MAGIC_LINK, data);
}

/**
 * Send welcome email to new athlete
 */
function sendWelcomeEmail(athlete) {
  const data = {
    athleteName: athlete.name || athlete.displayName || 'Athlete',
    dashboardUrl: `${CONFIG.FRONTEND_URL}/dashboard`,
    resourcesUrl: `${CONFIG.FRONTEND_URL}/resources`,
    communityUrl: 'https://discord.gg/wdhc' // Example
  };
  
  return sendEmail(athlete.email, EMAIL_CONFIG.TEMPLATES.WELCOME, data);
}

/**
 * Send PR verification notification to admins
 */
function sendPRVerificationNotification(pr) {
  const athlete = getAthleteById(pr.athleteId);
  if (!athlete) return false;
  
  // In production, this would go to admin email(s)
  const adminEmail = 'admin@worlddeadhang.com';
  
  const data = {
    athleteName: athlete.name || athlete.displayName || 'Unknown Athlete',
    hangTime: pr.hangTime,
    attemptDate: formatDate(pr.attemptDate),
    videoUrl: pr.videoUrl || 'No video provided',
    prId: pr.id,
    adminUrl: `${CONFIG.FRONTEND_URL}/admin/prs/${pr.id}`
  };
  
  return sendEmail(adminEmail, EMAIL_CONFIG.TEMPLATES.PR_VERIFICATION, data);
}

/**
 * Send PR approval notification to athlete
 */
function sendPRApprovedEmail(pr) {
  const athlete = getAthleteById(pr.athleteId);
  if (!athlete) return false;
  
  const data = {
    athleteName: athlete.name || athlete.displayName || 'Athlete',
    hangTime: pr.hangTime,
    attemptDate: formatDate(pr.attemptDate),
    rank: calculateAthleteRank(athlete.id),
    leaderboardUrl: `${CONFIG.FRONTEND_URL}/leaderboard`,
    profileUrl: `${CONFIG.FRONTEND_URL}/dashboard`
  };
  
  return sendEmail(athlete.email, EMAIL_CONFIG.TEMPLATES.PR_APPROVED, data);
}

/**
 * Send PR rejection notification to athlete
 */
function sendPRRejectedEmail(pr, reason) {
  const athlete = getAthleteById(pr.athleteId);
  if (!athlete) return false;
  
  const data = {
    athleteName: athlete.name || athlete.displayName || 'Athlete',
    hangTime: pr.hangTime,
    attemptDate: formatDate(pr.attemptDate),
    reason: reason || 'Video verification failed or submission did not meet requirements.',
    resubmitUrl: `${CONFIG.FRONTEND_URL}/submit`,
    rulesUrl: `${CONFIG.FRONTEND_URL}/rules`
  };
  
  return sendEmail(athlete.email, EMAIL_CONFIG.TEMPLATES.PR_REJECTED, data);
}

/**
 * Send weekly training summary
 */
function sendWeeklySummary(athlete, summaryData) {
  const data = {
    athleteName: athlete.name || athlete.displayName || 'Athlete',
    weekStart: formatDate(summaryData.weekStart),
    weekEnd: formatDate(summaryData.weekEnd),
    trainingSessions: summaryData.trainingSessions,
    totalDuration: summaryData.totalDuration,
    prsThisWeek: summaryData.prsThisWeek,
    consistencyScore: summaryData.consistencyScore,
    improvement: summaryData.improvement,
    dashboardUrl: `${CONFIG.FRONTEND_URL}/dashboard`,
    trainingUrl: `${CONFIG.FRONTEND_URL}/training`
  };
  
  return sendEmail(athlete.email, EMAIL_CONFIG.TEMPLATES.WEEKLY_SUMMARY, data);
}

/**
 * Send milestone achievement email
 */
function sendMilestoneEmail(athlete, milestone) {
  const data = {
    athleteName: athlete.name || athlete.displayName || 'Athlete',
    milestoneName: getMilestoneName(milestone.type),
    milestoneDescription: getMilestoneDescription(milestone.type),
    achievementDate: formatDate(new Date()),
    shareUrl: `${CONFIG.FRONTEND_URL}/achievements/${milestone.type}`,
    profileUrl: `${CONFIG.FRONTEND_URL}/dashboard`
  };
  
  return sendEmail(athlete.email, EMAIL_CONFIG.TEMPLATES.MILESTONE, data);
}

/**
 * Send training reminder
 */
function sendTrainingReminder(athlete, daysSinceLastTraining) {
  const data = {
    athleteName: athlete.name || athlete.displayName || 'Athlete',
    daysSinceLastTraining: daysSinceLastTraining,
    lastTrainingDate: formatDate(athlete.lastTrainingDate),
    trainingUrl: `${CONFIG.FRONTEND_URL}/training`,
    motivationQuote: getRandomMotivationQuote()
  };
  
  return sendEmail(athlete.email, EMAIL_CONFIG.TEMPLATES.TRAINING_REMINDER, data);
}

// ==================== EMAIL TEMPLATES ====================

function getEmailTemplate(templateType, data) {
  switch (templateType) {
    case EMAIL_CONFIG.TEMPLATES.MAGIC_LINK:
      return getMagicLinkTemplate(data);
    case EMAIL_CONFIG.TEMPLATES.WELCOME:
      return getWelcomeTemplate(data);
    case EMAIL_CONFIG.TEMPLATES.PR_VERIFICATION:
      return getPRVerificationTemplate(data);
    case EMAIL_CONFIG.TEMPLATES.PR_APPROVED:
      return getPRApprovedTemplate(data);
    case EMAIL_CONFIG.TEMPLATES.PR_REJECTED:
      return getPRRejectedTemplate(data);
    case EMAIL_CONFIG.TEMPLATES.WEEKLY_SUMMARY:
      return getWeeklySummaryTemplate(data);
    case EMAIL_CONFIG.TEMPLATES.MILESTONE:
      return getMilestoneTemplate(data);
    case EMAIL_CONFIG.TEMPLATES.TRAINING_REMINDER:
      return getTrainingReminderTemplate(data);
    default:
      return null;
  }
}

function getMagicLinkTemplate(data) {
  const subject = data.isNewAthlete 
    ? `Welcome to WDHC Athlete Portal, ${data.athleteName}!`
    : `Your WDHC Athlete Portal Login Link`;
  
  const actionText = data.isNewAthlete ? 'Complete Registration' : 'Login to Dashboard';
  const greeting = data.isNewAthlete 
    ? `Hi ${data.athleteName}, welcome to the WDHC community! We're excited to have you join the World Dead Hang Championship.`
    : `Hi ${data.athleteName}, click the link below to access your athlete dashboard:`;
  
  return {
    subject: subject,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #050505; color: #D4AF37; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }
          .footer { background-color: #050505; color: #888; padding: 20px; text-align: center; font-size: 12px; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>World Dead Hang Championship</h1>
          <h2>Athlete Portal</h2>
        </div>
        
        <div class="content">
          <p>${greeting}</p>
          
          <div style="text-align: center;">
            <a href="${data.loginUrl}" class="button">${actionText}</a>
          </div>
          
          <div class="warning">
            <p><strong>This link will expire in ${data.expiryHours} hours.</strong></p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          
          ${data.isNewAthlete ? `
          <p>Once registered, you'll be able to:</p>
          <ul>
            <li>Track your PRs and progress</li>
            <li>Log training sessions</li>
            <li>See your rank on the leaderboard</li>
            <li>Connect with other athletes</li>
            <li>Access exclusive training resources</li>
          </ul>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>World Dead Hang Championship<br>
          <a href="https://worlddeadhang.com" style="color: #D4AF37;">worlddeadhang.com</a></p>
          <p>If you need help, contact <a href="mailto:support@worlddeadhang.com" style="color: #D4AF37;">support@worlddeadhang.com</a></p>
        </div>
      </body>
      </html>
    `,
    textBody: `
World Dead Hang Championship - Athlete Portal

${greeting}

Login URL: ${data.loginUrl}

${actionText}: ${data.loginUrl}

This link will expire in ${data.expiryHours} hours.
If you didn't request this, please ignore this email.

${data.isNewAthlete ? `
Once registered, you'll be able to:
- Track your PRs and progress
- Log training sessions
- See your rank on the leaderboard
- Connect with other athletes
- Access exclusive training resources
` : ''}

World Dead Hang Championship
https://worlddeadhang.com

If you need help, contact support@worlddeadhang.com
    `
  };
}

function getWelcomeTemplate(data) {
  return {
    subject: `Welcome to WDHC Athlete Portal, ${data.athleteName}!`,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #050505; color: #D4AF37; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 10px 0; }
          .feature { background-color: white; border: 1px solid #eee; padding: 15px; margin: 15px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to WDHC!</h1>
          <h2>You're now part of the global grip strength community</h2>
        </div>
        
        <div class="content">
          <p>Hi ${data.athleteName},</p>
          
          <p>Welcome to the World Dead Hang Championship Athlete Portal! We're thrilled to have you join our community of grip strength athletes from around the world.</p>
          
          <div class="feature">
            <h3>🚀 Get Started</h3>
            <p>Begin your journey by setting up your profile and submitting your first PR:</p>
            <a href="${data.dashboardUrl}" class="button">Go to Your Dashboard</a>
          </div>
          
          <div class="feature">
            <h3>📊 Track Your Progress</h3>
            <p>Log your training sessions, track PRs, and watch your grip age grow as you improve.</p>
          </div>
          
          <div class="feature">
            <h3>🏆 Compete on the Leaderboard</h3>
            <p>See how you rank against athletes worldwide and in your country/age group.</p>
            <a href="${data.leaderboardUrl}" class="button">View Leaderboard</a>
          </div>
          
          <div class="feature">
            <h3>💪 Training Resources</h3>
            <p>Access exclusive training programs, technique guides, and community tips.</p>
            <a href="${data.resourcesUrl}" class="button">Explore Resources</a>
          </div>
          
          <div class="feature">
            <h3>👥 Join the Community</h3>
            <p>Connect with other athletes, share tips, and get motivated:</p>
            <a href="${data.communityUrl}" class="button">Join Discord Community</a>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Complete your athlete profile</li>
            <li>Submit your first dead hang PR</li>
            <li>Log your first training session</li>
            <li>Explore the leaderboard</li>
            <li>Join the community discussion</li>
          </ol>
          
          <p>We're here to help you achieve your grip strength goals. If you have any questions, don't hesitate to reach out!</p>
          
          <p>Stay strong,<br>
          The WDHC Team</p>
        </div>
        
        <div style="background-color: #050505; color: #888; padding: 20px; text-align: center; font-size: 12px;">
          <p>World Dead Hang Championship<br>
          <a href="https://worlddeadhang.com" style="color: #D4AF37;">worlddeadhang.com</a></p>
        </div>
      </body>
      </html>
    `,
    textBody: `
Welcome to WDHC Athlete Portal!

Hi ${data.athleteName},

Welcome to the World Dead Hang Championship Athlete Portal! We're thrilled to have you join our community of grip strength athletes from around the world.

GET STARTED
Begin your journey by setting up your profile and submitting your first PR:
Dashboard: ${data.dashboardUrl}

TRACK YOUR PROGRESS
Log your training sessions, track PRs, and watch your grip age grow as you improve.

COMPETE ON THE LEADERBOARD
See how you rank against athletes worldwide and in your country/age group.
Leaderboard: ${data.leaderboardUrl}

TRAINING RESOURCES
Access exclusive training programs, technique guides, and community tips.
Resources: ${data.resourcesUrl}

JOIN THE COMMUNITY
Connect with other athletes, share tips, and get motivated:
Community: ${data.communityUrl}

NEXT STEPS:
1. Complete your athlete profile
2. Submit your first dead hang PR
3. Log your first training session
4. Explore the leaderboard
5. Join the community discussion

We're here to help you achieve your grip strength goals. If you have any questions, don't hesitate to reach out!

Stay strong,
The WDHC Team

World Dead Hang Championship
https://worlddeadhang.com
    `
  };
}

function getPRVerificationTemplate(data) {
  return {
    subject: `PR Verification Required: ${data.athleteName} - ${data.hangTime}`,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #050505; color: #D4AF37; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
          .info-box { background-color: white; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PR Verification Required</h1>
        </div>
        
        <div class="content">
          <p>A new PR submission requires verification:</p>
          
          <div class="info-box">
            <h3>Athlete: ${data.athleteName}</h3>
            <p><strong>Hang Time:</strong> ${data.hangTime}</p>
            <p><strong>Attempt Date:</strong> ${data.attemptDate}</p>
            <p><strong>PR ID:</strong> ${data.prId}</p>
            ${data.videoUrl !== 'No video provided' ? `<p><strong>Video:</strong> <a href="${data.videoUrl}">${data.videoUrl}</a></p>` : '<p><strong>Video:</strong> No video provided</p>'}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.adminUrl}" class="button">Review Submission</a>
          </div>
          
          <p><strong>Action Required:</strong></p>
          <ul>
            <li>Verify the video meets submission requirements</li>
            <li>Check timing accuracy</li>
            <li>Approve or reject the submission</li>
            <li>Add notes if needed</li>
          </ul>
        </div>
        
        <div style="background-color: #050505; color: #888; padding: 20px; text-align: center; font-size: 12px;">
          <p>WDHC Admin Portal</p>
        </div>
      </body>
      </html>
    `,
    textBody: `
PR Verification Required

A new PR submission requires verification:

Athlete: ${data.athleteName}
Hang Time: ${data.hangTime}
Attempt Date: ${data.attemptDate}
PR ID: ${data.prId}
Video: ${data.videoUrl}

Review Submission: ${data.adminUrl}

Action Required:
- Verify the video meets submission requirements
- Check timing accuracy
- Approve or reject the submission
- Add notes if needed

WDHC Admin Portal
    `
  };
}

function getPRApprovedTemplate(data) {
  return {
    subject: `🎉 PR Approved! ${data.hangTime} - WDHC`,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #050505; color: #D4AF37; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
          .celebration { text-align: center; font-size: 48px; margin: 20px 0; }
          .stats { background-color: white; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PR Approved! 🏆</h1>
        </div>
        
        <div class="content">
          <div class="celebration">🎉</div>
          
          <p>Congratulations ${data.athleteName}!</p>
          
          <p>Your PR of <strong>${data.hangTime}</strong> has been verified and approved!</p>
          
          <div class="stats">
            <h3>Your Achievement</h3>
            <p><strong>Hang Time:</strong> ${data.hangTime}</p>
            <p><strong>Attempt Date:</strong> ${data.attemptDate}</p>
            <p><strong>Current Rank:</strong> #${data.rank}</p>
          </div>
          
          <p>Your PR has been added to the official WDHC leaderboard. Keep training hard to improve your rank!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.leaderboardUrl}" class="button">View Leaderboard</a>
            <a href="${data.profileUrl}" class="button" style="margin-left: 10px;">Your Profile</a>
          </div>
          
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>Check your updated rank on the leaderboard</li>
            <li>Log your training to track progress</li>
            <li>Set a new goal for your next PR</li>
            <li>Share your achievement with the community</li>
          </ul>
          
          <p>Stay strong and keep hanging! 💪</p>
          
          <p>The WDHC Team</p>
        </div>
        
        <div style="background-color: #050505; color: #888; padding: 20px; text-align: center; font-size: 12px;">
          <p>World Dead Hang Championship<br>
          <a href="https://worlddeadhang.com" style="color: #D4AF37;">worlddeadhang.com</a></p>
        </div>
      </body>
      </html>
    `,
    textBody: `
PR Approved! 🏆

Congratulations ${data.athleteName}!

Your PR of ${data.hangTime} has been verified and approved!

Your Achievement:
- Hang Time: ${data.hangTime}
- Attempt Date: ${data.attemptDate}
- Current Rank: #${data.rank}

Your PR has been added to the official WDHC leaderboard. Keep training hard to improve your rank!

View Leaderboard: ${data.leaderboardUrl}
Your Profile: ${data.profileUrl}

What's Next?
- Check your updated rank on the leaderboard
- Log your training to track progress
- Set a new goal for your next PR
- Share your achievement with the community

Stay strong and keep hanging! 💪

The WDHC Team

World Dead Hang Championship
https://worlddeadhang.com
    `
  };
}

function getPRRejectedTemplate(data) {
  return {
    subject: `PR Submission Update - WDHC`,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #050505; color: #D4AF37; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
          .notice { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PR Submission Update</h1>
        </div>
        
        <div class="content">
          <p>Hi ${data.athleteName},</p>
          
          <div class="notice">
            <h3>❌ PR Not Approved</h3>
            <p>Your submission of <strong>${data.hangTime}</strong> on ${data.attemptDate} could not be approved at this time.</p>
          </div>
          
          <p><strong>Reason:</strong></p>
          <p>${data.reason}</p>
          
          <p><strong>Submission Details:</strong></p>
          <ul>
            <li>Hang Time: ${data.hangTime}</li>
            <li>Attempt Date: ${data.attemptDate}</li>
          </ul>
          
          <p><strong>What to do next:</strong></p>
          <ol>
            <li>Review the submission requirements: <a href="${data.rulesUrl}">WDHC Rules</a></li>
            <li>Ensure your video clearly shows:
              <ul>
                <li>Full body in frame</li>
                <li>Clear timer/stopwatch</li>
                <li>Proper grip technique</li>
                <li>Full attempt from start to finish</li>
              </ul>
            </li>
            <li>Resubmit with corrected information</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resubmitUrl}" class="button">Resubmit PR</a>
            <a href="${data.rulesUrl}" class="button" style="margin-left: 10px; background-color: #666;">View Rules</a>
          </div>
          
          <p>We want to see you on the leaderboard! Please review the requirements and try again.</p>
          
          <p>If you have questions about the rejection reason, please reply to this email.</p>
          
          <p>The WDHC Team</p>
        </div>
        
        <div style="background-color: #050505; color: #888; padding: 20px; text-align: center; font-size: 12px;">
          <p>World Dead Hang Championship<br>
          <a href="https://worlddeadhang.com" style="color: #D4AF37;">worlddeadhang.com</a></p>
        </div>
      </body>
      </html>
    `,
    textBody: `
PR Submission Update

Hi ${data.athleteName},

❌ PR Not Approved
Your submission of ${data.hangTime} on ${data.attemptDate} could not be approved at this time.

Reason:
${data.reason}

Submission Details:
- Hang Time: ${data.hangTime}
- Attempt Date: ${data.attemptDate}

What to do next:
1. Review the submission requirements: ${data.rulesUrl}
2. Ensure your video clearly shows:
   - Full body in frame
   - Clear timer/stopwatch
   - Proper grip technique
   - Full attempt from start to finish
3. Resubmit with corrected information

Resubmit PR: ${data.resubmitUrl}
View Rules: ${data.rulesUrl}

We want to see you on the leaderboard! Please review the requirements and try again.

If you have questions about the rejection reason, please reply to this email.

The WDHC Team

World Dead Hang Championship
https://worlddeadhang.com
    `
  };
}

function getWeeklySummaryTemplate(data) {
  return {
    subject: `Your WDHC Weekly Summary - ${data.weekStart} to ${data.weekEnd}`,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #050505; color: #D4AF37; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
          .stat-box { background-color: white; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .stat { display: flex; justify-content: space-between; margin: 10px 0; }
          .improvement { color: green; font-weight: bold; }
          .consistency { color: #D4AF37; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Weekly Training Summary</h1>
          <p>${data.weekStart} - ${data.weekEnd}</p>
        </div>
        
        <div class="content">
          <p>Hi ${data.athleteName},</p>
          
          <p>Here's your weekly training summary. Keep up the great work! 💪</p>
          
          <div class="stat-box">
            <h3>📊 This Week's Stats</h3>
            
            <div class="stat">
              <span>Training Sessions:</span>
              <span><strong>${data.trainingSessions}</strong></span>
            </div>
            
            <div class="stat">
              <span>Total Training Time:</span>
              <span><strong>${data.totalDuration}</strong></span>
            </div>
            
            <div class="stat">
              <span>PRs This Week:</span>
              <span><strong>${data.prsThisWeek}</strong></span>
            </div>
            
            <div class="stat">
              <span>Consistency Score:</span>
              <span class="consistency"><strong>${data.consistencyScore}/100</strong></span>
            </div>
            
            ${data.improvement > 0 ? `
            <div class="stat">
              <span>Weekly Improvement:</span>
              <span class="improvement"><strong>+${data.improvement}%</strong></span>
            </div>
            ` : ''}
          </div>
          
          ${data.trainingSessions === 0 ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 4px;">
            <h3>⚠️ No Training This Week</h3>
            <p>You didn't log any training sessions this week. Remember, consistency is key to improvement!</p>
            <a href="${data.trainingUrl}" class="button">Log Training Now</a>
          </div>
          ` : ''}
          
          ${data.trainingSessions > 0 && data.consistencyScore < 70 ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 4px;">
            <h3>📈 Improve Consistency</h3>
            <p>Your consistency score is ${data.consistencyScore}/100. Try to train more regularly for better results!</p>
            <p>Goal: 3+ sessions per week</p>
          </div>
          ` : ''}
          
          ${data.trainingSessions >= 3 && data.consistencyScore >= 80 ? `
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 15px 0; border-radius: 4px;">
            <h3>🎯 Excellent Consistency!</h3>
            <p>Great job maintaining ${data.trainingSessions} sessions with ${data.consistencyScore}/100 consistency!</p>
            <p>This regular training will lead to steady improvement.</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" class="button">View Full Dashboard</a>
            <a href="${data.trainingUrl}" class="button" style="margin-left: 10px;">Log Next Session</a>
          </div>
          
          <p><strong>Tip of the Week:</strong> Focus on grip endurance by incorporating timed hangs at 50-70% of your max. This builds the muscular endurance needed for longer PRs.</p>
          
          <p>See you next week! Stay strong 💪</p>
          
          <p>The WDHC Team</p>
        </div>
        
        <div style="background-color: #050505; color: #888; padding: 20px; text-align: center; font-size: 12px;">
          <p>World Dead Hang Championship<br>
          <a href="https://worlddeadhang.com" style="color: #D4AF37;">worlddeadhang.com</a></p>
        </div>
      </body>
      </html>
    `,
    textBody: `
Weekly Training Summary
${data.weekStart} - ${data.weekEnd}

Hi ${data.athleteName},

Here's your weekly training summary. Keep up the great work! 💪

THIS WEEK'S STATS:
- Training Sessions: ${data.trainingSessions}
- Total Training Time: ${data.totalDuration}
- PRs This Week: ${data.prsThisWeek}
- Consistency Score: ${data.consistencyScore}/100
${data.improvement > 0 ? `- Weekly Improvement: +${data.improvement}%` : ''}

${data.trainingSessions === 0 ? `
⚠️ NO TRAINING THIS WEEK
You didn't log any training sessions this week. Remember, consistency is key to improvement!
Log Training: ${data.trainingUrl}
` : ''}

${data.trainingSessions > 0 && data.consistencyScore < 70 ? `
📈 IMPROVE CONSISTENCY
Your consistency score is ${data.consistencyScore}/100. Try to train more regularly for better results!
Goal: 3+ sessions per week
` : ''}

${data.trainingSessions >= 3 && data.consistencyScore >= 80 ? `
🎯 EXCELLENT CONSISTENCY!
Great job maintaining ${data.trainingSessions} sessions with ${data.consistencyScore}/100 consistency!
This regular training will lead to steady improvement.
` : ''}

View Full Dashboard: ${data.dashboardUrl}
Log Next Session: ${data.trainingUrl}

TIP OF THE WEEK: Focus on grip endurance by incorporating timed hangs at 50-70% of your max. This builds the muscular endurance needed for longer PRs.

See you next week! Stay strong 💪

The WDHC Team

World Dead Hang Championship
https://worlddeadhang.com
    `
  };
}

function getMilestoneTemplate(data) {
  return {
    subject: `🎉 Milestone Achieved: ${data.milestoneName}! - WDHC`,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #050505; color: #D4AF37; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
          .milestone { text-align: center; padding: 30px; background: linear-gradient(135deg, #D4AF37, #8a702a); color: white; border-radius: 10px; margin: 20px 0; }
          .trophy { font-size: 48px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Milestone Unlocked! 🏆</h1>
        </div>
        
        <div class="content">
          <div class="milestone">
            <div class="trophy">🏆</div>
            <h2>${data.milestoneName}</h2>
            <p>${data.milestoneDescription}</p>
            <p><strong>Achieved on: ${data.achievementDate}</strong></p>
          </div>
          
          <p>Congratulations ${data.athleteName}! 🎉</p>
          
          <p>You've reached an important milestone in your grip strength journey. This achievement demonstrates your dedication and progress.</p>
          
          <p><strong>What this means:</strong></p>
          <ul>
            <li>You're making consistent progress toward your goals</li>
            <li>Your training discipline is paying off</li>
            <li>You're building a foundation for even greater achievements</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.shareUrl}" class="button">Share Achievement</a>
            <a href="${data.profileUrl}" class="button" style="margin-left: 10px;">View Profile</a>
          </div>
          
          <p><strong>Keep going!</strong> Every milestone is a stepping stone to your next PR and personal best.</p>
          
          <p>Stay strong and keep hanging! 💪</p>
          
          <p>The WDHC Team</p>
        </div>
        
        <div style="background-color: #050505; color: #888; padding: 20px; text-align: center; font-size: 12px;">
          <p>World Dead Hang Championship<br>
          <a href="https://worlddeadhang.com" style="color: #D4AF37;">worlddeadhang.com</a></p>
        </div>
      </body>
      </html>
    `,
    textBody: `
Milestone Unlocked! 🏆

🎉 ${data.milestoneName} 🎉

${data.milestoneDescription}

Achieved on: ${data.achievementDate}

Congratulations ${data.athleteName}!

You've reached an important milestone in your grip strength journey. This achievement demonstrates your dedication and progress.

What this means:
- You're making consistent progress toward your goals
- Your training discipline is paying off
- You're building a foundation for even greater achievements

Share Achievement: ${data.shareUrl}
View Profile: ${data.profileUrl}

Keep going! Every milestone is a stepping stone to your next PR and personal best.

Stay strong and keep hanging! 💪

The WDHC Team

World Dead Hang Championship
https://worlddeadhang.com
    `
  };
}

function getTrainingReminderTemplate(data) {
  return {
    subject: `💪 Time for Training! - WDHC Reminder`,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #050505; color: #D4AF37; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
          .reminder { background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .quote { font-style: italic; text-align: center; margin: 20px 0; padding: 15px; background-color: white; border-left: 4px solid #D4AF37; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Training Reminder 💪</h1>
        </div>
        
        <div class="content">
          <p>Hi ${data.athleteName},</p>
          
          <div class="reminder">
            <h3>⏰ Time to Train!</h3>
            <p>It's been <strong>${data.daysSinceLastTraining} days</strong> since your last training session.</p>
            ${data.lastTrainingDate ? `<p>Last training: ${data.lastTrainingDate}</p>` : ''}
          </div>
          
          <p>Consistency is the key to grip strength improvement. Even a short session is better than no session!</p>
          
          <div class="quote">
            "${data.motivationQuote}"
          </div>
          
          <p><strong>Quick Training Ideas:</strong></p>
          <ul>
            <li>5x max hangs (10 seconds each)</li>
            <li>3x endurance hangs (60% max, 30 seconds)</li>
            <li>Grip strengthener exercises</li>
            <li>Forearm mobility work</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.trainingUrl}" class="button">Log Training Session</a>
          </div>
          
          <p><strong>Remember:</strong> Small, consistent efforts lead to big results over time.</p>
          
          <p>You've got this! 💪</p>
          
          <p>The WDHC Team</p>
          
          <p style="font-size: 12px; color: #666;">
            <em>To adjust reminder frequency, update your preferences in your athlete profile.</em>
          </p>
        </div>
        
        <div style="background-color: #050505; color: #888; padding: 20px; text-align: center; font-size: 12px;">
          <p>World Dead Hang Championship<br>
          <a href="https://worlddeadhang.com" style="color: #D4AF37;">worlddeadhang.com</a></p>
        </div>
      </body>
      </html>
    `,
    textBody: `
Training Reminder 💪

Hi ${data.athleteName},

⏰ TIME TO TRAIN!
It's been ${data.daysSinceLastTraining} days since your last training session.
${data.lastTrainingDate ? `Last training: ${data.lastTrainingDate}` : ''}

Consistency is the key to grip strength improvement. Even a short session is better than no session!

"${data.motivationQuote}"

QUICK TRAINING IDEAS:
- 5x max hangs (10 seconds each)
- 3x endurance hangs (60% max, 30 seconds)
- Grip strengthener exercises
- Forearm mobility work

Log Training Session: ${data.trainingUrl}

REMEMBER: Small, consistent efforts lead to big results over time.

You've got this! 💪

The WDHC Team

To adjust reminder frequency, update your preferences in your athlete profile.

World Dead Hang Championship
https://worlddeadhang.com
    `
  };
}

// ==================== UTILITY FUNCTIONS ====================

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getMilestoneName(milestoneType) {
  const names = {
    'first_pr': 'First PR Submitted',
    '5_prs': '5 PRs Achieved',
    '10_prs': '10 PRs Achieved',
    '30_seconds': '30-Second Hang',
    '1_minute': '1-Minute Hang',
    '2_minutes': '2-Minute Hang',
    '10_training_sessions': '10 Training Sessions',
    '50_training_sessions': '50 Training Sessions',
    'consistent_training': 'Consistent Training'
  };
  
  return names[milestoneType] || 'Milestone Achieved';
}

function getMilestoneDescription(milestoneType) {
  const descriptions = {
    'first_pr': 'You submitted your first official dead hang PR! The journey begins.',
    '5_prs': 'You\'ve achieved 5 personal records. Consistency leads to progress!',
    '10_prs': 'Double digits! 10 PRs shows serious dedication to improvement.',
    '30_seconds': 'You hung for 30 seconds! A solid foundation for endurance.',
    '1_minute': 'You reached the 1-minute mark! Elite grip endurance territory.',
    '2_minutes': '2 minutes of hanging! Exceptional grip strength and endurance.',
    '10_training_sessions': '10 training sessions logged. Building habits for success.',
    '50_training_sessions': '50 training sessions! True dedication to the craft.',
    'consistent_training': 'Maintained 80%+ consistency score. Regular training pays off!'
  };
  
  return descriptions[milestoneType] || 'A significant achievement in your grip strength journey.';
}

function getRandomMotivationQuote() {
  const quotes = [
    "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't.",
    "The only bad workout is the one that didn't happen.",
    "Don't stop when you're tired. Stop when you're done.",
    "Your body can stand almost anything. It's your mind you have to convince.",
    "The pain you feel today will be the strength you feel tomorrow.",
    "Success isn't always about greatness. It's about consistency.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Your only limit is you.",
    "Push yourself because no one else is going to do it for you.",
    "The difference between try and triumph is a little umph."
  ];
  
  return quotes[Math.floor(Math.random() * quotes.length)];
}