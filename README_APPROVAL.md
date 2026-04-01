# WDHC Approval System

## Overview
This system provides a way to approve athlete submissions for the WDHC leaderboard with two tiers:
1. Regular approval (check mark) - athlete appears on leaderboard
2. Verified approval (double check mark) - athlete appears on leaderboard with a verification badge

## Files
- `direct_leaderboard_sync.js` - Main script for approving athletes and syncing leaderboard
- `leaderboard-data.js` - Generated file containing approved athletes for the leaderboard display

## Usage
To approve an athlete, run from the WDHC directory:
```
node direct_leaderboard_sync.js "<Athlete Name>" [verified]
```

Where:
- `<Athlete Name>` - Exact name as it appears in the submissions sheet
- `[verified]` - Optional. Set to `true` for verified approval, `false` or omitted for regular approval

### Examples
```bash
# Regular approval
node direct_leaderboard_sync.js "Milo Birk"

# Verified approval
node direct_leaderboard_sync.js "Milo Birk" true
```

## How It Works
1. The script authenticates with Google Sheets using the service account credentials
2. It finds the athlete by name in the "Custom Form Submissions" sheet
3. It sets the "Approved" column to "Yes" for that athlete
4. If verified=true, it also sets the "Verified" column to "Yes"
5. It writes the updated data back to the sheet
6. It then triggers a leaderboard sync that:
   - Reads only rows where "Approved" is "Yes"
   - Processes the data to find each athlete's personal record
   - Writes the leaderboard data to `leaderboard-data.js`

## Leaderboard Data Format
The generated `leaderboard-data.js` file contains:
```javascript
const athletes = [
  {
    "id": 1,
    "name": "Athlete Name",
    "category": "Male/Female",
    "background": "Background info",
    "location": "City/State",
    "currentPR": "MM:SS or M.SS",
    "prCount": 5,
    "lastAttempt": "YYYY-MM-DD",
    "video": "URL or #",
    "verified": true/false,
    "history": [
      { "date": "YYYY-MM-DD", "time": "MM:SS" },
      // ... more attempts
    ]
  }
  // ... more athletes
];
```

## Notes
- The script requires the `googleapis` npm package (already installed)
- Service account credentials must be in `./credentials/google-service-account.json`
- The leaderboard display reads from `leaderboard-data.js` to show approved athletes
- Verified athletes will show a check mark badge in the UI (implementation dependent)