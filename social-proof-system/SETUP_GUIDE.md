# 🚀 WDHC Social Proof System - Setup Guide

Complete setup instructions to deploy the automated social proof system.

## 📋 Prerequisites

### 1. **Google Workspace Access**
- ✅ Google Sheets with WDHC database
- ✅ Google Apps Script enabled
- ✅ Google Cloud Project (for service account)

### 2. **Twitter/X Developer Account**
- ✅ Twitter Developer Portal access
- ✅ App created with Read/Write permissions
- ✅ API keys generated

### 3. **Optional: Canva Pro Account**
- For professional graphic generation
- Alternative: HTML2Canvas (local, free)

## 🔧 Step-by-Step Setup

### Step 1: Configure Google Sheets

1. **Open your WDHC database spreadsheet**
   - URL: `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`

2. **Add tracking columns** (if not present):
   - Column R: "Social Posted" (mark as "Yes" when posted)
   - Column S: "Social Post ID" (store Twitter post ID)
   - Column T: "Social Post Date" (timestamp)

3. **Create log sheet**:
   - Name: "Social Proof Log"
   - Columns: Timestamp, Found, Processed, Status, Notes

### Step 2: Set Up Google Cloud Project

1. **Create a new project** in Google Cloud Console:
   ```
   https://console.cloud.google.com/projectcreate
   ```

2. **Enable APIs**:
   - Google Sheets API
   - Google Drive API

3. **Create Service Account**:
   - IAM & Admin → Service Accounts → Create
   - Name: `wdhc-social-automation`
   - Role: `Editor`
   - Create key → JSON → Download

4. **Share spreadsheet with service account**:
   - Open spreadsheet → Share
   - Add service account email: `wdhc-social-automation@your-project.iam.gserviceaccount.com`
   - Permission: `Editor`

### Step 3: Configure Twitter/X API

1. **Apply for Twitter Developer Access**:
   ```
   https://developer.twitter.com/en/portal/petition/essential/basic-info
   ```

2. **Create a new App**:
   - App name: `WDHC Social Automation`
   - Use case: "Automating celebration posts for athlete submissions"
   - Permissions: Read & Write, Direct Message (optional)

3. **Generate API keys**:
   - API Key and Secret
   - Access Token and Secret
   - Bearer Token

4. **Enable OAuth 1.0a** for posting permissions

### Step 4: Deploy to Google Apps Script

1. **Create new Google Apps Script project**:
   ```
   https://script.google.com/home
   ```

2. **Copy files**:
   - `scripts/monitor_new_submissions.js` → Main code.gs
   - Create `config.js` from template (fill in your values)
   - Create `graphics.js` for graphic generation

3. **Add triggers**:
   - Time-driven trigger: Every 2 hours
   - Installable trigger: On spreadsheet change (optional)

4. **Test deployment**:
   - Run `testSocialProofSystem()`
   - Check execution logs

### Step 5: Configure Graphic Generation

**Option A: Canva API (Recommended)**
1. Sign up for Canva Developers: `https://www.canva.com/developers/`
2. Create template with dynamic fields
3. Get API key and template ID

**Option B: HTML2Canvas (Local)**
1. No API needed
2. Install html2canvas library in Apps Script
3. Configure local rendering settings

### Step 6: Set Up Monitoring

1. **Configure alerts** (choose one):
   - Email: Your email for error notifications
   - Slack: Webhook URL for team notifications
   - Discord: Webhook for real-time updates

2. **Set up dashboard**:
   - Google Data Studio for metrics
   - Custom dashboard in spreadsheet

## ⚙️ Configuration File

Create `config.js` in your Apps Script project:

```javascript
const CONFIG = {
  GOOGLE_SHEETS: {
    SPREADSHEET_ID: 'your-spreadsheet-id-here',
    SERVICE_ACCOUNT: {
      client_email: 'service-account@project.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
    }
  },
  TWITTER: {
    API_KEY: 'your-api-key',
    API_SECRET: 'your-api-secret',
    ACCESS_TOKEN: 'your-access-token',
    ACCESS_SECRET: 'your-access-secret'
  }
  // ... other settings
};
```

## 🧪 Testing

### Phase 1: Dry Run
```javascript
// Enable test mode
CONFIG.DEVELOPMENT.TEST_MODE = true;
CONFIG.DEVELOPMENT.DRY_RUN = true;

// Run monitor
monitorNewSubmissions();
```

### Phase 2: Single Test Post
```javascript
// Create test submission
const testData = {
  name: "Test Athlete",
  time: "4:26",
  tier: "LEGEND"
};

// Generate and post
const content = generateSocialContent(testData);
const result = postToTwitter(content);
```

### Phase 3: Full Automation
1. Disable test mode
2. Set real posting schedule
3. Monitor for 24 hours
4. Review logs and metrics

## 📊 Monitoring & Maintenance

### Daily Checks:
1. **Execution Logs** in Apps Script
2. **Twitter Post History**
3. **Spreadsheet Updates**
4. **Error Notifications**

### Weekly Reports:
1. **Submission Growth** (before/after)
2. **Engagement Metrics** (likes, retweets, clicks)
3. **System Uptime**
4. **ROI Calculation**

### Monthly Optimization:
1. **Content Performance** analysis
2. **Posting Schedule** adjustment
3. **Hashtag Effectiveness**
4. **Graphic Design** updates

## 🚨 Troubleshooting

### Common Issues:

1. **"Sheet not found"**
   - Check spreadsheet ID
   - Verify sharing permissions
   - Confirm sheet name matches

2. **Twitter API errors**
   - Check token expiration (90 days)
   - Verify app permissions
   - Check rate limits

3. **Graphic generation fails**
   - Canva: Check API quota
   - HTML2Canvas: Check memory limits
   - Storage: Check bucket permissions

4. **No new submissions detected**
   - Verify column indices
   - Check "Social Posted" column format
   - Test with manual submission

### Debug Mode:
```javascript
// Enable detailed logging
CONFIG.DEVELOPMENT.DEBUG.log_raw_data = true;
CONFIG.DEVELOPMENT.DEBUG.log_api_calls = true;

// Run and check logs
monitorNewSubmissions();
```

## 🔄 Updates & Upgrades

### Version Updates:
1. Check `CHANGELOG.md` for new features
2. Backup current configuration
3. Test in development environment
4. Deploy during low-traffic hours

### Adding New Platforms:
1. Add platform to `CONFIG.PLATFORMS`
2. Implement `postTo[Platform]()` function
3. Update tracking columns
4. Test integration

## 📈 Success Metrics

Track these KPIs:

1. **Submission Growth Rate** (target: +30% in 30 days)
2. **Social Engagement Rate** (likes/comments per post)
3. **Website Referral Traffic** from social
4. **Athlete Sharing Rate** (retweets/shares)
5. **System Reliability** (uptime percentage)

## 🆘 Support

### Immediate Issues:
- Check execution logs in Apps Script
- Review error notifications
- Test with dry run mode

### Need Help?
1. Review this setup guide
2. Check example configurations
3. Contact: [Your support channel]

---

**Deployment Checklist:**
- [ ] Google Sheets configured
- [ ] Twitter API access granted
- [ ] Google Apps Script deployed
- [ ] Test mode successful
- [ ] Dry run completed
- [ ] Monitoring set up
- [ ] Team notified
- [ ] Go live!

**Last Updated:** 2026-03-26  
**Version:** 1.0  
**Author:** Otis (Night Shift Autopilot)