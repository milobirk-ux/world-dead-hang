// WDHC Twitter Automation Script
// Uses OpenClaw browser automation to post tweets
// Run via: node twitter-automation.js [action] [data]

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SOCIAL_LOG_PATH = path.join(__dirname, 'social-log.json');
const TWEET_DRAFTS_PATH = path.join(__dirname, 'tweet-drafts.json');

// Initialize log file
if (!fs.existsSync(SOCIAL_LOG_PATH)) {
  fs.writeFileSync(SOCIAL_LOG_PATH, JSON.stringify({
    account: '@WorldDeadHang',
    platform: 'twitter',
    posts: [],
    stats: {
      totalPosts: 0,
      lastPost: null,
      followers: 0
    }
  }, null, 2));
}

// Initialize drafts file
if (!fs.existsSync(TWEET_DRAFTS_PATH)) {
  fs.writeFileSync(TWEET_DRAFTS_PATH, JSON.stringify({
    drafts: [],
    lastUpdated: new Date().toISOString()
  }, null, 2));
}

function logTweet(tweet) {
  const log = JSON.parse(fs.readFileSync(SOCIAL_LOG_PATH, 'utf8'));
  log.posts.push({
    ...tweet,
    timestamp: new Date().toISOString()
  });
  log.stats.totalPosts = log.posts.length;
  log.stats.lastPost = new Date().toISOString();
  fs.writeFileSync(SOCIAL_LOG_PATH, JSON.stringify(log, null, 2));
  console.log(`Tweet logged: ${tweet.text.substring(0, 50)}...`);
}

function addDraft(tweet) {
  const drafts = JSON.parse(fs.readFileSync(TWEET_DRAFTS_PATH, 'utf8'));
  drafts.drafts.push({
    ...tweet,
    created: new Date().toISOString(),
    posted: false
  });
  drafts.lastUpdated = new Date().toISOString();
  fs.writeFileSync(TWEET_DRAFTS_PATH, JSON.stringify(drafts, null, 2));
  console.log(`Draft added: ${tweet.text.substring(0, 50)}...`);
}

function getPendingDrafts() {
  const drafts = JSON.parse(fs.readFileSync(TWEET_DRAFTS_PATH, 'utf8'));
  return drafts.drafts.filter(d => !d.posted);
}

function markDraftPosted(id) {
  const drafts = JSON.parse(fs.readFileSync(TWEET_DRAFTS_PATH, 'utf8'));
  const draft = drafts.drafts.find(d => d.id === id);
  if (draft) {
    draft.posted = true;
    draft.postedAt = new Date().toISOString();
    drafts.lastUpdated = new Date().toISOString();
    fs.writeFileSync(TWEET_DRAFTS_PATH, JSON.stringify(drafts, null, 2));
  }
}

// Tweet templates
const TEMPLATES = {
  NEW_ATHLETE: (name, time, category, gripAge) => 
    `🎉 New athlete on the WDHC leaderboard!\n\nName: ${name}\nTime: ${time}\nCategory: ${category}\nGrip Age: ${gripAge}\n\nWelcome to the championship! 💪\n\n#DeadHang #WDHC #GripStrength\nhttps://worlddeadhang.com`,

  VERIFIED_ATHLETE: (name, time) =>
    `🏆 VERIFIED ATHLETE! ${name} is now officially verified with a ${time} dead hang!\n\nGold checkmark earned ✅\n\n#Verified #DeadHang #WDHC\nhttps://worlddeadhang.com/leaderboard-full.html`,

  TRAINING_TIP: (tip, explanation) =>
    `💪 WDHC Training Tip of the Day:\n\n${tip}\n\nWhy it works: ${explanation}\n\nTry it and share your results! #TrainingTip #DeadHang #WDHC`,

  COMMUNITY_POLL: (question, options) => {
    const optionsText = options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n');
    return `🗳️ WDHC Community Poll:\n\n${question}\n\n${optionsText}\n\nReply with your answer! #Poll #DeadHang #WDHC`;
  },

  WEEKLY_STATS: (newAthletes, totalAthletes, topCategory, avgTime) =>
    `📊 WDHC Weekly Stats:\n\n• ${newAthletes} new athletes this week\n• ${totalAthletes} total athletes on leaderboard\n• Top category: ${topCategory}\n• Average hang time: ${avgTime}\n\nJoin the competition! #WDHC #Stats\nhttps://worlddeadhang.com/submit.html`
};

