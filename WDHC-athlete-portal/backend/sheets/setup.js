// ==============================================
// WDHC Athlete Portal - Google Sheets Setup
// Creates and configures the database spreadsheet
// ==============================================

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Configuration
const CONFIG = {
  // Google API credentials (set these as environment variables)
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
  
  // Spreadsheet settings
  SPREADSHEET_TITLE: 'WDHC Athlete Portal Database',
  SPREADSHEET_FOLDER_ID: null, // Optional: ID of folder to place spreadsheet in
};

// Sheet definitions
const SHEETS = [
  {
    name: 'Athletes',
    headers: [
      'id', 'email', 'name', 'displayName', 'cityState', 'country',
      'dob', 'gender', 'weight', 'height', 'bio', 'socialLinks',
      'profileImage', 'bestHangTime', 'totalPRs', 'rank', 'gripAge',
      'preferences', 'status', 'createdAt', 'updatedAt'
    ],
    frozenRows: 1,
    formatting: {
      headerBackground: '#D4AF37',
      headerTextColor: '#000000',
      headerFontWeight: 'bold',
      headerAlignment: 'center'
    }
  },
  {
    name: 'PRs',
    headers: [
      'id', 'athleteId', 'hangTime', 'attemptDate', 'weight',
      'gripType', 'notes', 'videoUrl', 'verified', 'verifiedBy',
      'verifiedAt', 'status', 'submittedAt', 'updatedAt'
    ],
    frozenRows: 1,
    formatting: {
      headerBackground: '#4CAF50',
      headerTextColor: '#FFFFFF',
      headerFontWeight: 'bold',
      headerAlignment: 'center'
    }
  },
  {
    name: 'TrainingLogs',
    headers: [
      'id', 'athleteId', 'date', 'type', 'duration',
      'exercises', 'sets', 'reps', 'weight', 'notes',
      'rpe', 'fatigue', 'loggedAt', 'updatedAt'
    ],
    frozenRows: 1,
    formatting: {
      headerBackground: '#2196F3',
      headerTextColor: '#FFFFFF',
      headerFontWeight: 'bold',
      headerAlignment: 'center'
    }
  },
  {
    name: 'Sessions',
    headers: [
      'id', 'athleteId', 'token', 'createdAt', 'expiry',
      'lastActivity', 'userAgent', 'ipAddress'
    ],
    frozenRows: 1,
    formatting: {
      headerBackground: '#9C27B0',
      headerTextColor: '#FFFFFF',
      headerFontWeight: 'bold',
      headerAlignment: 'center'
    }
  },
  {
    name: 'MagicLinks',
    headers: [
      'email', 'token', 'expiry', 'isNewAthlete', 'athleteName',
      'used', 'createdAt'
    ],
    frozenRows: 1,
    formatting: {
      headerBackground: '#FF9800',
      headerTextColor: '#000000',
      headerFontWeight: 'bold',
      headerAlignment: 'center'
    }
  },
  {
    name: 'LeaderboardCache',
    headers: [
      'type', 'category', 'data', 'generatedAt', 'expiresAt'
    ],
    frozenRows: 1,
    formatting: {
      headerBackground: '#607D8B',
      headerTextColor: '#FFFFFF',
      headerFontWeight: 'bold',
      headerAlignment: 'center'
    }
  }
];

// Initialize Google Sheets API
async function initializeSheetsAPI() {
  const auth = new google.auth.OAuth2(
    CONFIG.CLIENT_ID,
    CONFIG.CLIENT_SECRET,
    CONFIG.REDIRECT_URI
  );
  
  auth.setCredentials({
    refresh_token: CONFIG.REFRESH_TOKEN
  });
  
  return google.sheets({ version: 'v4', auth });
}

