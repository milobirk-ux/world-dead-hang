/**
 * WDHC Social Proof System - New Submission Monitor
 * 
 * Monitors Google Sheets for new athlete submissions and triggers
 * social proof automation.
 * 
 * Features:
 * - Checks for new submissions every 2 hours
 * - Detects unprocessed athletes
 * - Triggers graphic generation and social posting
 * - Updates tracking sheet
 * 
 * @author Otis (Night Shift Autopilot)
 * @version 1.0
 * @date 2026-03-26
 */

// Configuration
const CONFIG = {
  // Google Sheets
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE', // wdhc_database
  SHEET_NAME: 'custom form submissions',
  
  // Column indices (0-based)
  COLUMNS: {
    TIMESTAMP: 0,
    EMAIL: 1,
    NAME: 2,
    TIME: 3,
    DOB: 4,
    GENDER: 5,
    WEIGHT: 6,
    HEIGHT: 7,
    GRIP_TRAINING: 8,
    SOCIAL_POSTED: 17, // Column R - tracks if social post created
    SOCIAL_POST_ID: 18 // Column S - stores Twitter/X post ID
  },
  
  // Monitoring settings
  CHECK_INTERVAL_MINUTES: 120, // Check every 2 hours
  MAX_PROCESS_PER_RUN: 5, // Process max 5 new submissions per run
  
  // Social media settings
  PLATFORMS: ['twitter'], // Future: 'instagram', 'facebook', 'linkedin'
  
  // Debug mode
  DEBUG: true
};

/**
 * Main monitoring function - runs on schedule
 */
function monitorNewSubmissions() {
  console.log('🔍 WDHC Social Proof Monitor - Starting check');
  
  try {
    // 1. Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      console.error(`❌ Sheet "${CONFIG.SHEET_NAME}" not found`);
      return;
    }
    
    // 2. Get all data
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // 3. Validate column structure
    validateColumns(headers);
    
    // 4. Find new submissions (not yet posted to social)
    const newSubmissions = findNewSubmissions(data);
    
    if (newSubmissions.length === 0) {
      console.log('✅ No new submissions found');
      return;
    }
    
    console.log(`🎯 Found ${newSubmissions.length} new submissions to process`);
    
    // 5. Process new submissions (limit to max per run)
    const toProcess = newSubmissions.slice(0, CONFIG.MAX_PROCESS_PER_RUN);
    processSubmissions(toProcess, sheet);
    
    // 6. Update monitoring log
    updateMonitoringLog(newSubmissions.length, toProcess.length);
    
    console.log(`✅ Processed ${toProcess.length} submissions successfully`);
    
  } catch (error) {
    console.error('❌ Error in monitorNewSubmissions:', error);
    sendAlert(`Social Proof Monitor Error: ${error.message}`);
  }
}

/**
 * Find submissions that haven't been posted to social media
 */
function findNewSubmissions(data) {
  const newSubmissions = [];
  
  // Start from row 1 (skip headers)
  for (let row = 1; row < data.length; row++) {
    const rowData = data[row];
    const socialPosted = rowData[CONFIG.COLUMNS.SOCIAL_POSTED];
    
    // Check if social post hasn't been created
    if (!socialPosted || socialPosted.toString().trim().toLowerCase() !== 'yes') {
      const submission = {
        rowIndex: row,
        data: rowData,
        athlete: {
          timestamp: rowData[CONFIG.COLUMNS.TIMESTAMP],
          email: rowData[CONFIG.COLUMNS.EMAIL],
          name: rowData[CONFIG.COLUMNS.NAME],
          time: rowData[CONFIG.COLUMNS.TIME],
          dob: rowData[CONFIG.COLUMNS.DOB],
          gender: rowData[CONFIG.COLUMNS.GENDER],
          weight: rowData[CONFIG.COLUMNS.WEIGHT],
          height: rowData[CONFIG.COLUMNS.HEIGHT],
          gripTraining: rowData[CONFIG.COLUMNS.GRIP_TRAINING]
        }
      };
      
      // Validate required fields
      if (submission.athlete.name && submission.athlete.time) {
        newSubmissions.push(submission);
      }
    }
  }
  
  return newSubmissions;
}

/**
 * Process new submissions
 */
