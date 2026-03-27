// ==============================================
// WDHC Athlete Portal - API Endpoints
// REST API for athlete dashboard and data
// ==============================================

// Import auth functions
// Note: In Google Apps Script, we'd include this in the same project
// For organization, we're separating files conceptually

// ==================== API ENDPOINTS ====================

/**
 * Main API router
 */
function handleApiRequest(e, path) {
  const method = e.method;
  const sessionToken = getSessionTokenFromRequest(e);
  
  // Public endpoints
  if (path === 'auth/magic-link' && method === 'POST') {
    return handleRequestMagicLink(e);
  }
  
  if (path === 'auth/verify' && method === 'GET') {
    return handleVerifyMagicLink(e);
  }
  
  // Protected endpoints require session validation
  const validation = validateSession(sessionToken);
  if (!validation.valid) {
    return createErrorResponse('Authentication required', 401);
  }
  
  const athlete = validation.athlete;
  
  // Athlete endpoints
  if (path === 'athlete/profile' && method === 'GET') {
    return getAthleteProfile(athlete);
  }
  
  if (path === 'athlete/profile' && method === 'PUT') {
    return updateAthleteProfile(e, athlete);
  }
  
  if (path === 'athlete/prs' && method === 'GET') {
    return getAthletePRs(athlete);
  }
  
  if (path === 'athlete/prs' && method === 'POST') {
    return addAthletePR(e, athlete);
  }
  
  if (path === 'athlete/rank' && method === 'GET') {
    return getAthleteRank(athlete);
  }
  
  if (path === 'athlete/grip-age' && method === 'GET') {
    return getAthleteGripAge(athlete);
  }
  
  if (path === 'athlete/training-logs' && method === 'GET') {
    return getTrainingLogs(athlete, e.parameter);
  }
  
  if (path === 'athlete/training-logs' && method === 'POST') {
    return addTrainingLog(e, athlete);
  }
  
  if (path === 'athlete/stats' && method === 'GET') {
    return getAthleteStats(athlete);
  }
  
  // Leaderboard endpoints
  if (path === 'leaderboard' && method === 'GET') {
    return getLeaderboard(e.parameter);
  }
  
  if (path === 'leaderboard/global' && method === 'GET') {
    return getGlobalLeaderboard(e.parameter);
  }
  
  if (path === 'leaderboard/monthly' && method === 'GET') {
    return getMonthlyLeaderboard(e.parameter);
  }
  
  return createErrorResponse('Endpoint not found', 404);
}

// ==================== ATHLETE PROFILE ====================

function getAthleteProfile(athlete) {
  try {
    // Get additional profile data
    const prs = getPRsByAthleteId(athlete.id);
    const trainingLogs = getRecentTrainingLogs(athlete.id, 5);
    const rank = calculateAthleteRank(athlete.id);
    const gripAge = calculateGripAge(athlete.id);
    
    return createSuccessResponse({
      profile: athlete,
      stats: {
        totalPRs: prs.length,
        bestHangTime: athlete.bestHangTime || '0:00',
        rank: rank,
        gripAge: gripAge,
        joinDate: athlete.createdAt
      },
      recentPRs: prs.slice(0, 3),
      recentTraining: trainingLogs
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    return createErrorResponse('Failed to get profile', 500);
  }
}

function updateAthleteProfile(e, athlete) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Allowed fields for update
    const allowedFields = [
      'name', 'displayName', 'cityState', 'country', 'dob',
      'gender', 'weight', 'height', 'bio', 'socialLinks',
      'profileImage', 'preferences'
    ];
    
    // Filter and validate updates
    const updates = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updates[field] = data[field];
      }
    });
    
    // Validate date of birth
    if (updates.dob) {
      const dob = new Date(updates.dob);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        throw new Error('Invalid date of birth');
      }
    }
    
    // Update athlete
    const updatedAthlete = updateAthlete(athlete.id, updates);
    
    return createSuccessResponse({
      success: true,
      message: 'Profile updated successfully',
      athlete: updatedAthlete
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    return createErrorResponse(error.message, 400);
  }
}

// ==================== PR MANAGEMENT ====================

