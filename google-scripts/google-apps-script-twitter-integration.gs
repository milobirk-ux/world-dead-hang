/**
 * Google Apps Script: WDHC Twitter Integration
 * 
 * This script runs when new rows are added to the WDHC Google Sheet
 * and posts to Twitter/X automatically.
 * 
 * Setup Instructions:
 * 1. Create Twitter Developer App: https://developer.twitter.com/
 * 2. Get API keys and access tokens
 * 3. Add them as Script Properties (see below)
 * 4. Set up trigger: Edit > Current project's triggers
 *    - Run: onFormSubmit
 *    - Events: From spreadsheet, On form submit
 */

// Configuration - Set these as Script Properties
// Script Properties Key Names:
// - TWITTER_API_KEY
// - TWITTER_API_SECRET  
// - TWITTER_ACCESS_TOKEN
// - TWITTER_ACCESS_SECRET
// - WDHC_LEADERBOARD_URL (optional)

function getScriptProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * Main function triggered when new form submission is added
 * @param {Object} e - Event object from Google Sheets
 */
function onFormSubmit(e) {
  try {
    Logger.log('WDHC Twitter Integration: New form submission detected');
    
    // Get the new row data
    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();
    const data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Map columns based on WDHC Google Sheet structure
    // Adjust column indices based on your actual sheet structure
    const athleteData = {
      timestamp: data[0], // Column A
      name: data[1],      // Column B
      email: data[2],     // Column C
      time: parseFloat(data[3]) || 0, // Column D
      country: data[4],   // Column E
      videoUrl: data[5],  // Column F
      gripAge: parseFloat(data[6]) || null, // Column G
      tier: data[7] || 'Pending', // Column H
      status: data[8] || 'Pending', // Column I
      verified: data[9] || false // Column J
    };
    
    Logger.log('Athlete data:', JSON.stringify(athleteData));
    
    // Only post if athlete is approved (status = "Approved")
    if (athleteData.status === 'Approved') {
      const action = athleteData.verified ? 'verify' : 'approve';
      postToTwitter(athleteData, action);
    } else {
      Logger.log('Athlete not approved yet, skipping Twitter post');
    }
    
  } catch (error) {
    Logger.log('Error in onFormSubmit: ' + error.toString());
    // Don't throw error to prevent form submission failure
  }
}

/**
 * Post athlete data to Twitter
 * @param {Object} athleteData - Athlete information
 * @param {string} action - 'approve' or 'verify'
 */
function postToTwitter(athleteData, action) {
  try {
    const tweetText = generateTweet(athleteData, action);
    
    // Post to Twitter using Twitter API
    const response = postTweet(tweetText);
    
    Logger.log('Twitter post successful: ' + JSON.stringify(response));
    
    // Optional: Add tweet URL to Google Sheet
    if (response && response.id_str) {
      const tweetUrl = `https://twitter.com/user/status/${response.id_str}`;
      addTweetUrlToSheet(athleteData.email, tweetUrl);
    }
    
  } catch (error) {
    Logger.log('Error posting to Twitter: ' + error.toString());
  }
}

/**
 * Generate tweet text for athlete approval/verification
 * @param {Object} athlete - Athlete data
 * @param {string} action - 'approve' or 'verify'
 * @returns {string} Tweet text
 */
