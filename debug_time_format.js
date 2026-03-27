// Debug script to check what's in the "Official Time" column
function debugTimeFormat() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName("custom form submissions");
  
  if (!sheet) {
    console.error("Sheet not found");
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find column indices
  const timeColIndex = headers.findIndex(h => h.toString().trim() === 'Official Time');
  const nameColIndex = headers.findIndex(h => h.toString().trim() === 'Athlete Name');
  
  console.log("=== DEBUG TIME FORMAT ===");
  console.log(`Official Time column: ${timeColIndex} (${String.fromCharCode(65 + timeColIndex)})`);
  console.log(`Athlete Name column: ${nameColIndex} (${String.fromCharCode(65 + nameColIndex)})`);
  
  // Check all rows
  for (let row = 1; row < data.length; row++) {
    const rowData = data[row];
    const name = rowData[nameColIndex];
    const time = rowData[timeColIndex];
    
    if (name && name.toString().includes('Milo')) {
      console.log(`\nFound Milo at row ${row + 1}:`);
      console.log(`Name: "${name}"`);
      console.log(`Time raw: "${time}" (type: ${typeof time})`);
      console.log(`Time toString(): "${time.toString()}"`);
      console.log(`Time valueOf(): ${time.valueOf()}`);
      
      // Test parsing
      const testParse = parseTimeToSeconds(time);
      console.log(`parseTimeToSeconds result: ${testParse} seconds = ${Math.floor(testParse/60)}:${testParse%60}`);
    }
  }
}

function parseTimeToSeconds(timeStr) {
  let s = String(timeStr || '0').trim();
  
  // Handle colon format (e.g., "4:10" = 4 minutes, 10 seconds)
  if (s.includes(':')) {
    let p = s.split(':');
    return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
  }
  
  // Handle decimal format
  if (s.includes('.')) {
    let parts = s.split('.');
    let minutes = parseInt(parts[0]) || 0;
    let decimalPart = parts[1];
    
    if (decimalPart.length === 1) {
      let tenths = parseInt(decimalPart) || 0;
      let seconds = Math.round(tenths * 6);
      return minutes * 60 + seconds;
    }
    else if (decimalPart.length === 2) {
      let seconds = parseInt(decimalPart) || 0;
      if (seconds < 60) {
        return minutes * 60 + seconds;
      }
    }
    
    let num = parseFloat(s);
    if (!isNaN(num)) {
      return Math.round(num * 60);
    }
  }
  
  // Handle plain numbers
  let num = parseFloat(s);
  if (isNaN(num)) return 0;
  
  // If number is between 200-300, assume it's total seconds for 4:xx hangs
  if (num >= 200 && num <= 300) {
    return Math.round(num);
  }
  
  // If number is less than 60, assume seconds
  if (num < 60) {
    return Math.round(num);
  }
  
  // If number is 60-199, assume total seconds
  if (num >= 60 && num < 200) {
    return Math.round(num);
  }
  
  // Otherwise assume minutes and convert
  return Math.round(num * 60);
}