function getAthletePRs(athlete) {
  try {
    const prs = getPRsByAthleteId(athlete.id);
    
    // Calculate PR progression
    const progression = calculatePRProgression(prs);
    
    return createSuccessResponse({
      prs: prs,
      progression: progression,
      total: prs.length,
      best: prs.length > 0 ? prs[0] : null // Assuming sorted by time
    });
    
  } catch (error) {
    console.error('Get PRs error:', error);
    return createErrorResponse('Failed to get PRs', 500);
  }
}

function addAthletePR(e, athlete) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Validate PR data
    const validation = validatePRData(data);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    
    // Add athlete ID and timestamp
    data.athleteId = athlete.id;
    data.submittedAt = new Date().toISOString();
    data.status = 'pending'; // Needs verification
    
    // Create PR record
    const pr = createPR(data);
    
    // Update athlete stats
    updateAthletePRStats(athlete.id);
    
    // Send verification notification if needed
    if (data.videoUrl) {
      sendPRVerificationNotification(pr);
    }
    
    return createSuccessResponse({
      success: true,
      message: 'PR submitted successfully',
      pr: pr,
      requiresVerification: !!data.videoUrl
    });
    
  } catch (error) {
    console.error('Add PR error:', error);
    return createErrorResponse(error.message, 400);
  }
}

// ==================== TRAINING LOGS ====================

function getTrainingLogs(athlete, params) {
  try {
    const limit = parseInt(params.limit) || 20;
    const offset = parseInt(params.offset) || 0;
    const startDate = params.startDate;
    const endDate = params.endDate;
    
    const logs = getTrainingLogsByAthleteId(athlete.id, {
      limit: limit,
      offset: offset,
      startDate: startDate,
      endDate: endDate
    });
    
    // Calculate training statistics
    const stats = calculateTrainingStats(logs);
    
    return createSuccessResponse({
      logs: logs,
      stats: stats,
      pagination: {
        limit: limit,
        offset: offset,
        total: getTrainingLogCount(athlete.id)
      }
    });
    
  } catch (error) {
    console.error('Get training logs error:', error);
    return createErrorResponse('Failed to get training logs', 500);
  }
}

function addTrainingLog(e, athlete) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Validate training log
    const validation = validateTrainingLog(data);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    
    // Add athlete ID and timestamp
    data.athleteId = athlete.id;
    data.loggedAt = new Date().toISOString();
    
    // Create training log
    const log = createTrainingLog(data);
    
    // Update athlete training stats
    updateAthleteTrainingStats(athlete.id);
    
    return createSuccessResponse({
      success: true,
      message: 'Training log added successfully',
      log: log
    });
    
  } catch (error) {
    console.error('Add training log error:', error);
    return createErrorResponse(error.message, 400);
  }
}

// ==================== STATISTICS ====================

function getAthleteStats(athlete) {
  try {
    const prs = getPRsByAthleteId(athlete.id);
    const logs = getTrainingLogsByAthleteId(athlete.id, { limit: 100 });
    const rank = calculateAthleteRank(athlete.id);
    const gripAge = calculateGripAge(athlete.id);
    
    // Calculate various stats
    const stats = {
      basic: {
        totalPRs: prs.length,
        bestHangTime: athlete.bestHangTime || '0:00',
        rank: rank,
        gripAge: gripAge,
        joinDate: athlete.createdAt
      },
      prProgression: calculatePRProgression(prs),
      trainingFrequency: calculateTrainingFrequency(logs),
      consistency: calculateTrainingConsistency(logs),
      improvementRate: calculateImprovementRate(prs),
      milestones: calculateMilestones(prs, logs)
    };
    
    return createSuccessResponse(stats);
    
  } catch (error) {
    console.error('Get stats error:', error);
    return createErrorResponse('Failed to get stats', 500);
  }
}

function getAthleteRank(athlete) {
  try {
    const rank = calculateAthleteRank(athlete.id);
    
    return createSuccessResponse({
      rank: rank,
      athleteId: athlete.id,
      athleteName: athlete.name
    });
    
  } catch (error) {
    console.error('Get rank error:', error);
    return createErrorResponse('Failed to get rank', 500);
  }
}

