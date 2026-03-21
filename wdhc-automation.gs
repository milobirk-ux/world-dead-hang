// WDHC Google Apps Script Automation
// Install: Tools → Script Editor → Paste this code → Save
// Triggers: Edit → Current project's triggers → Add trigger:
//   - Choose function: onEdit
//   - Choose event: From spreadsheet, On edit

// Configuration
var SHEET_NAME = 'WDHC Database';
var STATUS_COL = 14; // Column N (1-indexed)
var EMAIL_COL = 5;   // Column E (1-indexed)
var NAME_COL = 4;    // Column D (1-indexed)
var TIME_COL = 10;   // Column J (1-indexed)
var CATEGORY_COL = 9; // Column I (1-indexed)

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
  
  // Status changed to Pending (new submission)
  if (status === 'Pending' && oldStatus !== 'Pending') {
    sendWelcomeEmail(athleteEmail, athleteName, hangTime, category);
    logAction('Email sent', athleteName, athleteEmail);
  }
  
  // Status changed to Approved
  if ((status === 'Approved' || status === 'Verified') && 
      (oldStatus === 'Pending' || oldStatus === '')) {
    updateWebsite(athleteName, status);
    logAction('Website updated', athleteName, status);
  }
}

function sendWelcomeEmail(email, name, time, category) {
  if (!email || email === '') return;
  
  // Calculate grip age
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

function updateWebsite(athleteName, status) {
  // This function would call your existing sync script
  // Since Apps Script can't run local scripts, we'll log the action
  // You'll need to set up a webhook or use the existing manual process
  
  Logger.log('Athlete ready for website update: ' + athleteName + ' (' + status + ')');
  Logger.log('Run: node direct_leaderboard_sync.py approve "' + athleteName + '"');
  
  // Alternative: Use UrlFetchApp to trigger a webhook
  // var webhookUrl = 'YOUR_WEBHOOK_URL';
  // var payload = {
  //   'athlete': athleteName,
  //   'status': status,
  //   'action': 'approve'
  // };
  // UrlFetchApp.fetch(webhookUrl, {
  //   'method': 'post',
  //   'contentType': 'application/json',
  //   'payload': JSON.stringify(payload)
  // });
}

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

// Manual trigger functions
function manualSendWelcomeEmail() {
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

function manualUpdateAllApproved() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status = row[STATUS_COL - 1];
    var name = row[NAME_COL - 1];
    
    if (status === 'Approved' || status === 'Verified') {
      updateWebsite(name, status);
      Utilities.sleep(1000);
    }
  }
}