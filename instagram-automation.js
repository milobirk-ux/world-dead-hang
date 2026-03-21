// WDHC Instagram Automation
// Browser automation for posting to Instagram
// Requires: OpenClaw browser tool with Instagram logged in

const fs = require('fs');
const path = require('path');

// Configuration
const DRAFTS_FILE = path.join(__dirname, 'instagram-drafts.json');
const LOG_FILE = path.join(__dirname, 'social-log.json');
const IMAGE_DIR = path.join(__dirname, 'media', 'instagram');

// Initialize files and directories
if (!fs.existsSync(DRAFTS_FILE)) {
  fs.writeFileSync(DRAFTS_FILE, JSON.stringify({
    drafts: [],
    lastPosted: null,
    account: '@worlddeadhang'
  }, null, 2));
}

if (!fs.existsSync(LOG_FILE)) {
  const log = JSON.parse(fs.readFileSync(path.join(__dirname, 'social-log.json'), 'utf8') || '{}');
  log.instagram = {
    posts: [],
    stats: {
      totalPosts: 0,
      lastPost: null,
      followers: 0
    }
  };
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

// Instagram posting function (to be called via browser automation)
async function postToInstagram(caption, imagePath) {
  console.log('Posting to Instagram:', caption.substring(0, 50) + '...');
  
  // This function would use OpenClaw browser automation
  // Steps:
  // 1. Navigate to Instagram create post
  // 2. Upload image/video
  // 3. Add caption
  // 4. Add location (optional)
  // 5. Add hashtags
  // 6. Share
  
  // For now, simulate and log
  const post = {
    id: 'instagram-' + Date.now(),
    caption: caption,
    image: imagePath,
    timestamp: new Date().toISOString(),
    status: 'draft' // 'draft', 'posted', 'failed'
  };
  
  // Save to drafts
  const drafts = JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf8'));
  drafts.drafts.push(post);
  drafts.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2));
  
  console.log('Instagram draft saved to:', DRAFTS_FILE);
  return post;
}

// Generate Instagram caption from athlete data
function generateInstagramCaption(athlete) {
  const { name, time, category, gripAge, location, videoUrl } = athlete;
  
  const captions = [
    `Welcome to the World Dead Hang Championship, ${name}! 🎉\n\n🏋️‍♂️ Time: ${time}\n📊 Category: ${category}\n💪 Grip Age: ${gripAge}\n📍 Location: ${location}\n\nSwipe up for the full leaderboard! 👆\n\n#DeadHang #WorldDeadHang #GripStrength #Fitness #StrengthTraining #${category.replace(/\s+/g, '')}`,
    
    `NEW ATHLETE SPOTLIGHT ✨\n\nMeet ${name} from ${location}!\n\nJust submitted a ${time} dead hang in the ${category} category with a grip age of ${gripAge}! 💪\n\nThink you can beat it? Submit your time at worlddeadhang.com\n\n#AthleteSpotlight #WDHC #DeadHangChallenge #FitnessCommunity #${category.replace(/\s+/g, '')}`,
    
    `OFFICIAL WDHC ENTRY 📝\n\nAthlete: ${name}\nTime: ${time}\nCategory: ${category}\nGrip Age: ${gripAge}\n\nEvery submission brings us closer to finding the world's best grip strength! 🏆\n\n#OfficialEntry #WorldDeadHang #GripTest #FitnessCompetition #${category.replace(/\s+/g, '')}`
  ];
  
  return captions[Math.floor(Math.random() * captions.length)];
}

// Generate verified athlete caption (gold checkmark)
function generateVerifiedCaption(athlete) {
  const { name, time, category, gripAge, location } = athlete;
  
  return `OFFICIALLY VERIFIED! 🏆\n\nCongratulations to ${name} for earning the gold verification badge!\n\n✅ Verified Time: ${time}\n✅ Category: ${category}\n✅ Grip Age: ${gripAge}\n✅ Location: ${location}\n\nOnly the best get verified! This athlete has been thoroughly reviewed and confirmed. 💪\n\n#Verified #WorldDeadHang #EliteAthlete #GripStrength #FitnessGoals #${category.replace(/\s+/g, '')}`;
}

// Process athlete approval (called from Google Apps Script webhook)
async function processAthleteApproval(athleteData, isVerified = false) {
  console.log('Processing Instagram post for:', athleteData.name);
  
  // Generate caption
  const caption = isVerified 
    ? generateVerifiedCaption(athleteData)
    : generateInstagramCaption(athleteData);
  
  // Generate or find image (in real implementation, create from video thumbnail)
  const imagePath = path.join(IMAGE_DIR, `${athleteData.name.replace(/\s+/g, '-')}-${Date.now()}.jpg`);
  
  // Create placeholder image (in real implementation, generate from video)
  fs.writeFileSync(imagePath, '');
  
  // Create draft post
  const draft = await postToInstagram(caption, imagePath);
  
  // Log action
  const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  if (!log.instagram) log.instagram = { posts: [], stats: { totalPosts: 0, lastPost: null, followers: 0 } };
  log.instagram.posts.push({
    ...draft,
    athlete: athleteData.name,
    action: isVerified ? 'verified' : 'approval'
  });
  log.instagram.stats.totalPosts = log.instagram.posts.length;
  log.instagram.stats.lastPost = new Date().toISOString();
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  
  console.log('Instagram draft created for:', athleteData.name);
  return draft;
}

