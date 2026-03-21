# WDHC Social Media Strategy (Twitter/X)

## Account Details
- **Handle:** @WorldDeadHang (to be created)
- **Platform:** Twitter/X only (primary focus)
- **Goal:** Build community, attract athletes, increase submissions

## Content Pillars for WDHC

| Pillar | % | WDHC Examples | Post Frequency |
|--------|---|---------------|----------------|
| **Athlete Spotlights** | 40% | New approved athletes, verified athletes, record holders | Daily (1-2 posts) |
| **Training Tips** | 30% | Grip strength exercises, dead hang techniques, recovery | 3-4x per week |
| **Community Engagement** | 20% | Polls ("What's your PR?"), challenges, Q&A | 2-3x per week |
| **Behind-the-Scenes** | 10% | Website updates, growth stats, new features | 1-2x per week |

## Daily Posting Schedule
- **9:00 AM:** Athlete spotlight (new approved athlete)
- **12:00 PM:** Training tip or technique
- **3:00 PM:** Community poll or question
- **6:00 PM:** Behind-the-scenes or growth update

## Automated Content Triggers

### 1. New Athlete Approved
```
TRIGGER: Google Sheet status changes to "Approved"
ACTION: Post tweet:
"🎉 New athlete on the leaderboard! Welcome [Athlete Name] with a [Time] dead hang in the [Category] category! 
Grip age: [Grip Age] 
#DeadHang #WDHC #GripStrength"

LINK: https://worlddeadhang.com
```

### 2. New Athlete Verified (Gold Checkmark)
```
TRIGGER: Google Sheet status changes to "Verified"
ACTION: Post tweet:
"🏆 VERIFIED ATHLETE! [Athlete Name] is now officially verified with a [Time] dead hang! 
Gold checkmark earned ✅ 
#Verified #DeadHang #WDHC"

LINK: https://worlddeadhang.com/leaderboard-full.html
```

### 3. Weekly Stats Update (Sunday)
```
TRIGGER: Cron job every Sunday at 10 AM
ACTION: Post weekly stats:
"📊 WDHC Weekly Stats:
• [X] new athletes this week
• [Y] total athletes on leaderboard
• Top category: [Category]
• Average hang time: [Time]

Join the competition! #WDHC #Stats"

LINK: https://worlddeadhang.com/submit.html
```

## Hashtag Strategy

### Primary (Every Post)
- #DeadHang
- #WDHC (World Dead Hang Championship)
- #GripStrength

### Secondary (Rotate)
- #Calisthenics
- #BodyweightTraining
- #StrengthTraining
- #HangTime
- #GripAge

### Niche (Specific Posts)
- #WorldRecord (for record holders)
- #Verified (for verified athletes)
- #Leaderboard (for stats updates)

## Engagement Strategy

### Accounts to Follow/Engage With:
1. **Fitness influencers** (calisthenics, grip strength)
2. **CrossFit athletes**
3. **Climbing community**
4. **Strength training coaches**

### Engagement Actions:
1. **Reply** to relevant tweets about grip strength
2. **Retweet** impressive dead hang videos
3. **Quote tweet** with WDHC invitation
4. **Participate** in fitness Twitter threads

## Automation Setup

### Browser Automation Requirements:
1. Twitter/X account logged in Chrome
2. OpenClaw browser extension installed
3. Chrome remote debugging enabled

### Cron Schedule:
```
# Daily athlete spotlight
0 9 * * * /path/to/wdhc-tweet-athlete.sh

# Daily training tip  
0 12 * * * /path/to/wdhc-tweet-tip.sh

# Daily community engagement
0 15 * * * /path/to/wdhc-tweet-poll.sh

# Weekly stats (Sunday)
0 10 * * 0 /path/to/wdhc-tweet-stats.sh
```

## Content Templates

### Athlete Spotlight Template:
```
🎉 New athlete on the WDHC leaderboard!

Name: [Athlete Name]
Time: [Time]
Category: [Category]
Grip Age: [Grip Age]

Welcome to the championship! 💪

#DeadHang #WDHC #GripStrength
https://worlddeadhang.com
```

### Training Tip Template:
```
💪 WDHC Training Tip of the Day:

[Tip description - e.g., "Improve your dead hang by focusing on scapular retraction"]

Why it works: [Brief explanation]

Try it and share your results! #TrainingTip #DeadHang #WDHC
```

### Community Poll Template:
```
🗳️ WDHC Community Poll:

[Question - e.g., "What's your current dead hang PR?"]

A) Under 30 seconds
B) 30-60 seconds  
C) 1-2 minutes
D) Over 2 minutes

Reply with your answer! #Poll #DeadHang #WDHC
```

## Metrics to Track
1. **Followers gained** per week
2. **Engagement rate** (likes + replies / impressions)
3. **Click-through rate** to website
4. **Submission conversions** from Twitter
5. **Hashtag performance**

## Safety Rules
1. **Never post more than 5 tweets per day**
2. **Minimum 45 seconds between actions**
3. **No spam** - genuine engagement only
4. **Track everything** in social-log.json
5. **Manual review** of automated tweets weekly