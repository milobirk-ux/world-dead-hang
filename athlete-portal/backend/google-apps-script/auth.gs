// ==============================================
// WDHC Athlete Portal - Authentication System
// Magic Link Authentication for Athletes
// ==============================================

// Configuration
const CONFIG = {
  // Google Sheets database
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID', // Will be set during deployment
  ATHLETES_SHEET: 'Athletes',
  SESSIONS_SHEET: 'Sessions',
  MAGIC_LINKS_SHEET: 'MagicLinks',
  
  // Email settings
  SENDER_EMAIL: 'noreply@worlddeadhang.com',
  SENDER_NAME: 'WDHC Athlete Portal',
  
  // Magic link settings
  TOKEN_EXPIRY_HOURS: 24,
  FRONTEND_URL: 'https://athletes.worlddeadhang.com',
  
  // Security
  JWT_SECRET: 'YOUR_JWT_SECRET', // Will be set during deployment
  SALT_ROUNDS: 10
};

// ==================== MAGIC LINK AUTHENTICATION ====================

/**
 * Request a magic link for login/registration
 * POST /api/auth/magic-link
 */
function requestMagicLink(email, athleteName = '') {
  try {
    // Validate email
    if (!isValidEmail(email)) {
      throw new Error('Invalid email address');
    }
    
    // Check if athlete exists
    const athlete = getAthleteByEmail(email);
    const isNewAthlete = !athlete;
    
    // Generate magic token
    const token = generateToken();
    const expiry = new Date(Date.now() + CONFIG.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    
    // Store magic link
    storeMagicLink(email, token, expiry, isNewAthlete, athleteName);
    
    // Send magic link email
    sendMagicLinkEmail(email, token, isNewAthlete, athleteName);
    
    return {
      success: true,
      message: 'Magic link sent to your email',
      isNewAthlete: isNewAthlete
    };
    
  } catch (error) {
    console.error('Magic link request error:', error);
    throw error;
  }
}

/**
 * Verify magic link and create session
 * GET /api/auth/verify?token=TOKEN
 */
function verifyMagicLink(token) {
  try {
    // Get magic link record
    const magicLink = getMagicLinkByToken(token);
    
    if (!magicLink) {
      throw new Error('Invalid or expired magic link');
    }
    
    // Check expiry
    if (new Date(magicLink.expiry) < new Date()) {
      throw new Error('Magic link has expired');
    }
    
    // Get or create athlete
    let athlete = getAthleteByEmail(magicLink.email);
    
    if (magicLink.isNewAthlete && !athlete) {
      // Create new athlete
      athlete = createAthlete({
        email: magicLink.email,
        name: magicLink.athleteName || magicLink.email.split('@')[0],
        createdAt: new Date().toISOString(),
        status: 'active'
      });
    }
    
    if (!athlete) {
      throw new Error('Athlete not found');
    }
    
    // Create session
    const session = createSession(athlete.id);
    
    // Mark magic link as used
    markMagicLinkUsed(token);
    
    return {
      success: true,
      session: session,
      athlete: athlete,
      isNewAthlete: magicLink.isNewAthlete
    };
    
  } catch (error) {
    console.error('Magic link verification error:', error);
    throw error;
  }
}

/**
 * Validate session token
 * Middleware for protected endpoints
 */
function validateSession(sessionToken) {
  try {
    const session = getSessionByToken(sessionToken);
    
    if (!session) {
      throw new Error('Invalid session');
    }
    
    // Check expiry
    if (new Date(session.expiry) < new Date()) {
      throw new Error('Session expired');
    }
    
    // Get athlete
    const athlete = getAthleteById(session.athleteId);
    
    if (!athlete || athlete.status !== 'active') {
      throw new Error('Athlete not found or inactive');
    }
    
    return {
      valid: true,
      session: session,
      athlete: athlete
    };
    
  } catch (error) {
    console.error('Session validation error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}

// ==================== DATABASE OPERATIONS ====================

function getAthleteByEmail(email) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.ATHLETES_SHEET);
  
  if (!sheet) return null;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailIndex = headers.indexOf('email');
  
  if (emailIndex === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][emailIndex] === email) {
      return rowToObject(data[i], headers);
    }
  }
  
  return null;
}

function getAthleteById(athleteId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.ATHLETES_SHEET);
  
  if (!sheet) return null;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  if (idIndex === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === athleteId) {
      return rowToObject(data[i], headers);
    }
  }
  
  return null;
}

function createAthlete(athleteData) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.ATHLETES_SHEET);
  
  // Generate ID
  athleteData.id = generateId();
  athleteData.createdAt = new Date().toISOString();
  athleteData.updatedAt = athleteData.createdAt;
  
  // Set default values
  athleteData.rank = 0;
  athleteData.totalPRs = 0;
  athleteData.bestHangTime = '0:00';
  athleteData.gripAge = 0;
  athleteData.status = 'active';
  
  // Get headers
  const headers = sheet.getDataRange().getValues()[0];
  const rowData = objectToRow(athleteData, headers);
  
  sheet.appendRow(rowData);
  
  return athleteData;
}

function storeMagicLink(email, token, expiry, isNewAthlete, athleteName) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.MAGIC_LINKS_SHEET);
  
  const record = {
    email: email,
    token: token,
    expiry: expiry.toISOString(),
    isNewAthlete: isNewAthlete,
    athleteName: athleteName || '',
    used: false,
    createdAt: new Date().toISOString()
  };
  
  const headers = sheet.getDataRange().getValues()[0];
  const rowData = objectToRow(record, headers);
  
  sheet.appendRow(rowData);
}