// Create new spreadsheet
async function createSpreadsheet(sheetsAPI) {
  try {
    console.log('📝 Creating new spreadsheet...');
    
    const request = {
      resource: {
        properties: {
          title: CONFIG.SPREADSHEET_TITLE,
          locale: 'en_US',
          timeZone: 'America/New_York',
          autoRecalc: 'ON_CHANGE'
        },
        sheets: SHEETS.map(sheet => ({
          properties: {
            title: sheet.name,
            gridProperties: {
              rowCount: 1000,
              columnCount: sheet.headers.length,
              frozenRowCount: sheet.frozenRows
            }
          }
        }))
      }
    };
    
    // Add folder if specified
    if (CONFIG.SPREADSHEET_FOLDER_ID) {
      request.resource.parents = [CONFIG.SPREADSHEET_FOLDER_ID];
    }
    
    const response = await sheetsAPI.spreadsheets.create(request);
    const spreadsheetId = response.data.spreadsheetId;
    const spreadsheetUrl = response.data.spreadsheetUrl;
    
    console.log(`✅ Spreadsheet created: ${spreadsheetUrl}`);
    console.log(`📋 Spreadsheet ID: ${spreadsheetId}`);
    
    return { spreadsheetId, spreadsheetUrl };
    
  } catch (error) {
    console.error('❌ Error creating spreadsheet:', error.message);
    throw error;
  }
}

// Set up sheet headers and formatting
async function setupSheets(sheetsAPI, spreadsheetId) {
  try {
    console.log('🎨 Setting up sheets...');
    
    const requests = [];
    
    SHEETS.forEach((sheet, index) => {
      // Add header row
      requests.push({
        updateCells: {
          range: {
            sheetId: index,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: sheet.headers.length
          },
          rows: [{
            values: sheet.headers.map(header => ({
              userEnteredValue: { stringValue: header },
              userEnteredFormat: {
                backgroundColor: hexToRgb(sheet.formatting.headerBackground),
                textFormat: {
                  foregroundColor: hexToRgb(sheet.formatting.headerTextColor),
                  bold: sheet.formatting.headerFontWeight
                },
                horizontalAlignment: sheet.formatting.headerAlignment
              }
            }))
          }],
          fields: 'userEnteredValue,userEnteredFormat'
        }
      });
      
      // Set column widths
      sheet.headers.forEach((header, colIndex) => {
        const width = Math.max(100, header.length * 10); // Minimum 100px
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId: index,
              dimension: 'COLUMNS',
              startIndex: colIndex,
              endIndex: colIndex + 1
            },
            properties: {
              pixelSize: width
            },
            fields: 'pixelSize'
          }
        });
      });
      
      // Freeze header row
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: index,
            gridProperties: {
              frozenRowCount: sheet.frozenRows
            }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      });
    });
    
    // Execute all requests
    await sheetsAPI.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests }
    });
    
    console.log('✅ Sheets setup complete');
    
  } catch (error) {
    console.error('❌ Error setting up sheets:', error.message);
    throw error;
  }
}

