# WDHC Athlete Portal

Complete athlete portal system with magic link authentication, dashboard, and training features.

## Architecture

### Backend (Google Apps Script)
- **Magic Link Authentication**: Email-based login system
- **Google Sheets Database**: Athlete profiles, PRs, training logs
- **REST API**: JSON endpoints for frontend

### Frontend (Cloudflare Pages)
- **HTML/CSS/JS**: Modern responsive dashboard
- **Authentication Flow**: Magic link handling
- **Dashboard**: PR history, rank, grip age, profile editing
- **Training Logs**: Track workouts and progress

### Phase 2 Features
- **Progress Charts**: Visual analytics
- **Social Features**: Follow athletes, share PRs
- **Training Plans**: Custom workout programs
- **Notifications**: Email/SMS alerts

## Deployment

1. **Google Apps Script**: Deploy as web app
2. **Cloudflare Pages**: Deploy frontend
3. **Google Sheets**: Set up database structure
4. **Email Service**: Configure for magic links

## File Structure

```
WDHC/athlete-portal/
├── backend/
│   ├── google-apps-script/
│   │   ├── auth.gs          # Magic link authentication
│   │   ├── api.gs           # REST API endpoints
│   │   ├── database.gs      # Google Sheets operations
│   │   └── email.gs         # Email sending
│   └── sheets/
│       ├── setup.js         # Database initialization
│       └── schema.md        # Database schema
├── frontend/
│   ├── index.html          # Landing page
│   ├── auth.html           # Login/register
│   ├── dashboard.html      # Main athlete dashboard
│   ├── profile.html        # Profile editing
│   ├── training.html       # Training logs
│   ├── css/
│   │   └── styles.css      # Main styles
│   ├── js/
│   │   ├── auth.js         # Authentication logic
│   │   ├── api.js          # API client
│   │   ├── dashboard.js    # Dashboard functionality
│   │   └── charts.js       # Progress charts
│   └── assets/             # Images, icons
└── deployment/
    ├── cloudflare-pages/   # Pages config
    └── google-script/      # Script deployment
```