function getMagicLinkByToken(token) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.MAGIC_LINKS_SHEET);
  
  if (!sheet) return null;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tokenIndex = headers.indexOf('token');
  
  if (tokenIndex === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][tokenIndex] === token) {
      return rowToObject(data[i], headers);
    }
  }
  
  return null;
}

function markMagicLinkUsed(token) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.MAGIC_LINKS_SHEET);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tokenIndex = headers.indexOf('token');
  const usedIndex = headers.indexOf('used');
  
  if (tokenIndex === -1 || usedIndex === -1) return;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][tokenIndex] === token) {
      sheet.getRange(i + 1, usedIndex + 1).setValue(true);
      break;
    }
  }
}

function createSession(athleteId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SESSIONS_SHEET);
  
  const session = {
    id: generateId(),
    athleteId: athleteId,
    token: generateToken(),
    createdAt: new Date().toISOString(),
    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    lastActivity: new Date().toISOString()
  };
  
  const headers = sheet.getDataRange().getValues()[0];
  const rowData = objectToRow(session, headers);
  
  sheet.appendRow(rowData);
  
  return session;
}

function getSessionByToken(token) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SESSIONS_SHEET);
  
  if (!sheet) return null;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tokenIndex = headers.indexOf('token');
  
  if (tokenIndex === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][tokenIndex] === token) {
      return rowToObject(data[i], headers);
    }
  }
  
  return null;
}

// ==================== UTILITY FUNCTIONS ====================

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateToken() {
  return Utilities.base64EncodeWebSafe(Utilities.getRandomBytes(32)).replace(/[^a-zA-Z0-9]/g, '');
}

function generateId() {
  return Utilities.getUuid();
}

function rowToObject(row, headers) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = row[index];
  });
  return obj;
}

function objectToRow(obj, headers) {
  return headers.map(header => obj[header] || '');
}

function sendMagicLinkEmail(email, token, isNewAthlete, athleteName) {
  const subject = isNewAthlete 
    ? 'Welcome to WDHC Athlete Portal - Complete Your Registration'
    : 'Your WDHC Athlete Portal Login Link';
  
  const loginUrl = `${CONFIG.FRONTEND_URL}/auth/verify?token=${token}`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #D4AF37;">World Dead Hang Championship</h2>
      <h3>${isNewAthlete ? 'Welcome to the WDHC Athlete Portal!' : 'Your Login Link'}</h3>
      
      <p>${isNewAthlete ? `Hi ${athleteName || 'Athlete'}, welcome to the WDHC community!` : 'Click the link below to access your athlete dashboard:'}</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #D4AF37; color: black; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
          ${isNewAthlete ? 'Complete Registration' : 'Login to Dashboard'}
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        This link will expire in ${CONFIG.TOKEN_EXPIRY_HOURS} hours.<br>
        If you didn't request this, please ignore this email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #888; font-size: 12px;">
        World Dead Hang Championship<br>
        <a href="https://worlddeadhang.com" style="color: #D4AF37;">worlddeadhang.com</a>
      </p>
    </div>
  `;
  
  const textBody = `
World Dead Hang Championship
${isNewAthlete ? 'Welcome to the WDHC Athlete Portal!' : 'Your Login Link'}

${isNewAthlete ? `Hi ${athleteName || 'Athlete'}, welcome to the WDHC community!` : 'Click the link below to access your athlete dashboard:'}

${loginUrl}

This link will expire in ${CONFIG.TOKEN_EXPIRY_HOURS} hours.
If you didn't request this, please ignore this email.

World Dead Hang Championship
https://worlddeadhang.com
  `;
  
  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody,
    body: textBody,
    name: CONFIG.SENDER_NAME
  });
}

// ==================== WEB APP ENDPOINTS ====================

function doGet(e) {
  const path = e.pathInfo || '';
  
  if (path === 'auth/verify') {
    return handleVerifyMagicLink(e);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK',
    message: 'WDHC Athlete Portal API',
    endpoints: ['/auth/magic-link', '/auth/verify', '/api/*']
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const path = e.pathInfo || '';
  
  if (path === 'auth/magic-link') {
    return handleRequestMagicLink(e);
  }
  
  return createErrorResponse('Endpoint not found', 404);
}

function handleRequestMagicLink(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = requestMagicLink(data.email, data.athleteName);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return createErrorResponse(error.message, 400);
  }
}

function handleVerifyMagicLink(e) {
  try {
    const token = e.parameter.token;
    
    if (!token) {
      return createErrorResponse('Token required', 400);
    }
    
    const result = verifyMagicLink(token);
    
    // Redirect to frontend with session token
    const redirectUrl = `${CONFIG.FRONTEND_URL}/dashboard?session=${result.session.token}`;
    
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
          <script>
            window.location.href = "${redirectUrl}";
          </script>
        </head>
        <body>
          <p>Redirecting to dashboard...</p>
        </body>
      </html>
    `);
    
  } catch (error) {
    return createErrorResponse(error.message, 400);
  }
}

function createErrorResponse(message, code = 400) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message,
    code: code
  })).setMimeType(ContentService.MimeType.JSON);
}