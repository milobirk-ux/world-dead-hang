 email
    GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
    console.log(`Email sent to ${email} for ${name}`);
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