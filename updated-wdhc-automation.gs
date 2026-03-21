// WDHC UPDATED AUTOMATION SCRIPT
// Combines existing email automation + new approval workflow + social media triggers
// Install: Google Sheets → Extensions → Apps Script → Paste this → Save → Set up triggers

// Configuration
var SHEET_NAME = 'WDHC Database';
var STATUS_COL = 14; // Column N (1-indexed)
var EMAIL_COL = 5;   // Column E (1-indexed)
var NAME_COL = 4;    // Column D (1-indexed)
var TIME_COL = 10;   // Column J (1-indexed)
var CATEGORY_COL = 9; // Column I (1-indexed)
var VIDEO_COL = 11;  // Column K (1-indexed)
var LOCATION_COL = 7; // Column G (1-indexed)

// Main trigger function - runs when sheet is edited
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  
  // Only run on WDHC Database sheet
  if (sheet.getName() !== SHEET_NAME) return;
  
  // Only run if status column edited
  if (range.getColumn() !== STATUS_COL) return;
  
  var row = range.getRow();
  var status = e.value;
  var oldStatus = e.oldValue;
  
  // Skip header row
  if (row === 1) return;
  
  // Get athlete data
  var athleteName = sheet.getRange(row, NAME_COL).getValue();
  var athleteEmail = sheet.getRange(row, EMAIL_COL).getValue();
  var hangTime = sheet.getRange(row, TIME_COL).getValue();
  var category = sheet.getRange(row, CATEGORY_COL).getValue();
  var videoUrl = sheet.getRange(row, VIDEO_COL).getValue();
  var location = sheet.getRange(row, LOCATION_COL).getValue();
  
  // Status changed to Pending (new submission)
  if (status === 'Pending' && oldStatus !== 'Pending') {
    sendWelcomeEmail(athleteEmail, athleteName, hangTime, category);
    logAction('Email Sent', athleteName, athleteEmail);
    
    // Also check if this is a PR (using existing PR logic)
    checkForPR(sheet, row, athleteName, hangTime, category);
  }
  
  // Status changed to Approved
  if (status === 'Approved' && (oldStatus === 'Pending' || oldStatus === '')) {
    // Update website (triggers external process)
    triggerWebsiteUpdate(athleteName);
    
    // Create social media drafts
    createSocialMediaDrafts(athleteName, hangTime, category, location, videoUrl);
    
    // Log action
    logAction('Approved - Website Update Triggered', athleteName, hangTime);
  }
  
  // Status changed to Verified
  if (status === 'Verified' && oldStatus !== 'Verified') {
    // Update website with verification badge
    triggerWebsiteUpdate(athleteName);
    
    // Create verified social media drafts
    createVerifiedSocialMediaDrafts(athleteName, hangTime, category, location);
    
    // Log action
    logAction('Verified - Gold Badge Added', athleteName, 'Gold Checkmark');
  }
}

// === EXISTING EMAIL AUTOMATION FUNCTIONS (from complete-email-automation.js) ===

function sendWelcomeEmail(email, name, time, category) {
  if (!email || email === '') return;
  
  // Calculate grip age (same as website)
  var gripAge = calculateGripAge(time);
  
  var subject = 'Welcome to the World Dead Hang Championship!';
  var body = 'Hi ' + name + ',\n\n' +
             'Thank you for submitting your dead hang time of ' + time + ' in the ' + category + ' category!\n\n' +
             'Your grip age is: ' + gripAge + '\n\n' +
             'Your submission is now under review. Once approved, you\'ll appear on the official leaderboard.\n\n' +
             'Leaderboard: https://worlddeadhang.com\n\n' +
             'Stay strong!\n' +
             'The WDHC Team';
  
  MailApp.sendEmail(email, subject, body);
}

