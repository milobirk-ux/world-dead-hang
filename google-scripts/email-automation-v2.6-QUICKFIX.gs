// QUICK FIX for triggerEmailAutomation function
// Replace the triggerEmailAutomation function in your current v2.5 script with this version

function triggerEmailAutomation(sheet, row) {
  // This function triggers the email automation
  // We need to activate the Custom Form Submissions sheet first
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const targetSheet = ss.getSheetByName('Custom Form Submissions');
    
    if (!targetSheet) {
      console.error('Custom Form Submissions sheet not found');
      return;
    }
    
    // Activate the sheet so getActiveSheet() returns the correct one
    targetSheet.activate();
    
    // Give a small delay for sheet activation
    Utilities.sleep(100);
    
    // Now call the email function
    sendWelcomeEmailOnNewRow({ 
      source: ss, 
      changeType: 'INSERT_ROW' 
    });
    
  } catch (error) {
    console.error('Email automation failed:', error);
    console.error('Error details:', error.toString());
  }
}