// Get pending drafts
function getPendingDrafts() {
  const drafts = JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf8'));
  return drafts.drafts.filter(d => d.status === 'draft');
}

// Mark draft as posted
function markDraftPosted(draftId) {
  const drafts = JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf8'));
  const draft = drafts.drafts.find(d => d.id === draftId);
  if (draft) {
    draft.status = 'posted';
    draft.postedAt = new Date().toISOString();
    drafts.lastPosted = new Date().toISOString();
    fs.writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2));
    
    // Update log
    const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    if (log.instagram) {
      const logEntry = log.instagram.posts.find(p => p.id === draftId);
      if (logEntry) {
        logEntry.status = 'posted';
        logEntry.postedAt = new Date().toISOString();
        fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
      }
    }
  }
}

// Generate training tip post
async function postTrainingTip() {
  const tips = [
    {
      tip: "Master scapular engagement for longer hangs",
      explanation: "Pull shoulder blades down and back before hanging to activate more muscle fibers",
      imageIdea: "Scapular position diagram"
    },
    {
      tip: "Chalk is your best friend",
      explanation: "Increases grip friction by 30%+ and reduces sweat slippage",
      imageIdea: "Chalk application tutorial"
    },
    {
      tip: "Train forearm flexors daily",
      explanation: "Stronger forearms directly translate to longer dead hangs",
      imageIdea: "Forearm workout infographic"
    },
    {
      tip: "Proper breathing technique",
      explanation: "Deep belly breaths oxygenate muscles and delay fatigue",
      imageIdea: "Breathing pattern visualization"
    },
    {
      tip: "Optimal rest between attempts",
      explanation: "2-3 minutes allows full muscle recovery for maximum performance",
      imageIdea: "Rest timing chart"
    }
  ];
  
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  const caption = `💪 WDHC TRAINING TIP\n\n${randomTip.tip}\n\nWhy it works: ${randomTip.explanation}\n\nTry this technique and share your results in the comments! 👇\n\nTag @worlddeadhang for a feature!\n\n#TrainingTip #DeadHang #GripStrength #FitnessAdvice #WorkoutWednesday`;
  
  // Create placeholder image
  const imagePath = path.join(IMAGE_DIR, `training-tip-${Date.now()}.jpg`);
  fs.writeFileSync(imagePath, '');
  
  return await postToInstagram(caption, imagePath);
}

// Generate weekly stats post
async function postWeeklyStats(stats) {
  const { newAthletes, totalAthletes, topCategory, avgTime } = stats;
  
  const caption = `📊 WDHC WEEKLY STATS\n\n• ${newAthletes} new athletes this week\n• ${totalAthletes} total athletes on leaderboard\n• Top category: ${topCategory}\n• Average hang time: ${avgTime}\n\nThe competition is heating up! 🔥\n\nJoin the championship at worlddeadhang.com\n\n#WeeklyStats #WDHC #Leaderboard #FitnessData #CommunityGrowth`;
  
  // Create stats image (would be generated in real implementation)
  const imagePath = path.join(IMAGE_DIR, `weekly-stats-${Date.now()}.jpg`);
  fs.writeFileSync(imagePath, '');
  
  return await postToInstagram(caption, imagePath);
}

// Main function
async function main() {
  const action = process.argv[2];
  const data = process.argv[3] ? JSON.parse(process.argv[3]) : {};
  
  switch (action) {
    case 'approve-athlete':
      await processAthleteApproval(data, false);
      break;
      
    case 'verify-athlete':
      await processAthleteApproval(data, true);
      break;
      
    case 'training-tip':
      await postTrainingTip();
      break;
      
    case 'weekly-stats':
      await postWeeklyStats(data);
      break;
      
    case 'list-drafts':
      const drafts = getPendingDrafts();
      console.log('Pending Instagram drafts:');
      drafts.forEach((d, i) => {
        console.log(`${i + 1}. ${d.caption.substring(0, 60)}...`);
      });
      break;
      
    case 'post-draft':
      console.log('Posting draft:', data.id);
      markDraftPosted(data.id);
      break;
      
    default:
      console.log('Available commands:');
      console.log('  approve-athlete {name, time, category, gripAge, location, videoUrl}');
      console.log('  verify-athlete {name, time, category, gripAge, location}');
      console.log('  training-tip');
      console.log('  weekly-stats {newAthletes, totalAthletes, topCategory, avgTime}');
      console.log('  list-drafts');
      console.log('  post-draft {id}');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  postToInstagram,
  generateInstagramCaption,
  generateVerifiedCaption,
  processAthleteApproval,
  getPendingDrafts,
  markDraftPosted,
  postTrainingTip,
  postWeeklyStats
};