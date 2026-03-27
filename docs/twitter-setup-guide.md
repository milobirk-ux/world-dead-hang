# WDHC Twitter Automation Setup Guide

## Overview
Automatically post to Twitter/X when new athletes are approved or verified on the WDHC leaderboard. This increases visibility, engagement, and drives traffic to the championship.

## Two Implementation Options

### Option 1: Google Apps Script Integration (Recommended)
**Best for:** Automatic triggering from Google Sheet submissions
**Complexity:** Medium
**Setup Time:** 15-20 minutes

#### Steps:
1. **Create Twitter Developer Account**
   - Go to https://developer.twitter.com/
   - Apply for Essential access (free)
   - Create a new Project and App
   - Generate API keys:
     - API Key
     - API Secret
     - Access Token
     - Access Secret

2. **Add Script to Google Sheet**
   - Open WDHC Google Sheet
   - Extensions > Apps Script
   - Delete default code, paste `google-apps-script-twitter-integration.gs`
   - Run `setupScriptProperties()` once
   - Add your Twitter credentials as Script Properties

3. **Set Up Trigger**
   - In Apps Script editor: Triggers (clock icon)
   - Add trigger:
     - Function: `onFormSubmit`
     - Deployment: Head
     - Event: From spreadsheet, On form submit
   - Save and authorize

4. **Test**
   - Run `testTwitterIntegration()` to verify setup
   - Submit test form entry to Google Sheet
   - Check Twitter for automated post

### Option 2: Node.js Server (Advanced)
**Best for:** More control, additional features
**Complexity:** High
**Setup Time:** 30-45 minutes

#### Steps:
1. **Install Dependencies**
   ```bash
   npm install twitter-api-v2 dotenv
   ```

2. **Configure Environment**
   - Create `.env` file:
   ```
   TWITTER_API_KEY=your_key
   TWITTER_API_SECRET=your_secret
   TWITTER_ACCESS_TOKEN=your_token
   TWITTER_ACCESS_SECRET=your_access_secret
   ```

3. **Set Up Webhook**
   - Deploy `twitter-automation.js` to server
   - Create endpoint that Google Apps Script can call
   - Or set up cron job to check Google Sheet periodically

## Features Included

### 1. Automatic Approval Posts
- Posts when athlete status changes to "Approved"
- Includes name, time, country, grip age, tier
- Links to leaderboard

### 2. Gold Verification Posts
- Special tweet for verified athletes (gold checkmark)
- Highlights pro status

### 3. Weekly Updates
- Can be scheduled to post weekly statistics
- New athletes count, top times, total participants

### 4. Multiple Tweet Templates
- Randomly selects from 3+ templates
- Prevents repetitive content
- All include relevant hashtags

## Hashtags Used
- `#DeadHang`
- `#GripStrength`
- `#Calisthenics`
- `#WDHC`
- `#WorldDeadHang`

## Character Limits
- Tweets automatically truncated to 280 characters
- URLs shortened where possible
- Essential information prioritized

## Testing
1. **Dry Run:** Use `testTwitterIntegration()` in Apps Script
2. **Manual Test:** Submit test form with "Test" in name
3. **Live Test:** Approve real athlete, monitor Twitter

## Troubleshooting

### Common Issues:
1. **"Twitter API credentials not configured"**
   - Run `setupScriptProperties()` again
   - Verify all 4 credentials are set

2. **Trigger not firing**
   - Check trigger is set to "On form submit"
   - Ensure script is deployed as "Head"
   - Check execution logs for errors

3. **Tweet not posting**
   - Check character count (max 280)
   - Verify Twitter app has write permissions
   - Check API rate limits

4. **Duplicate posts**
   - Script only runs on status change to "Approved"
   - Add tweet URL tracking to prevent duplicates

## Maintenance

### Regular Checks:
- Monthly: Verify Twitter API credentials still valid
- Weekly: Check tweet formatting and engagement
- Daily: Monitor for failed posts in execution logs

### Updates:
- Add new tweet templates periodically
- Update hashtags based on trends
- Adjust posting frequency as volume increases

## Security Notes
- Never commit API keys to GitHub
- Use Script Properties for sensitive data
- Limit script permissions to necessary scope
- Regularly rotate access tokens

## Next Steps After Setup

1. **Monitor Engagement**
   - Track likes, retweets, profile visits
   - Use Twitter Analytics for insights

2. **Optimize Posting Times**
   - Experiment with different times
   - Focus on fitness community active hours

3. **Expand Features**
   - Add image generation (leaderboard screenshots)
   - Include video links for top hangs
   - Create Twitter threads for major announcements

4. **Cross-Promotion**
   - Share Twitter posts on Discord
   - Include in email newsletters
   - Reference in Reddit posts

## Support
For issues or questions:
- Check execution logs in Apps Script
- Review Twitter Developer Dashboard
- Test with `testTwitterIntegration()` function
- Contact: [Your contact info]

## Success Metrics
- **Immediate:** Automated posts for every approval
- **Short-term:** Increased Twitter followers (50+ per month)
- **Long-term:** Higher website traffic from Twitter referrals
- **Ultimate:** More athlete submissions via social exposure