function getAthleteGripAge(athlete) {
  try {
    const gripAge = calculateGripAge(athlete.id);
    
    return createSuccessResponse({
      gripAge: gripAge,
      athleteId: athlete.id,
      athleteName: athlete.name,
      calculationDate: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get grip age error:', error);
    return createErrorResponse('Failed to get grip age', 500);
  }
}

// ==================== LEADERBOARDS ====================

function getLeaderboard(params) {
  try {
    const type = params.type || 'global';
    const category = params.category || 'all';
    const limit = parseInt(params.limit) || 50;
    const offset = parseInt(params.offset) || 0;
    
    let leaderboard;
    
    switch (type) {
      case 'global':
        leaderboard = getGlobalLeaderboardData(category, limit, offset);
        break;
      case 'monthly':
        leaderboard = getMonthlyLeaderboardData(category, limit, offset);
        break;
      case 'country':
        leaderboard = getCountryLeaderboardData(category, limit, offset);
        break;
      case 'age-group':
        leaderboard = getAgeGroupLeaderboardData(category, limit, offset);
        break;
      default:
        throw new Error('Invalid leaderboard type');
    }
    
    return createSuccessResponse({
      type: type,
      category: category,
      leaderboard: leaderboard,
      pagination: {
        limit: limit,
        offset: offset,
        total: getLeaderboardCount(type, category)
      },
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return createErrorResponse(error.message, 400);
  }
}

function getGlobalLeaderboard(params) {
  return getLeaderboard({ ...params, type: 'global' });
}

function getMonthlyLeaderboard(params) {
  return getLeaderboard({ ...params, type: 'monthly' });
}

// ==================== HELPER FUNCTIONS ====================

function getSessionTokenFromRequest(e) {
  // Check Authorization header
  const authHeader = e.headers?.Authorization || e.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check query parameter
  if (e.parameter.session) {
    return e.parameter.session;
  }
  
  // Check post data
  try {
    const data = JSON.parse(e.postData?.contents || '{}');
    return data.sessionToken;
  } catch (error) {
    return null;
  }
}

function validatePRData(data) {
  const required = ['hangTime', 'attemptDate'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
  }
  
  // Validate hang time format
  const timeRegex = /^(\d+):([0-5]?\d)$|^(\d+)\.(\d{1,2})$/;
  if (!timeRegex.test(data.hangTime)) {
    return { valid: false, message: 'Invalid time format. Use MM:SS or M.SS' };
  }
  
  // Validate date
  const attemptDate = new Date(data.attemptDate);
  if (isNaN(attemptDate.getTime()) || attemptDate > new Date()) {
    return { valid: false, message: 'Invalid attempt date' };
  }
  
  return { valid: true };
}

function validateTrainingLog(data) {
  const required = ['date', 'type'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
  }
  
  // Validate date
  const logDate = new Date(data.date);
  if (isNaN(logDate.getTime()) || logDate > new Date()) {
    return { valid: false, message: 'Invalid log date' };
  }
  
  // Validate type
  const validTypes = ['hang', 'strength', 'endurance', 'recovery', 'other'];
  if (!validTypes.includes(data.type)) {
    return { valid: false, message: `Invalid training type. Must be one of: ${validTypes.join(', ')}` };
  }
  
  return { valid: true };
}

function createSuccessResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: data,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(message, code = 400) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message,
    code: code,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==================== DATABASE FUNCTIONS ====================
// These would be implemented in database.gs

function getPRsByAthleteId(athleteId) {
  // Implementation in database.gs
  return [];
}

function createPR(prData) {
  // Implementation in database.gs
  return prData;
}

function getTrainingLogsByAthleteId(athleteId, options) {
  // Implementation in database.gs
  return [];
}

function createTrainingLog(logData) {
  // Implementation in database.gs
  return logData;
}

function calculateAthleteRank(athleteId) {
  // Implementation in database.gs
  return 0;
}

function calculateGripAge(athleteId) {
  // Implementation in database.gs
  return 0;
}

function updateAthlete(athleteId, updates) {
  // Implementation in database.gs
  return { id: athleteId, ...updates };
}

// Note: In a real implementation, these database functions would be
// implemented in a separate database.gs file and included here