function generateTweet(athlete, action) {
  const timeFormatted = formatTime(athlete.time);
  const gripAgeFormatted = athlete.gripAge ? athlete.gripAge + ' years' : 'N/A';
  const leaderboardUrl = getScriptProperty('WDHC_LEADERBOARD_URL') || 'https://world-dead-hang.com/leaderboard-full.html';
  
  const hashtags = ['#DeadHang', '#GripStrength', '#Calisthenics', '#WDHC', '#WorldDeadHang'];
  
  if (action === 'verify') {
    return `✅ GOLD VERIFIED: ${athlete.name} earned the pro verification checkmark!\n\n⏱️ ${timeFormatted} dead hang\n🌍 ${athlete.country}\n👊 ${gripAgeFormatted} grip age\n⭐ ${athlete.tier} tier\n\nPro athletes get the gold checkmark on the WDHC leaderboard.\n\n${leaderboardUrl}\n\n${hashtags.join(' ')}`;
  } else {
    // Randomly select one of several approval tweet templates
    const templates = [
      `🏆 NEW ATHLETE APPROVED: ${athlete.name} just joined the World Dead Hang Championship!\n\n⏱️ Time: ${timeFormatted}\n🌍 Country: ${athlete.country}\n👊 Grip Age: ${gripAgeFormatted}\n⭐ Tier: ${athlete.tier}\n\nCheck the leaderboard: ${leaderboardUrl}\n\n${hashtags.join(' ')}`,
      
      `👋 Welcome ${athlete.name} to the WDHC! ${timeFormatted} hang from ${athlete.country} earns ${athlete.tier} tier.\n\nGrip age: ${gripAgeFormatted}\n\nSee all athletes: ${leaderboardUrl}\n\n${hashtags.join(' ')}`,
      
      `🚀 ${athlete.name} is now on the WDHC leaderboard! ${timeFormatted} dead hang verified.\n\nCountry: ${athlete.country}\nTier: ${athlete.tier}\nGrip Age: ${gripAgeFormatted}\n\nJoin the competition: https://world-dead-hang.com\n\n${hashtags.join(' ')}`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }
}

/**
 * Format time from seconds to MM:SS
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time
 */
function formatTime(seconds) {
  if (!seconds || seconds === 0) return 'N/A';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return minutes + ':' + (remainingSeconds < 10 ? '0' : '') + remainingSeconds;
}

/**
 * Post tweet using Twitter API v1.1
 * @param {string} tweetText - Text to tweet
 * @returns {Object} Twitter API response
 */
function postTweet(tweetText) {
  const apiKey = getScriptProperty('TWITTER_API_KEY');
  const apiSecret = getScriptProperty('TWITTER_API_SECRET');
  const accessToken = getScriptProperty('TWITTER_ACCESS_TOKEN');
  const accessSecret = getScriptProperty('TWITTER_ACCESS_SECRET');
  
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('Twitter API credentials not configured. Set Script Properties.');
  }
  
  // Twitter API endpoint
  const url = 'https://api.twitter.com/1.1/statuses/update.json';
  
  // OAuth 1.0a parameters
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: Utilities.getUuid(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_token: accessToken,
    oauth_version: '1.0'
  };
  
  // Create signature base string
  const params = {
    status: tweetText.substring(0, 280) // Ensure within character limit
  };
  
  const allParams = {...oauthParams, ...params};
  const paramString = Object.keys(allParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
    .join('&');
  
  const signatureBaseString = `POST&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  
  // Create signing key
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
  
  // Generate signature
  const signature = Utilities.computeHmacSha256Signature(signatureBaseString, signingKey);
  const signatureBase64 = Utilities.base64Encode(signature);
  
  oauthParams.oauth_signature = signatureBase64;
  
  // Create Authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
  
  // Make the API request
  const options = {
    method: 'post',
    headers: {
      Authorization: authHeader
    },
    payload: params,
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  if (responseCode !== 200) {
    throw new Error(`Twitter API error ${responseCode}: ${responseText}`);
  }
  
  return JSON.parse(responseText);
}

/**
 * Add tweet URL to Google Sheet for tracking
 * @param {string} email - Athlete email
 * @param {string} tweetUrl - Tweet URL
 */
function addTweetUrlToSheet(email, tweetUrl) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    // Find row by email (assuming email is in column C)
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === email) { // Column C is index 2
        // Add tweet URL to column K (index 10)
        sheet.getRange(i + 1, 11).setValue(tweetUrl);
        Logger.log(`Added tweet URL for ${email}: ${tweetUrl}`);
        break;
      }
    }
  } catch (error) {
    Logger.log('Error adding tweet URL to sheet: ' + error.toString());
  }
}

/**
 * Manual function to test Twitter integration
 */
function testTwitterIntegration() {
  const testAthlete = {
    name: 'Test Athlete',
    time: 125, // 2:05
    country: 'USA',
    gripAge: 3.5,
    tier: 'Elite',
    status: 'Approved',
    verified: false,
    email: 'test@example.com'
  };
  
  Logger.log('Testing Twitter integration...');
  Logger.log('Generated tweet:');
  Logger.log(generateTweet(testAthlete, 'approve'));
  
  // Uncomment to actually post test tweet
  // postToTwitter(testAthlete, 'approve');
}

/**
 * Set up script properties (run once)
 */
function setupScriptProperties() {
  const properties = {
    // Add your Twitter API credentials here
    // TWITTER_API_KEY: 'your_api_key_here',
    // TWITTER_API_SECRET: 'your_api_secret_here',
    // TWITTER_ACCESS_TOKEN: 'your_access_token_here',
    // TWITTER_ACCESS_SECRET: 'your_access_secret_here',
    WDHC_LEADERBOARD_URL: 'https://world-dead-hang.com/leaderboard-full.html'
  };
  
  PropertiesService.getScriptProperties().setProperties(properties);
  Logger.log('Script properties set up successfully');
}