# WDHC Submissions Tracker Dashboard

A real-time dashboard for tracking World Dead Hang Championship athlete submissions with daily updates and interactive graphs.

## Features

### 📊 Real-time Statistics
- **Total Submissions**: Current count of all athlete submissions
- **Verified Submissions**: Athletes with gold checkmark verification
- **Average Time**: Mean hang time across all submissions
- **Countries**: Number of countries represented

### 📈 Interactive Charts
- **Submissions Over Time**: Line chart showing daily submission trends
- **Timeframe Controls**: Toggle between Week, Month, and All Time views
- **Auto-refresh**: Updates every 5 minutes automatically

### 📋 Recent Submissions Table
- Last 10 submissions with details
- Athlete name, time, tier, country, and status
- Color-coded tier badges

### 🔄 Daily Updates
- Automatic data refresh every 5 minutes
- Historical data preserved for trend analysis
- Configurable auto-refresh settings

## Files Included

1. **`submissions-tracker-dashboard.html`** - Main dashboard interface
2. **`submissions-tracker.js`** - JavaScript logic and data handling
3. **`daily-submissions-update.ps1`** - PowerShell script for daily updates
4. **`setup-daily-update-task.ps1`** - Windows Task Scheduler setup
5. **`run-update.bat`** - Manual test script

## Quick Start

### Option 1: Manual Testing
1. Open `submissions-tracker-dashboard.html` in a web browser
2. The dashboard will load with mock data automatically
3. Use the timeframe buttons (Week/Month/All) to change views
4. Click "Refresh" to reload data

### Option 2: Automated Daily Updates (Recommended)

#### Step 1: Run Setup Script (Administrator Required)
```powershell
# Run PowerShell as Administrator
cd "C:\Users\milob\.openclaw\workspace\WDHC"
.\setup-daily-update-task.ps1
```

This will:
- Create a Windows Scheduled Task named "WDHC Daily Submissions Update"
- Schedule it to run daily at 6:00 AM
- Create manual run shortcuts
- Generate test batch files

#### Step 2: Test the Update
```powershell
# Run the update manually to test
.\run-update.bat
```

Check the log file: `submissions-update.log`

#### Step 3: Verify Dashboard Updates
Open `submissions-tracker-dashboard.html` and verify:
- "Last updated" timestamp shows current time
- Statistics are updated with fresh data
- Charts reflect latest submission trends

## Configuration

### Changing Update Schedule
1. Open **Task Scheduler** (search in Start menu)
2. Navigate to **Task Scheduler Library**
3. Find **"WDHC Daily Submissions Update"**
4. Right-click → **Properties** → **Triggers**
5. Modify the schedule as needed

### Customizing Data Source
The dashboard currently uses mock data. To connect to real Google Sheets data:

1. **Enable Google Sheets API**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google Sheets API
   - Create API credentials

2. **Update Configuration** in `submissions-tracker.js`:
```javascript
const CONFIG = {
    googleSheetId: 'YOUR_SHEET_ID_HERE',  // From Google Sheets URL
    sheetName: 'Form Responses 1',
    apiKey: 'YOUR_API_KEY_HERE',
    // ... rest of config
};
```

3. **Modify Data Fetching**:
   - Replace `generateRealisticData()` function with actual API calls
   - Implement proper error handling for API failures
   - Add authentication if using private sheets

## Dashboard Features in Detail

### Statistics Panel
- **Real-time Updates**: Stats update automatically every 5 minutes
- **Daily Changes**: Shows "+X today" for daily growth
- **Color Coding**: Green for positive changes, red for negative

### Interactive Chart
- **Zoom & Pan**: Click and drag to zoom, double-click to reset
- **Tooltips**: Hover over data points for detailed information
- **Multiple Datasets**: Shows both total and verified submissions
- **Smooth Curves**: Bezier curves for better visualization

### Data Table
- **Sortable**: Click column headers to sort (future enhancement)
- **Filterable**: Search/filter functionality (future enhancement)
- **Exportable**: Export to CSV/Excel (future enhancement)

### Auto-refresh System
- **Configurable Interval**: Default 5 minutes, adjustable in code
- **Smart Caching**: Local storage cache to reduce API calls
- **Error Handling**: Graceful degradation if updates fail
- **Visual Feedback**: Loading indicators and success/error messages

## Deployment Options

### Local Hosting
Simply open `submissions-tracker-dashboard.html` in any modern web browser.

### Cloudflare Pages Deployment
```bash
# Deploy the entire WDHC folder
npx wrangler pages deploy . --project-name=world-dead-hang
```

The dashboard will be available at: `https://[your-project].pages.dev/submissions-tracker-dashboard.html`

### Custom Subdomain
For a cleaner URL, deploy to a subdomain:
- `https://analytics.worlddeadhang.com`
- `https://stats.worlddeadhang.com`

## Troubleshooting

### Dashboard Not Loading
1. Check browser console for errors (F12 → Console)
2. Verify Chart.js is loading (CDN might be blocked)
3. Check if JavaScript is enabled in browser

### Scheduled Task Not Running
1. Open **Task Scheduler** and check task status
2. Verify task is enabled (not disabled)
3. Check last run result in task history
4. Run manually with `.\run-update.bat` to test

### No Data Displayed
1. Check `submissions-update.log` for errors
2. Verify PowerShell execution policy allows scripts
3. Check if workspace path is correct in scripts

### Performance Issues
1. Reduce auto-refresh interval (default 5 minutes)
2. Increase cache expiration time (default 30 minutes)
3. Optimize chart rendering with fewer data points

## Future Enhancements

### Planned Features
1. **Real Google Sheets Integration** - Connect to actual WDHC data
2. **Email Reports** - Daily/weekly summary emails
3. **Advanced Analytics** - Growth rate, projections, insights
4. **Export Functionality** - CSV, PDF, image exports
5. **Mobile App** - Native iOS/Android app version
6. **API Endpoints** - REST API for third-party integration
7. **Alert System** - Notifications for milestones or anomalies

### Integration Opportunities
- **Twitter Automation**: Post milestone achievements automatically
- **Discord Webhooks**: Send updates to community Discord
- **Google Analytics**: Track dashboard usage and engagement
- **Email Marketing**: Add subscribers to mailing list

## Support

For issues or questions:
1. Check the log file: `submissions-update.log`
2. Review browser console errors
3. Test with manual update: `.\run-update.bat`
4. Contact system administrator for Windows Task Scheduler issues

## License

This dashboard is part of the World Dead Hang Championship project. For internal use only.