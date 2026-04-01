const { google } = require('googleapis');
const path = require('path');

// Path to the service account key file (same as used for Sheets)
const KEYFILE_PATH = path.join('/home/milobirk/.hermes/workspace/WDHC/credentials', 'google-service-account.json');

// Define the scopes for Google Calendar API
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Create a JWT client for authentication
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILE_PATH,
  scopes: SCOPES,
});

// Build the calendar service
const calendar = google.calendar({ version: 'v3', auth });

// Define the event details for Thursday, April 2, 2026 from 1:00 PM to 5:00 PM
// Note: Year 2026, April 2 is a Thursday
const startTime = new Date('2026-04-02T13:00:00'); // 1:00 PM local time
const endTime = new Date('2026-04-02T17:00:00');   // 5:00 PM local time

// We need to specify the timezone. Let's use America/New_York as per user's profile.
const event = {
  summary: 'Charlie',
  description: 'Event scheduled via Hermes agent',
  start: {
    dateTime: startTime.toISOString(),
    timeZone: 'America/New_York',
  },
  end: {
    dateTime: endTime.toISOString(),
    timeZone: 'America/New_York',
  },
};

// Insert the event into the primary calendar
calendar.events.insert(
  {
    calendarId: 'primary',
    resource: event,
  },
  (err, event) => {
    if (err) {
      console.error('Error creating calendar event:', err);
      // If it's an authentication error, we might need to share the calendar with the service account email
      if (err.code === 403 || err.code === 401) {
        console.error('Authentication or permission error. Please ensure:');
        console.error('1. The service account email has been added to your Google Calendar with appropriate permissions.');
        console.error('2. The service account has been granted access to the calendar.');
        console.error('3. The API is enabled for your project in Google Cloud Console.');
      }
      process.exit(1);
    }
    console.log('✅ Calendar event created successfully!');
    console.log(`📅 Event: ${event.data.summary}`);
    console.log(`🕐 Start: ${startTime.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
    console.log(`🕐 End: ${endTime.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
    console.log(`🔗 Link: ${event.data.htmlLink}`);
    process.exit(0);
  }
);