// Main function
async function main() {
  const action = process.argv[2];
  const data = process.argv[3] ? JSON.parse(process.argv[3]) : {};

  switch (action) {
    case 'new-athlete':
      const tweet1 = {
        id: `athlete-${Date.now()}`,
        text: TEMPLATES.NEW_ATHLETE(data.name, data.time, data.category, data.gripAge),
        type: 'athlete_spotlight',
        topic: 'new_athlete'
      };
      addDraft(tweet1);
      console.log('Draft created for new athlete');
      break;

    case 'verified-athlete':
      const tweet2 = {
        id: `verified-${Date.now()}`,
        text: TEMPLATES.VERIFIED_ATHLETE(data.name, data.time),
        type: 'verified_athlete',
        topic: 'verified'
      };
      addDraft(tweet2);
      console.log('Draft created for verified athlete');
      break;

    case 'training-tip':
      const tweet3 = {
        id: `tip-${Date.now()}`,
        text: TEMPLATES.TRAINING_TIP(data.tip, data.explanation),
        type: 'training_tip',
        topic: 'training'
      };
      addDraft(tweet3);
      console.log('Draft created for training tip');
      break;

    case 'weekly-stats':
      const tweet4 = {
        id: `stats-${Date.now()}`,
        text: TEMPLATES.WEEKLY_STATS(data.newAthletes, data.totalAthletes, data.topCategory, data.avgTime),
        type: 'weekly_stats',
        topic: 'stats'
      };
      addDraft(tweet4);
      console.log('Draft created for weekly stats');
      break;

    case 'list-drafts':
      const drafts = getPendingDrafts();
      console.log('Pending drafts:');
      drafts.forEach((d, i) => {
        console.log(`${i + 1}. [${d.type}] ${d.text.substring(0, 60)}...`);
      });
      break;

    case 'post-draft':
      // This would integrate with OpenClaw browser automation
      // For now, just mark as posted
      markDraftPosted(data.id);
      console.log(`Draft ${data.id} marked as posted`);
      break;

    case 'generate-tip':
      // Generate random training tip
      const tips = [
        {
          tip: "Focus on scapular retraction before starting your hang",
          explanation: "This engages your back muscles properly and prevents shoulder impingement"
        },
        {
          tip: "Use chalk for better grip",
          explanation: "Reduces sweat and increases friction for longer hangs"
        },
        {
          tip: "Train your forearm flexors with wrist curls",
          explanation: "Stronger forearms directly translate to longer dead hangs"
        },
        {
          tip: "Practice active hangs (pulling up slightly)",
          explanation: "Builds strength throughout the entire range of motion"
        },
        {
          tip: "Rest 2-3 minutes between attempts",
          explanation: "Allows forearm muscles to fully recover for maximum performance"
        }
      ];
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      const tweet5 = {
        id: `tip-auto-${Date.now()}`,
        text: TEMPLATES.TRAINING_TIP(randomTip.tip, randomTip.explanation),
        type: 'training_tip',
        topic: 'training'
      };
      addDraft(tweet5);
      console.log('Auto-generated training tip draft created');
      break;

    default:
      console.log('Available commands:');
      console.log('  new-athlete {name, time, category, gripAge}');
      console.log('  verified-athlete {name, time}');
      console.log('  training-tip {tip, explanation}');
      console.log('  weekly-stats {newAthletes, totalAthletes, topCategory, avgTime}');
      console.log('  list-drafts');
      console.log('  post-draft {id}');
      console.log('  generate-tip');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  TEMPLATES,
  logTweet,
  addDraft,
  getPendingDrafts,
  markDraftPosted
};