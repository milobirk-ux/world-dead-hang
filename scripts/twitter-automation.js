/**
 * WDHC Twitter Automation
 * Posts new athlete approvals to Twitter/X automatically
 * Triggered by Google Apps Script when new rows are added to Google Sheet
 */

const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  twitter: {
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  },
  wdhc: {
    websiteUrl: 'https://world-dead-hang.com',
    leaderboardUrl: 'https://world-dead-hang.com/leaderboard-full.html',
    hashtags: ['#DeadHang', '#GripStrength', '#Calisthenics', '#WDHC', '#WorldDeadHang']
  }
};

class WDHC_TwitterBot {
  constructor() {
    this.client = new TwitterApi({
      appKey: CONFIG.twitter.appKey,
      appSecret: CONFIG.twitter.appSecret,
      accessToken: CONFIG.twitter.accessToken,
      accessSecret: CONFIG.twitter.accessSecret,
    });
    
    this.readWriteClient = this.client.readWrite;
  }

  /**
   * Generate tweet for new athlete approval
   * @param {Object} athlete - Athlete data from Google Sheet
   * @returns {string} Formatted tweet
   */
  generateApprovalTweet(athlete) {
    const { name, time, country, gripAge, tier } = athlete;
    
    const timeFormatted = this.formatTime(time);
    const gripAgeFormatted = gripAge ? `${gripAge} years` : 'N/A';
    
    const tweets = [
      `🏆 NEW ATHLETE APPROVED: ${name} just joined the World Dead Hang Championship!\n\n⏱️ Time: ${timeFormatted}\n🌍 Country: ${country}\n👊 Grip Age: ${gripAgeFormatted}\n⭐ Tier: ${tier}\n\nCheck the leaderboard: ${CONFIG.wdhc.leaderboardUrl}\n\n${CONFIG.wdhc.hashtags.join(' ')}`,
      
      `👋 Welcome ${name} to the WDHC! ${timeFormatted} hang from ${country} earns ${tier} tier.\n\nGrip age: ${gripAgeFormatted}\n\nSee all athletes: ${CONFIG.wdhc.leaderboardUrl}\n\n${CONFIG.wdhc.hashtags.join(' ')}`,
      
      `🚀 ${name} is now on the WDHC leaderboard! ${timeFormatted} dead hang verified.\n\nCountry: ${country}\nTier: ${tier}\nGrip Age: ${gripAgeFormatted}\n\nJoin the competition: ${CONFIG.wdhc.websiteUrl}\n\n${CONFIG.wdhc.hashtags.join(' ')}`
    ];
    
    // Select random tweet template
    return tweets[Math.floor(Math.random() * tweets.length)];
  }

  /**
   * Generate tweet for athlete verification (gold checkmark)
   * @param {Object} athlete - Athlete data from Google Sheet
   * @returns {string} Formatted tweet
   */
  generateVerificationTweet(athlete) {
    const { name, time, country, gripAge, tier } = athlete;
    
    const timeFormatted = this.formatTime(time);
    const gripAgeFormatted = gripAge ? `${gripAge} years` : 'N/A';
    
    return `✅ GOLD VERIFIED: ${name} earned the pro verification checkmark!\n\n⏱️ ${timeFormatted} dead hang\n🌍 ${country}\n👊 ${gripAgeFormatted} grip age\n⭐ ${tier} tier\n\nPro athletes get the gold checkmark on the WDHC leaderboard.\n\n${CONFIG.wdhc.leaderboardUrl}\n\n${CONFIG.wdhc.hashtags.join(' ')}`;
  }

  /**
   * Generate weekly leaderboard update tweet
   * @param {Object} stats - Weekly statistics
   * @returns {string} Formatted tweet
   */
  generateWeeklyUpdateTweet(stats) {
    const { newAthletes, topTime, topAthlete, totalAthletes } = stats;
    
    return `📊 WDHC WEEKLY UPDATE:\n\n🏆 ${newAthletes} new athletes joined\n⏱️ Top time: ${this.formatTime(topTime)} by ${topAthlete}\n👥 Total athletes: ${totalAthletes}\n\nFull leaderboard: ${CONFIG.wdhc.leaderboardUrl}\n\n${CONFIG.wdhc.hashtags.join(' ')}`;
  }

  /**
   * Format time from seconds to MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatTime(seconds) {
    if (!seconds || seconds === 0) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Post tweet to Twitter
   * @param {string} tweetText - Text to tweet
   * @returns {Promise<Object>} Tweet response
   */
  async postTweet(tweetText) {
    try {
      console.log(`Posting tweet: ${tweetText}`);
      
      const tweet = await this.readWriteClient.v2.tweet(tweetText);
      
      console.log(`Tweet posted successfully: https://twitter.com/user/status/${tweet.data.id}`);
      return tweet;
    } catch (error) {
      console.error('Error posting tweet:', error);
      throw error;
    }
  }

  /**
   * Main function to handle new athlete approval
   * @param {Object} athleteData - Athlete data from Google Sheet
   * @param {string} action - 'approve' or 'verify'
   */
  async handleNewAthlete(athleteData, action = 'approve') {
    try {
      let tweetText;
      
      if (action === 'verify') {
        tweetText = this.generateVerificationTweet(athleteData);
      } else {
        tweetText = this.generateApprovalTweet(athleteData);
      }
      
      // Ensure tweet is within 280 characters
      if (tweetText.length > 280) {
        tweetText = tweetText.substring(0, 277) + '...';
      }
      
      const result = await this.postTweet(tweetText);
      return result;
    } catch (error) {
      console.error('Error handling new athlete:', error);
      throw error;
    }
  }

  /**
   * Post weekly leaderboard update
   * @param {Object} weeklyStats - Weekly statistics
   */
  async postWeeklyUpdate(weeklyStats) {
    try {
      const tweetText = this.generateWeeklyUpdateTweet(weeklyStats);
      const result = await this.postTweet(tweetText);
      return result;
    } catch (error) {
      console.error('Error posting weekly update:', error);
      throw error;
    }
  }
}

// Google Apps Script integration function
function postNewAthleteToTwitter(athleteData, action) {
  // This function would be called from Google Apps Script
  // when a new row is added to the Google Sheet
  
  const bot = new WDHC_TwitterBot();
  return bot.handleNewAthlete(athleteData, action);
}

// Example usage
if (require.main === module) {
  // Test with sample data
  const testAthlete = {
    name: 'John Doe',
    time: 125, // 2:05
    country: 'USA',
    gripAge: 3.5,
    tier: 'Elite'
  };
  
  const bot = new WDHC_TwitterBot();
  
  // Test approval tweet
  console.log('Approval Tweet:');
  console.log(bot.generateApprovalTweet(testAthlete));
  console.log('\n---\n');
  
  // Test verification tweet
  console.log('Verification Tweet:');
  console.log(bot.generateVerificationTweet(testAthlete));
  console.log('\n---\n');
  
  // Test weekly update
  const testStats = {
    newAthletes: 7,
    topTime: 183, // 3:03
    topAthlete: 'Jane Smith',
    totalAthletes: 42
  };
  
  console.log('Weekly Update Tweet:');
  console.log(bot.generateWeeklyUpdateTweet(testStats));
}

module.exports = {
  WDHC_TwitterBot,
  postNewAthleteToTwitter
};