// Add sample data for testing
async function addSampleData(sheetsAPI, spreadsheetId) {
  try {
    console.log('🧪 Adding sample data...');
    
    const sampleAthletes = [
      {
        id: 'athlete_001',
        email: 'demo@example.com',
        name: 'Demo Athlete',
        displayName: 'Demo',
        cityState: 'San Francisco, CA',
        country: 'US',
        dob: '1990-01-01',
        gender: 'male',
        weight: 180,
        height: 72,
        bio: 'Demo account for testing',
        socialLinks: '{}',
        profileImage: '',
        bestHangTime: '2:30',
        totalPRs: 5,
        rank: 42,
        gripAge: 3,
        preferences: '{}',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    const samplePRs = [
      {
        id: 'pr_001',
        athleteId: 'athlete_001',
        hangTime: '2:30',
        attemptDate: new Date().toISOString().split('T')[0],
        weight: 180,
        gripType: 'standard',
        notes: 'First test PR',
        videoUrl: '',
        verified: true,
        verifiedBy: 'system',
        verifiedAt: new Date().toISOString(),
        status: 'approved',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    // Add sample athletes
    await sheetsAPI.spreadsheets.values.append({
      spreadsheetId,
      range: 'Athletes!A2',
      valueInputOption: 'RAW',
      resource: {
        values: sampleAthletes.map(athlete => 
          SHEETS[0].headers.map(header => athlete[header] || '')
        )
      }
    });
    
    // Add sample PRs
    await sheetsAPI.spreadsheets.values.append({
      spreadsheetId,
      range: 'PRs!A2',
      valueInputOption: 'RAW',
      resource: {
        values: samplePRs.map(pr => 
          SHEETS[1].headers.map(header => pr[header] || '')
        )
      }
    });
    
    console.log('✅ Sample data added');
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error.message);
    // Don't throw - sample data is optional
  }
}

// Convert hex color to RGB object
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    red: parseInt(result[1], 16) / 255,
    green: parseInt(result[2], 16) / 255,
    blue: parseInt(result[3], 16) / 255
  } : { red: 0, green: 0, blue: 0 };
}

// Generate environment file with spreadsheet ID
function generateEnvFile(spreadsheetId) {
  const envContent = `# WDHC Athlete Portal Environment Variables
# Generated by setup script on ${new Date().toISOString()}

# Google Sheets Database
SPREADSHEET_ID=${spreadsheetId}

# Google Apps Script Configuration
# Add these to your Google Apps Script project properties
SCRIPT_DEPLOYMENT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# Email Configuration
SENDER_EMAIL=noreply@worlddeadhang.com
SENDER_NAME=WDHC Athlete Portal

# Frontend URL
FRONTEND_URL=https://athletes.worlddeadhang.com

# Security
JWT_SECRET=YOUR_SECRET_KEY_HERE
TOKEN_EXPIRY_HOURS=24

# Development
NODE_ENV=production
`;
  
  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, envContent);
  console.log(`📁 Environment file created: ${envPath}`);
  
  // Also create a config file for Google Apps Script
  const configContent = `// WDHC Athlete Portal - Configuration
// Copy this to your Google Apps Script project

const CONFIG = {
  // Google Sheets database
  SPREADSHEET_ID: '${spreadsheetId}',
  ATHLETES_SHEET: 'Athletes',
  PRS_SHEET: 'PRs',
  TRAINING_LOGS_SHEET: 'TrainingLogs',
  SESSIONS_SHEET: 'Sessions',
  MAGIC_LINKS_SHEET: 'MagicLinks',
  LEADERBOARD_CACHE_SHEET: 'LeaderboardCache',
  
  // Email settings
  SENDER_EMAIL: 'noreply@worlddeadhang.com',
  SENDER_NAME: 'WDHC Athlete Portal',
  
  // Magic link settings
  TOKEN_EXPIRY_HOURS: 24,
  FRONTEND_URL: 'https://athletes.worlddeadhang.com',
  
  // Security
  JWT_SECRET: 'YOUR_SECRET_KEY_HERE',
  SALT_ROUNDS: 10
};
`;
  
  const configPath = path.join(__dirname, 'google-apps-script-config.js');
  fs.writeFileSync(configPath, configContent);
  console.log(`📁 Google Apps Script config created: ${configPath}`);
}

// Main setup function
async function setupDatabase() {
  try {
    console.log('🚀 Starting WDHC Athlete Portal database setup...\n');
    
    // Check environment variables
    const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\nPlease set these variables and try again.');
      process.exit(1);
    }
    
    // Initialize API
    const sheetsAPI = await initializeSheetsAPI();
    
    // Create spreadsheet
    const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(sheetsAPI);
    
    // Set up sheets
    await setupSheets(sheetsAPI, spreadsheetId);
    
    // Add sample data
    await addSampleData(sheetsAPI, spreadsheetId);
    
    // Generate configuration files
    generateEnvFile(spreadsheetId);
    
    console.log('\n🎉 Database setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Copy the spreadsheet ID to your Google Apps Script project');
    console.log('2. Deploy the Google Apps Script as a web app');
    console.log('3. Update the frontend API configuration');
    console.log('4. Deploy the frontend to Cloudflare Pages');
    console.log(`\n🔗 Spreadsheet URL: ${spreadsheetUrl}`);
    console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = {
  setupDatabase,
  SHEETS,
  CONFIG
};