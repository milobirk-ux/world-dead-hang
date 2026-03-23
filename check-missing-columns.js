// Check missing columns in existing WDHC spreadsheet

// Columns needed for custom form that are missing from current sheet
const requiredColumns = [
  'Height (inches)',
  'Grip Training Experience',
  'Additional Notes'
];

// Current headers from previous output (simplified)
const currentHeaders = [
  'Submission ID',
  'Respondent ID',
  'Submitted at',
  'Athlete Name',
  '',
  'City, State / Province',
  'Country',
  'Date of Birth',
  'Gender',
  'Bodyweight',
  'Email Address',
  'Date of Attempt',
  'Official Time',
  '',
  'City, State / Country',
  'How did you hear about us?',
  'How did you hear about us? (Instagram)',
  'How did you hear about us? (TikTok)',
  'How did you hear about us? (Youtube)',
  'How did you hear about us? (Facebook / Reddit)',
  'How did you hear about us? (Google Search)',
  'How did you hear about us? (Word of Mouth / Gym)',
  'How did you hear about us? (Other)',
  'Occupation / Background',
  'Division',
  '',
  'Video Link (Copy & Paste Unlisted YouTube, Instagram / TIkTok, Google Drive Link)',
  'I confirm my attempt follows official WDHC rules...',
  'I confirm my attempt follows official WDHC rules...',
  'Approved',
  'Verified',
  'Emailed',
  '',
  'Previous Best',
  'PR Badge',
  '',
  'Is PR'
];

console.log('🔍 Checking missing columns...\n');

requiredColumns.forEach(column => {
  if (currentHeaders.includes(column)) {
    console.log(`✅ ${column} - Already exists`);
  } else {
    console.log(`❌ ${column} - NEEDS TO BE ADDED`);
  }
});

console.log('\n📊 Note: The current sheet has some duplicate/empty columns that could be cleaned up.');
console.log('   We need to add 3 new columns for the custom form.');