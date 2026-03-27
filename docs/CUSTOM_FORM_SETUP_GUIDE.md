# WDHC Custom Form - Complete Setup Guide

## 📋 Overview
This guide walks through setting up the complete custom form submission system for WDHC, replacing the Tally form with our own professional form.

## 🎯 Benefits Over Tally Form
- **Free forever** - No subscription fees
- **Better UX** - Professional design, no iframe
- **More fields** - Height, Grip Training Experience
- **Full control** - Custom validation, branding, workflow

## 🚀 Step-by-Step Setup

### Step 1: Create New Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create new sheet: "WDHC Custom Form Submissions"
3. Set up these exact column headers (copy & paste):

```
Timestamp,Submission ID,Athlete Name,Email Address,Date of Birth,Gender,Bodyweight lbs,Height (inches),Grip Training Experience,Official Time,Video Proof URL,Additional Notes,Emailed,Is PR,Previous Best,PR Badge,City/State,Country,Attempt Date,How did you hear about us?,Consent
```

### Step 2: Deploy Form Handler Script
1. Open the new Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete any default code
4. Copy entire contents of `google-apps-script-form-handler.gs` and paste
5. Save the project (Ctrl+S)
6. Name it: "WDHC Form Handler"

### Step 3: Deploy as Web App
1. Click **Deploy → New deployment**
2. Type: **Web app**
3. Description: "WDHC Custom Form Handler"
4. Execute as: **Me** (your Google account)
5. Who has access: **Anyone**
6. Click **Deploy**
7. **COPY THE WEB APP URL** - This is your form endpoint

### Step 4: Update Form JavaScript
1. Open `submit-custom-draft.html`
2. Find line with `const WEB_APP_URL =`
3. Replace with your new web app URL:
```javascript
const WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

### Step 5: Test Form Submission
1. Open `submit-custom-draft.html` in browser
2. Fill out test submission
3. Submit and verify:
   - Success message appears
   - Data appears in Google Sheet
   - Email is sent (if email automation is set up)

### Step 6: Set Up Email Automation (Optional)
1. In same Apps Script project
2. Add `email-automation-v2.0.gs` code
3. Set up trigger: **On form submit → sendWelcomeEmailOnNewRow**

## 📊 Column Details

### Required Fields (from form):
- **Athlete Name** - Full name
- **Email Address** - Contact email
- **City/State** - City, State/Province
- **Country** - Selected from dropdown
- **Date of Birth** - For age calculation
- **Gender** - Male/Female/Prefer not to say
- **Bodyweight lbs** - Weight in pounds
- **Attempt Date** - When hang was performed
- **Official Time** - MM:SS format
- **Video Proof URL** - YouTube/Drive/Instagram/etc
- **How did you hear about us?** - Marketing tracking
- **Consent** - Agreement to terms

### Optional Fields:
- **Height (inches)** - For more accurate grip age
- **Grip Training Experience** - None/Beginner/Intermediate/Advanced
- **Additional Notes** - Any comments

### System Fields (auto-added):
- **Timestamp** - When submitted
- **Submission ID** - Unique ID (WDHC-XXXX)
- **Emailed** - "Yes"/"No" (email automation)
- **Is PR** - "Yes"/"No" (email automation)
- **Previous Best** - Previous best time (email automation)
- **PR Badge** - "🏆" if PR (email automation)

## 🔄 Leaderboard Sync Setup

### Option A: Update Existing Sync Script
1. Open `sync-leaderboard.js`
2. Update `SPREADSHEET_ID` to new sheet ID
3. Update column name mappings:
   - `'Total Dead Hang Time'` → `'Official Time'`
   - `'City, State / Country'` → `'City/State'` + `'Country'`
   - Add support for new fields

### Option B: Create New Sync Script (Recommended)
1. Copy `sync-leaderboard.js` to `sync-leaderboard-custom.js`
2. Update for custom form columns
3. Add grip age calculation using new fields
4. Update website to use new data file

## 🛠️ Troubleshooting

### Common Issues:

1. **"Script function not found"**
   - Ensure function name matches `doPost(e)`
   - Check for typos in function names

2. **Data not appearing in sheet**
   - Check web app URL in form
   - Verify column headers exactly match
   - Check Apps Script execution logs

3. **CORS errors**
   - Web app must be deployed with "Anyone" access
   - Add `doGet` function returning CORS headers

4. **Email not sending**
   - Check email automation trigger
   - Verify "Emailed" column exists
   - Check spam folder

## 📈 Next Steps After Setup

1. **Replace main submission page**
   - Update `submit.html` to use custom form
   - Keep Tally form as backup initially

2. **Update leaderboard display**
   - Show new fields (height, grip experience)
   - Improve grip age calculation accuracy

3. **Add analytics**
   - Track submission sources
   - Monitor conversion rates

4. **Automate social media**
   - Auto-post new submissions to Twitter/Discord
   - Celebrate new PRs automatically

## 🔗 Files Needed

1. `submit-custom-draft.html` - Custom form
2. `google-apps-script-form-handler.gs` - Form handler
3. `email-automation-v2.0.gs` - Email automation
4. `sync-leaderboard.js` - Leaderboard sync (needs updates)

## ⚠️ Important Notes

- **Backup old data** before switching
- **Test thoroughly** before going live
- **Keep Tally form active** during transition
- **Monitor first 24 hours** for issues
- **Update documentation** with new process

## 🆘 Support

If you encounter issues:
1. Check Apps Script execution logs
2. Verify column headers match exactly
3. Test with simple form data first
4. Contact developer for assistance

---

**Last Updated:** March 23, 2026  
**Status:** Ready for deployment  
**Complexity:** Medium (requires Google Sheets/Apps Script setup)