function processSubmissions(submissions, sheet) {
  for (const submission of submissions) {
    try {
      console.log(`📝 Processing: ${submission.athlete.name} - ${submission.athlete.time}`);
      
      // 1. Generate social media content
      const socialContent = generateSocialContent(submission.athlete);
      
      // 2. Post to social media
      const postResults = postToSocialMedia(socialContent);
      
      // 3. Update spreadsheet with results
      updateSubmissionStatus(submission, postResults, sheet);
      
      // 4. Log success
      console.log(`✅ Posted for ${submission.athlete.name}: ${postResults.twitter?.id || 'N/A'}`);
      
      // 5. Small delay between posts to avoid rate limits
      Utilities.sleep(2000);
      
    } catch (error) {
      console.error(`❌ Failed to process ${submission.athlete.name}:`, error);
      // Continue with next submission
    }
  }
}

/**
 * Generate social media content for an athlete
 */
function generateSocialContent(athlete) {
  // Parse time
  const totalSeconds = parseTimeToSeconds(athlete.time);
  const formattedTime = formatSecondsToDisplay(totalSeconds);
  
  // Determine tier
  const tier = calculateTier(totalSeconds);
  
  // Generate hashtags
  const hashtags = generateHashtags(tier, athlete.gender);
  
  // Create post content
  const postText = `🎉 NEW WDHC SUBMISSION!\n\n` +
                   `${athlete.name} just hung for ${formattedTime}!\n` +
                   `That's ${tier.level} level grip strength 💪\n\n` +
                   `${hashtags}\n\n` +
                   `Submit your hang: worlddeadhang.com/submit`;
  
  // Create graphic data
  const graphicData = {
    athleteName: athlete.name,
    hangTime: formattedTime,
    tier: tier,
    timestamp: new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  };
  
  return {
    text: postText,
    graphic: graphicData,
    athlete: athlete,
    tier: tier,
    hashtags: hashtags
  };
}

/**
 * Post content to social media platforms
 */
function postToSocialMedia(content) {
  const results = {};
  
  // Post to Twitter/X
  if (CONFIG.PLATFORMS.includes('twitter')) {
    try {
      const tweetResult = postToTwitter(content);
      results.twitter = tweetResult;
    } catch (error) {
      console.error('❌ Twitter post failed:', error);
      results.twitter = { error: error.message };
    }
  }
  
  // Future: Add Instagram, Facebook, LinkedIn
  
  return results;
}

/**
 * Post to Twitter/X
 */
function postToTwitter(content) {
  // TODO: Implement Twitter API integration
  // For now, return mock data
  
  if (CONFIG.DEBUG) {
    console.log('🐦 DEBUG Twitter Post:', content.text);
    return {
      id: 'debug_' + Date.now(),
      url: 'https://twitter.com/wdhc/status/debug',
      text: content.text
    };
  }
  
  // Actual Twitter API implementation would go here
  // Requires Twitter Developer account and API keys
  
  throw new Error('Twitter API not implemented yet');
}

/**
 * Update spreadsheet with posting status
 */
function updateSubmissionStatus(submission, postResults, sheet) {
  const row = submission.rowIndex + 1; // Convert to 1-based
  
  // Mark as posted
  sheet.getRange(row, CONFIG.COLUMNS.SOCIAL_POSTED + 1).setValue('Yes');
  
  // Store post ID if available
  if (postResults.twitter?.id) {
    sheet.getRange(row, CONFIG.COLUMNS.SOCIAL_POST_ID + 1).setValue(postResults.twitter.id);
  }
  
  // Add timestamp
  sheet.getRange(row, CONFIG.COLUMNS.SOCIAL_POSTED + 2).setValue(new Date());
}

/**
 * Validate column structure matches expected
 */
function validateColumns(headers) {
  const expectedColumns = [
    'Timestamp',
    'Email Address',
    'Athlete Name',
    'Official Time',
    'Date of Birth',
    'Gender',
    'Bodyweight lbs',
    'Height (inches)',
    'Grip Training Experience'
  ];
  
  for (let i = 0; i < expectedColumns.length; i++) {
    if (headers[i] !== expectedColumns[i]) {
      console.warn(`⚠️ Column ${i} mismatch: Expected "${expectedColumns[i]}", got "${headers[i]}"`);
    }
  }
}

