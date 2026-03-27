# WDHC Athlete Portal - Deployment Guide

Complete deployment guide for the WDHC Athlete Portal with Google Apps Script backend and Cloudflare Pages frontend.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │  Google Apps     │    │   Google Sheets │
│     Pages       │◄──►│     Script       │◄──►│    Database     │
│   (Frontend)    │    │    (Backend)     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                              Email
                           (Magic Links)
```

## Phase 1: Backend Setup (Google Apps Script)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: `WDHC Athlete Portal`
3. Enable the following APIs:
   - Google Sheets API
   - Gmail API
   - Google Drive API

### Step 2: Set Up OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Configure consent screen:
   - Application type: Web application
   - Name: WDHC Athlete Portal
   - Authorized domains: `worlddeadhang.com`
   - Scopes: Add `https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/gmail.send`
4. Create OAuth 2.0 credentials
5. Note your:
   - Client ID
   - Client Secret
   - Add redirect URI: `https://script.google.com/macros/usercallback`

### Step 3: Create Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com/)
2. Create new project: `WDHC Athlete Portal Backend`
3. Copy files from `backend/google-apps-script/`:
   - `auth.gs` - Authentication system
   - `api.gs` - API endpoints
   - `database.gs` - Database operations
   - `email.gs` - Email templates
4. Update configuration in `auth.gs`:
   ```javascript
   const CONFIG = {
     SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
     SENDER_EMAIL: 'noreply@worlddeadhang.com',
     FRONTEND_URL: 'https://athletes.worlddeadhang.com',
     JWT_SECRET: 'YOUR_SECRET_KEY'
   };
   ```

### Step 4: Set Up Google Sheets Database

1. Run the setup script:
   ```bash
   cd backend/sheets
   npm install
   GOOGLE_CLIENT_ID=your_id GOOGLE_CLIENT_SECRET=your_secret GOOGLE_REFRESH_TOKEN=your_token node setup.js
   ```
2. Save the generated spreadsheet ID
3. Update Google Apps Script with the spreadsheet ID

### Step 5: Deploy Google Apps Script

1. In Apps Script editor, click **Deploy** → **New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Click **Deploy**
6. Copy the web app URL

## Phase 2: Frontend Setup (Cloudflare Pages)

### Step 1: Prepare Frontend Files

1. Update API configuration in `frontend/js/api.js`:
   ```javascript
   const API_CONFIG = {
     BASE_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL',
   };
   ```

2. Update frontend URLs in all HTML files:
   - Change `https://athletes.worlddeadhang.com` to your domain
   - Update email addresses and contact info

### Step 2: Deploy to Cloudflare Pages

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Create new project
3. Connect your Git repository (GitHub/GitLab)
4. Configure build settings:
   - Build command: (none - static site)
   - Build output directory: `frontend`
   - Root directory: `WDHC/athlete-portal`
5. Add environment variables:
   - `NODE_ENV`: `production`
6. Deploy

### Step 3: Configure Custom Domain

1. In Cloudflare Pages, go to **Custom domains**
2. Add your domain: `athletes.worlddeadhang.com`
3. Update DNS records as instructed

## Phase 3: Email Configuration

### Step 1: Set Up Email Sending

1. In Google Apps Script, enable Gmail API:
   - Resources → Advanced Google Services
   - Enable Gmail API v1
   - Click link to Google Cloud Console
   - Enable Gmail API

2. Configure email templates in `email.gs`:
   - Update sender name and email
   - Customize email content
   - Test email sending

### Step 2: Verify Email Domain (Optional)

For better deliverability:
1. Set up SPF record for your domain
2. Configure DKIM
3. Set up DMARC policy

## Phase 4: Security Configuration

### Step 1: API Security

1. Generate secure JWT secret:
   ```bash
   openssl rand -base64 32
   ```

2. Update Google Apps Script with the secret

3. Configure CORS in Cloudflare Worker:
   - Update `_worker.js` with your allowed origins

### Step 2: Rate Limiting

1. In Cloudflare, enable rate limiting:
   - Rules → Rate limiting rules
   - Create rule for API endpoints
   - Set appropriate limits

### Step 3: Content Security Policy

1. Review and update CSP in `_headers.json`
2. Test CSP with your actual domains

## Phase 5: Testing

### Step 1: Functional Testing

1. Test authentication flow:
   - Request magic link
   - Click link in email
   - Access dashboard

2. Test core features:
   - Add PR
   - Log training
   - View leaderboard
   - Update profile

### Step 2: Performance Testing

1. Test page load times
2. Test API response times
3. Optimize images and assets

### Step 3: Security Testing

1. Test for common vulnerabilities
2. Verify HTTPS enforcement
3. Test input validation

## Phase 6: Monitoring & Maintenance

### Step 1: Set Up Monitoring

1. Google Apps Script:
   - View → Execution log
   - Set up error notifications

2. Cloudflare Analytics:
   - Monitor traffic
   - Set up alerts

3. Uptime monitoring:
   - Use uptimerobot.com or similar
   - Monitor API endpoints

### Step 2: Backup Strategy

1. Google Sheets backup:
   - Regular exports
   - Version history

2. Code backup:
   - Git repository
   - Regular commits

### Step 3: Update Procedure

1. Frontend updates:
   - Push to Git
   - Cloudflare Pages auto-deploys

2. Backend updates:
   - Update Google Apps Script
   - Test thoroughly
   - Create new deployment

## Troubleshooting

### Common Issues

1. **CORS errors**: Check Cloudflare Worker CORS configuration
2. **Email not sending**: Verify Gmail API is enabled and configured
3. **Spreadsheet access errors**: Check OAuth scopes and permissions
4. **Slow performance**: Check Google Apps Script quotas

### Debugging Tools

1. Google Apps Script:
   - View → Logs
   - Debugger

2. Browser Developer Tools:
   - Network tab
   - Console

3. Cloudflare:
   - Analytics
   - Logs

## Cost Estimation

### Free Tier (Up to 100 athletes)
- Google Apps Script: Free (within quotas)
- Google Sheets: Free
- Cloudflare Pages: Free
- Email: Free (Gmail quotas)

### Scaling Up (100+ athletes)
- Google Cloud: $10-50/month
- Cloudflare: $20/month (Pro plan)
- Email service: $10-50/month

## Support

For issues and questions:
1. Check execution logs in Google Apps Script
2. Review Cloudflare Analytics
3. Contact: support@worlddeadhang.com

## Changelog

### v1.0.0 - Initial Release
- Magic link authentication
- Athlete dashboard
- PR tracking
- Training logs
- Leaderboards
- Profile management

### Future Enhancements
- Mobile app
- Social features
- Training programs
- Advanced analytics
- API for third-party apps