function calculateGripAge(time) {
  // Convert time to seconds
  var parts = time.toString().split(':');
  var seconds = 0;
  if (parts.length === 2) {
    seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  
  // Grip age formula (same as website)
  if (seconds >= 240) return '20s';
  if (seconds >= 180) return '30s';
  if (seconds >= 120) return '40s';
  if (seconds >= 90) return '50s';
  if (seconds >= 60) return '60s';
  if (seconds >= 45) return '70s';
  if (seconds >= 30) return '80s';
  return '90s';
}

function checkForPR(sheet, row, athleteName, time, category) {
  // Existing PR checking logic from complete-email-automation.js
  // Simplified version - checks if this is athlete's best time
  
  var data = sheet.getDataRange().getValues();
  var athleteTimes = [];
  
  // Find all previous submissions by this athlete
  for (var i = 1; i < data.length; i++) {
    var rowData = data[i];
    if (rowData[NAME_COL - 1] === athleteName && rowData[STATUS_COL - 1] === 'Approved') {
      athleteTimes.push(rowData[TIME_COL - 1]);
    }
  }
  
  // If this is their first approved time or a new best, mark as PR
  if (athleteTimes.length === 0 || isNewBestTime(time, athleteTimes)) {
    // Mark PR in sheet (simplified - would need PR column)
    // sheet.getRange(row, PR_COL).setValue('PR');
    logAction('Potential PR Detected', athleteName, time);
  }
}

function isNewBestTime(newTime, previousTimes) {
  // Compare times to see if new time is better
  // Simplified - would need proper time comparison logic
  return true; // Placeholder
}

// === NEW APPROVAL WORKFLOW FUNCTIONS ===

function triggerWebsiteUpdate(athleteName) {
  // This function would trigger an external process to update the website
  // For now, log the action and create a manual trigger file
  
  Logger.log('Website update triggered for: ' + athleteName);
  Logger.log('Run manually: python direct_leaderboard_sync.py approve "' + athleteName + '"');
  
  // Create a trigger file for external cron job to pick up
  var triggerData = {
    athlete: athleteName,
    action: 'approve',
    timestamp: new Date().toISOString()
  };
  
  // In a real implementation, this would write to a file or call a webhook
  // For Google Apps Script, we can only log and send notifications
}

function createSocialMediaDrafts(name, time, category, location, videoUrl) {
  // Create drafts for TikTok and Instagram
  
  var gripAge = calculateGripAge(time);
  
  // TikTok draft (video platform)
  var tiktokDraft = {
    platform: 'TikTok',
    caption: '🎉 NEW ATHLETE ALERT! ' + name + ' just joined the WDHC with a ' + time + ' dead hang!\n\n' +
             'Category: ' + category + '\n' +
             'Grip Age: ' + gripAge + '\n' +
             'Location: ' + location + '\n\n' +
             'Watch the video ➡️ ' + (videoUrl || 'No video yet') + '\n\n' +
             '#DeadHang #WDHC #GripStrength #TikTokFitness #' + category.replace(/\s+/g, ''),
    hashtags: ['#DeadHang', '#WDHC', '#GripStrength', '#TikTokFitness', '#' + category.replace(/\s+/g, '')],
    videoUrl: videoUrl
  };
  
  // Instagram draft (photo/video platform)
  var instagramDraft = {
    platform: 'Instagram',
    caption: 'Welcome to the World Dead Hang Championship, ' + name + '! 🎉\n\n' +
             '🏋️‍♂️ Time: ' + time + '\n' +
             '📊 Category: ' + category + '\n' +
             '💪 Grip Age: ' + gripAge + '\n' +
             '📍 Location: ' + location + '\n\n' +
             'Swipe up for the full leaderboard! 👆\n\n' +
             '#DeadHang #WorldDeadHang #GripStrength #Fitness #StrengthTraining #' + category.replace(/\s+/g, ''),
    hashtags: ['#DeadHang', '#WorldDeadHang', '#GripStrength', '#Fitness', '#StrengthTraining', '#' + category.replace(/\s+/g, '')],
    imageUrl: null // Would be generated from video thumbnail
  };
  
  // Log drafts (in real implementation, save to file or database)
  Logger.log('TikTok draft created: ' + JSON.stringify(tiktokDraft));
  Logger.log('Instagram draft created: ' + JSON.stringify(instagramDraft));
  
  logAction('Social Media Drafts Created', name, 'TikTok & Instagram');
}

function createVerifiedSocialMediaDrafts(name, time, category, location) {
  // Special drafts for verified athletes (gold checkmark)
  
  var gripAge = calculateGripAge(time);
  
  // TikTok verified draft
  var tiktokVerified = {
    platform: 'TikTok',
    caption: '🏆 VERIFIED ATHLETE ALERT! ' + name + ' is now OFFICIALLY VERIFIED with a ' + time + ' dead hang!\n\n' +
             'Gold checkmark earned ✅\n' +
             'Category: ' + category + '\n' +
             'Grip Age: ' + gripAge + '\n\n' +
             'This is LEGIT! 💪\n\n' +
             '#Verified #DeadHang #WDHC #GripStrength #EliteAthlete #' + category.replace(/\s+/g, ''),
    hashtags: ['#Verified', '#DeadHang', '#WDHC', '#GripStrength', '#EliteAthlete', '#' + category.replace(/\s+/g, '')]
  };
  
  // Instagram verified draft  
  var instagramVerified = {
    platform: 'Instagram',
    caption: 'OFFICIALLY VERIFIED! 🏆\n\n' +
             'Congratulations to ' + name + ' for earning the gold verification badge!\n\n' +
             '✅ Verified Time: ' + time + '\n' +
             '✅ Category: ' + category + '\n' +
             '✅ Grip Age: ' + gripAge + '\n' +
             '✅ Location: ' + location + '\n\n' +
             'Only the best get verified! 💪\n\n' +
             '#Verified #WorldDeadHang #EliteAthlete #GripStrength #FitnessGoals #' + category.replace(/\s+/g, ''),
    hashtags: ['#Verified', '#WorldDeadHang', '#EliteAthlete', '#GripStrength', '#FitnessGoals', '#' + category.replace(/\s+/g, '')]
  };
  
  Logger.log('Verified TikTok draft: ' + JSON.stringify(tiktokVerified));
  Logger.log('Verified Instagram draft: ' + JSON.stringify(instagramVerified));
  
  logAction('Verified Social Media Drafts Created', name, 'Gold Badge');
}

// === LOGGING FUNCTIONS ===

function logAction(action, athleteName, details) {
  var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Automation Log');
  if (!logSheet) {
    // Create log sheet if it doesn't exist
    logSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Automation Log');
    logSheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Action', 'Athlete', 'Details']]);
  }
  
  var timestamp = new Date();
  logSheet.appendRow([timestamp, action, athleteName, details]);
}

// === MANUAL TRIGGER FUNCTIONS (for testing) ===

function manualSendAllPendingEmails() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status = row[STATUS_COL - 1];
    var email = row[EMAIL_COL - 1];
    var name = row[NAME_COL - 1];
    var time = row[TIME_COL - 1];
    var category = row[CATEGORY_COL - 1];
    
    if (status === 'Pending' && email && email !== '') {
      sendWelcomeEmail(email, name, time, category);
      Utilities.sleep(1000); // Rate limiting
    }
  }
}

function manualCreateAllSocialDrafts() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status = row[STATUS_COL - 1];
    var name = row[NAME_COL - 1];
    var time = row[TIME_COL - 1];
    var category = row[CATEGORY_COL - 1];
    var location = row[LOCATION_COL - 1];
    var videoUrl = row[VIDEO_COL - 1];
    
    if (status === 'Approved' || status === 'Verified') {
      if (status === 'Verified') {
        createVerifiedSocialMediaDrafts(name, time, category, location);
      } else {
        createSocialMediaDrafts(name, time, category, location, videoUrl);
      }
      Utilities.sleep(1000);
    }
  }
}

// === SETUP FUNCTION (run once) ===

function setupAutomation() {
  // Create Automation Log sheet if it doesn't exist
  var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Automation Log');
  if (!logSheet) {
    logSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Automation Log');
    logSheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Action', 'Athlete', 'Details']]);
    logSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }
  
  Logger.log('WDHC Automation setup complete');
  Logger.log('Next: Set up triggers: Edit → Current project\'s triggers → Add trigger');
  Logger.log('Function: onEdit, Event: From spreadsheet, On edit');
}