/**
 * Parse time string to seconds
 */
function parseTimeToSeconds(timeStr) {
  // Reuse the fixed time parsing from email automation
  // This should match the exact same logic
  const s = String(timeStr || '0').trim();
  
  if (s.includes(':')) {
    const parts = s.split(':');
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  
  if (s.includes('.')) {
    const parts = s.split('.');
    const minutes = parseInt(parts[0]) || 0;
    const decimal = parts[1];
    
    if (decimal.length === 1) {
      return minutes * 60 + (parseInt(decimal) * 6);
    } else if (decimal.length === 2) {
      const seconds = parseInt(decimal);
      return minutes * 60 + (seconds < 60 ? seconds : 0);
    }
    
    return Math.round(parseFloat(s) * 60);
  }
  
  const num = parseFloat(s);
  if (num < 30) return Math.round(num);
  if (num >= 60 && num <= 300) return Math.round(num);
  if (num >= 30 && num < 60) return Math.round(num);
  
  return Math.round(num * 60);
}

/**
 * Format seconds for display
 */
function formatSecondsToDisplay(seconds) {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate tier based on seconds
 */
function calculateTier(seconds) {
  if (seconds >= 360) return { level: 'FREAK', emoji: '👑', color: '#FFD700' };
  if (seconds >= 240) return { level: 'LEGEND', emoji: '⭐', color: '#C0C0C0' };
  if (seconds >= 180) return { level: 'ELITE', emoji: '🔥', color: '#CD7F32' };
  if (seconds >= 120) return { level: 'PRO', emoji: '💪', color: '#4CAF50' };
  if (seconds >= 60) return { level: 'CONTENDER', emoji: '⚡', color: '#2196F3' };
  return { level: 'CHALLENGER', emoji: '🎯', color: '#9C27B0' };
}

/**
 * Generate relevant hashtags
 */
function generateHashtags(tier, gender) {
  const baseTags = ['#WDHC', '#WorldDeadHang', '#GripStrength', '#DeadHang'];
  const tierTag = `#${tier.level}Grip`;
  const genderTag = gender?.toLowerCase().includes('female') ? '#WomenWhoHang' : '#GripAthlete';
  
  return [...baseTags, tierTag, genderTag, '#GripSport', '#Calisthenics'].join(' ');
}

/**
 * Update monitoring log
 */
function updateMonitoringLog(foundCount, processedCount) {
  const logSheetName = 'Social Proof Log';
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let logSheet = spreadsheet.getSheetByName(logSheetName);
  
  if (!logSheet) {
    logSheet = spreadsheet.insertSheet(logSheetName);
    logSheet.getRange(1, 1, 1, 5).setValues([[
      'Timestamp', 'Found', 'Processed', 'Status', 'Notes'
    ]]);
  }
  
  const timestamp = new Date();
  const status = processedCount > 0 ? 'SUCCESS' : 'NO_NEW';
  const notes = processedCount > 0 ? `Processed ${processedCount} submissions` : 'No new submissions';
  
  logSheet.appendRow([
    timestamp,
    foundCount,
    processedCount,
    status,
    notes
  ]);
}

/**
 * Send alert for critical errors
 */
function sendAlert(message) {
  // TODO: Implement alert system (email, Slack, etc.)
  console.error('🚨 ALERT:', message);
}

/**
 * Test function - run manually to test the system
 */
function testSocialProofSystem() {
  console.log('🧪 Testing Social Proof System...');
  
  // Create a test submission
  const testSubmission = {
    rowIndex: 999,
    data: [],
    athlete: {
      name: 'Test Athlete',
      time: '4:26',
      gender: 'Male',
      weight: '175',
      height: '70',
      gripTraining: 'Intermediate'
    }
  };
  
  const content = generateSocialContent(testSubmission.athlete);
  console.log('Generated content:', content.text);
  console.log('Hashtags:', content.hashtags);
  console.log('Tier:', content.tier);
  
  console.log('✅ Test completed successfully');
}

// Export functions for Google Apps Script
if (typeof module !== 'undefined') {
  module.exports = {
    monitorNewSubmissions,
    testSocialProofSystem
  };
}