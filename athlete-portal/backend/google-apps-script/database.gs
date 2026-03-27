// ==============================================
// WDHC Athlete Portal - Database Operations
// Google Sheets database functions
// ==============================================

// Configuration (shared with auth.gs)
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
  ATHLETES_SHEET: 'Athletes',
  PRS_SHEET: 'PRs',
  TRAINING_LOGS_SHEET: 'TrainingLogs',
  SESSIONS_SHEET: 'Sessions',
  MAGIC_LINKS_SHEET: 'MagicLinks',
  LEADERBOARD_CACHE_SHEET: 'LeaderboardCache'
};

// ==================== SHEET MANAGEMENT ====================

/**
 * Initialize database sheets if they don't exist
 */
function initializeDatabase() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
  // Create sheets with headers if they don't exist
  createSheetIfNotExists(ss, CONFIG.ATHLETES_SHEET, getAthletesHeaders());
  createSheetIfNotExists(ss, CONFIG.PRS_SHEET, getPRsHeaders());
  createSheetIfNotExists(ss, CONFIG.TRAINING_LOGS_SHEET, getTrainingLogsHeaders());
  createSheetIfNotExists(ss, CONFIG.SESSIONS_SHEET, getSessionsHeaders());
  createSheetIfNotExists(ss, CONFIG.MAGIC_LINKS_SHEET, getMagicLinksHeaders());
  createSheetIfNotExists(ss, CONFIG.LEADERBOARD_CACHE_SHEET, getLeaderboardCacheHeaders());
  
  console.log('✅ Database initialized successfully');
  return true;
}

function createSheetIfNotExists(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    
    // Apply formatting
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#D4AF37');
    headerRange.setFontWeight('bold');
    headerRange.setFontColor('#000000');
    headerRange.setHorizontalAlignment('center');
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    console.log(`✅ Created sheet: ${sheetName}`);
  }
  
  return sheet;
}

// ==================== HEADER DEFINITIONS ====================

function getAthletesHeaders() {
  return [
    'id', 'email', 'name', 'displayName', 'cityState', 'country',
    'dob', 'gender', 'weight', 'height', 'bio', 'socialLinks',
    'profileImage', 'bestHangTime', 'totalPRs', 'rank', 'gripAge',
    'preferences', 'status', 'createdAt', 'updatedAt'
  ];
}

function getPRsHeaders() {
  return [
    'id', 'athleteId', 'hangTime', 'attemptDate', 'weight',
    'gripType', 'notes', 'videoUrl', 'verified', 'verifiedBy',
    'verifiedAt', 'status', 'submittedAt', 'updatedAt'
  ];
}

function getTrainingLogsHeaders() {
  return [
    'id', 'athleteId', 'date', 'type', 'duration',
    'exercises', 'sets', 'reps', 'weight', 'notes',
    'rpe', 'fatigue', 'loggedAt', 'updatedAt'
  ];
}

function getSessionsHeaders() {
  return [
    'id', 'athleteId', 'token', 'createdAt', 'expiry',
    'lastActivity', 'userAgent', 'ipAddress'
  ];
}

function getMagicLinksHeaders() {
  return [
    'email', 'token', 'expiry', 'isNewAthlete', 'athleteName',
    'used', 'createdAt'
  ];
}

function getLeaderboardCacheHeaders() {
  return [
    'type', 'category', 'data', 'generatedAt', 'expiresAt'
  ];
}

// ==================== ATHLETE OPERATIONS ====================

function getAthleteByEmail(email) {
  return getRecordByField(CONFIG.ATHLETES_SHEET, 'email', email);
}

function getAthleteById(athleteId) {
  return getRecordByField(CONFIG.ATHLETES_SHEET, 'id', athleteId);
}

function createAthlete(athleteData) {
  const sheet = getSheet(CONFIG.ATHLETES_SHEET);
  const headers = sheet.getDataRange().getValues()[0];
  
  // Generate ID if not provided
  if (!athleteData.id) {
    athleteData.id = generateId();
  }
  
  // Set timestamps
  athleteData.createdAt = new Date().toISOString();
  athleteData.updatedAt = athleteData.createdAt;
  
  // Set default values
  athleteData.bestHangTime = athleteData.bestHangTime || '0:00';
  athleteData.totalPRs = athleteData.totalPRs || 0;
  athleteData.rank = athleteData.rank || 0;
  athleteData.gripAge = athleteData.gripAge || 0;
  athleteData.status = athleteData.status || 'active';
  
  const rowData = objectToRow(athleteData, headers);
  sheet.appendRow(rowData);
  
  return athleteData;
}

function updateAthlete(athleteId, updates) {
  const sheet = getSheet(CONFIG.ATHLETES_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  if (idIndex === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === athleteId) {
      // Update fields
      const athlete = rowToObject(data[i], headers);
      const updatedAthlete = { ...athlete, ...updates };
      updatedAthlete.updatedAt = new Date().toISOString();
      
      // Write back to sheet
      const rowData = objectToRow(updatedAthlete, headers);
      for (let j = 0; j < rowData.length; j++) {
        sheet.getRange(i + 1, j + 1).setValue(rowData[j]);
      }
      
      return updatedAthlete;
    }
  }
  
  return null;
}

function updateAthletePRStats(athleteId) {
  const prs = getPRsByAthleteId(athleteId);
  const athlete = getAthleteById(athleteId);
  
  if (!athlete) return;
  
  const updates = {
    totalPRs: prs.length,
    updatedAt: new Date().toISOString()
  };
  
  // Find best hang time
  if (prs.length > 0) {
    const bestPR = prs.reduce((best, pr) => {
      return timeToSeconds(pr.hangTime) > timeToSeconds(best.hangTime) ? pr : best;
    });
    
    if (timeToSeconds(bestPR.hangTime) > timeToSeconds(athlete.bestHangTime || '0:00')) {
      updates.bestHangTime = bestPR.hangTime;
    }
  }
  
  updateAthlete(athleteId, updates);
}

function updateAthleteTrainingStats(athleteId) {
  // Update training-related stats
  // This could track consistency, frequency, etc.
  const logs = getTrainingLogsByAthleteId(athleteId, { limit: 100 });
  
  // Calculate training frequency (logs per week)
  const frequency = calculateTrainingFrequency(logs);
  
  updateAthlete(athleteId, {
    trainingFrequency: frequency,
    updatedAt: new Date().toISOString()
  });
}

// ==================== PR OPERATIONS ====================

function getPRsByAthleteId(athleteId) {
  return getRecordsByField(CONFIG.PRS_SHEET, 'athleteId', athleteId);
}

function createPR(prData) {
  const sheet = getSheet(CONFIG.PRS_SHEET);
  const headers = sheet.getDataRange().getValues()[0];
  
  // Generate ID if not provided
  if (!prData.id) {
    prData.id = generateId();
  }
  
  // Set timestamps
  prData.submittedAt = new Date().toISOString();
  prData.updatedAt = prData.submittedAt;
  
  // Set default values
  prData.verified = prData.verified || false;
  prData.status = prData.status || 'pending';
  
  const rowData = objectToRow(prData, headers);
  sheet.appendRow(rowData);
  
  return prData;
}

function getPRById(prId) {
  return getRecordByField(CONFIG.PRS_SHEET, 'id', prId);
}

function updatePR(prId, updates) {
  const sheet = getSheet(CONFIG.PRS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  if (idIndex === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === prId) {
      const pr = rowToObject(data[i], headers);
      const updatedPR = { ...pr, ...updates };
      updatedPR.updatedAt = new Date().toISOString();
      
      const rowData = objectToRow(updatedPR, headers);
      for (let j = 0; j < rowData.length; j++) {
        sheet.getRange(i + 1, j + 1).setValue(rowData[j]);
      }
      
      return updatedPR;
    }
  }
  
  return null;
}

// ==================== TRAINING LOG OPERATIONS ====================

function getTrainingLogsByAthleteId(athleteId, options = {}) {
  const logs = getRecordsByField(CONFIG.TRAINING_LOGS_SHEET, 'athleteId', athleteId);
  
  // Apply filters
  let filteredLogs = [...logs];
  
  if (options.startDate) {
    const start = new Date(options.startDate);
    filteredLogs = filteredLogs.filter(log => new Date(log.date) >= start);
  }
  
  if (options.endDate) {
    const end = new Date(options.endDate);
    filteredLogs = filteredLogs.filter(log => new Date(log.date) <= end);
  }
  
  // Sort by date (newest first)
  filteredLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Apply pagination
  const offset = options.offset || 0;
  const limit = options.limit || filteredLogs.length;
  
  return filteredLogs.slice(offset, offset + limit);
}

function createTrainingLog(logData) {
  const sheet = getSheet(CONFIG.TRAINING_LOGS_SHEET);
  const headers = sheet.getDataRange().getValues()[0];
  
  // Generate ID if not provided
  if (!logData.id) {
    logData.id = generateId();
  }
  
  // Set timestamps
  logData.loggedAt = new Date().toISOString();
  logData.updatedAt = logData.loggedAt;
  
  const rowData = objectToRow(logData, headers);
  sheet.appendRow(rowData);
  
  return logData;
}

function getTrainingLogCount(athleteId) {
  const logs = getRecordsByField(CONFIG.TRAINING_LOGS_SHEET, 'athleteId', athleteId);
  return logs.length;
}

// ==================== LEADERBOARD OPERATIONS ====================

function getGlobalLeaderboardData(category = 'all', limit = 50, offset = 0) {
  // Check cache first
  const cacheKey = `global_${category}`;
  const cached = getCachedLeaderboard(cacheKey);
  
  if (cached && new Date(cached.expiresAt) > new Date()) {
    return cached.data.slice(offset, offset + limit);
  }
  
  // Generate fresh leaderboard
  const athletes = getAllAthletes();
  const prs = getAllPRs();
  
  // Calculate scores based on category
  const leaderboard = athletes.map(athlete => {
    const athletePRs = prs.filter(pr => pr.athleteId === athlete.id && pr.verified);
    
    return {
      athleteId: athlete.id,
      name: athlete.displayName || athlete.name,
      country: athlete.country,
      bestHangTime: athlete.bestHangTime,
      totalPRs: athletePRs.length,
      score: calculateAthleteScore(athlete, athletePRs, category)
    };
  });
  
  // Sort by score (descending)
  leaderboard.sort((a, b) => b.score - a.score);
  
  // Add ranks
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  // Cache for 1 hour
  cacheLeaderboard(cacheKey, leaderboard, 60);
  
  return leaderboard.slice(offset, offset + limit);
}

function getMonthlyLeaderboardData(category = 'all', limit = 50, offset = 0) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const cacheKey = `monthly_${now.getFullYear()}_${now.getMonth()}_${category}`;
  const cached = getCachedLeaderboard(cacheKey);
  
  if (cached && new Date(cached.expiresAt) > new Date()) {
    return cached.data.slice(offset, offset + limit);
  }
  
  // Get PRs from this month
  const allPRs = getAllPRs();
  const monthlyPRs = allPRs.filter(pr => {
    const prDate = new Date(pr.attemptDate);
    return prDate >= monthStart && pr.verified;
  });
  
  // Group by athlete and calculate best times
  const athleteMap = new Map();
  
  monthlyPRs.forEach(pr => {
    if (!athleteMap.has(pr.athleteId)) {
      athleteMap.set(pr.athleteId, {
        athleteId: pr.athleteId,
        prs: []
      });
    }
    athleteMap.get(pr.athleteId).prs.push(pr);
  });
  
  // Get athlete details and calculate scores
  const athletes = getAllAthletes();
  const leaderboard = [];
  
  athleteMap.forEach((data, athleteId) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;
    
    const bestPR = data.prs.reduce((best, pr) => {
      return timeToSeconds(pr.hangTime) > timeToSeconds(best.hangTime) ? pr : best;
    }, data.prs[0]);
    
    leaderboard.push({
      athleteId: athleteId,
      name: athlete.displayName || athlete.name,
      country: athlete.country,
      bestHangTime: bestPR.hangTime,
      totalPRs: data.prs.length,
      score: timeToSeconds(bestPR.hangTime)
    });
  });
  
  // Sort by score (descending)
  leaderboard.sort((a, b) => b.score - a.score);
  
  // Add ranks
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  // Cache for 15 minutes
  cacheLeaderboard(cacheKey, leaderboard, 15);
  
  return leaderboard.slice(offset, offset + limit);
}

function getLeaderboardCount(type, category) {
  // Simplified - in production would count properly
  return 100;
}

// ==================== CACHE OPERATIONS ====================

function getCachedLeaderboard(key) {
  const sheet = getSheet(CONFIG.LEADERBOARD_CACHE_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const typeIndex = headers.indexOf('type');
  const categoryIndex = headers.indexOf('category');
  
  if (typeIndex === -1 || categoryIndex === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][typeIndex] === key.split('_')[0] && 
        data[i][categoryIndex] === key.split('_').slice(1).join('_')) {
      const record = rowToObject(data[i], headers);
      
      // Parse JSON data
      try {
        record.data = JSON.parse(record.data);
      } catch (e) {
        record.data = [];
      }
      
      return record;
    }
  }
  
  return null;
}

function cacheLeaderboard(key, data, expiryMinutes = 60) {
  const sheet = getSheet(CONFIG.LEADERBOARD_CACHE_SHEET);
  const headers = sheet.getDataRange().getValues()[0];
  
  const [type, ...categoryParts] = key.split('_');
  const category = categoryParts.join('_');
  
  // Remove old cache entry
  clearCacheEntry(type, category);
  
  // Create new cache entry
  const cacheEntry = {
    type: type,
    category: category,
    data: JSON.stringify(data),
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()
  };
  
  const rowData = objectToRow(cacheEntry, headers);
  sheet.appendRow(rowData);
}

function clearCacheEntry(type, category) {
  const sheet = getSheet(CONFIG.LEADERBOARD_CACHE_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const typeIndex = headers.indexOf('type');
  const categoryIndex = headers.indexOf('category');
  
  if (typeIndex === -1 || categoryIndex === -1) return;
  
  // Find and delete matching rows (from bottom to top)
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][typeIndex] === type && data[i][categoryIndex] === category) {
      sheet.deleteRow(i + 1);
    }
  }
}

// ==================== UTILITY FUNCTIONS ====================

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  
  return sheet;
}

function getRecordByField(sheetName, field, value) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const fieldIndex = headers.indexOf(field);
  
  if (fieldIndex === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][fieldIndex] === value) {
      return rowToObject(data[i], headers);
    }
  }
  
  return null;
}

function getRecordsByField(sheetName, field, value) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const fieldIndex = headers.indexOf(field);
  
  if (fieldIndex === -1) return [];
  
  const records = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][fieldIndex] === value) {
      records.push(rowToObject(data[i], headers));
    }
  }
  
  return records;
}

function getAllAthletes() {
  const sheet = getSheet(CONFIG.ATHLETES_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const athletes = [];
  for (let i = 1; i < data.length; i++) {
    athletes.push(rowToObject(data[i], headers));
  }
  
  return athletes;
}

function getAllPRs() {
  const sheet = getSheet(CONFIG.PRS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const prs = [];
  for (let i = 1; i < data.length; i++) {
    prs.push(rowToObject(data[i], headers));
  }
  
  return prs;
}

function rowToObject(row, headers) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = row[index];
  });
  return obj;
}

function objectToRow(obj, headers) {
  return headers.map(header => {
    const value = obj[header];
    
    // Handle undefined/null
    if (value === undefined || value === null) {
      return '';
    }
    
    // Handle arrays and objects (stringify)
    if (Array.isArray(value) || typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return '';
      }
    }
    
    return value;
  });
}

function generateId() {
  return Utilities.getUuid();
}

function timeToSeconds(timeStr) {
  // Convert MM:SS or M.SS to seconds
  if (timeStr.includes(':')) {
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  } else if (timeStr.includes('.')) {
    const [minutes, seconds] = timeStr.split('.').map(Number);
    return minutes * 60 + (seconds || 0);
  }
  
  return parseFloat(timeStr) || 0;
}

function calculateAthleteScore(athlete, prs, category) {
  // Base score from best hang time
  let score = timeToSeconds(athlete.bestHangTime) * 10;
  
  // Bonus for number of PRs
  score += prs.length * 5;
  
  // Category adjustments
  switch (category) {
    case 'weight-adjusted':
      // Adjust for weight (lighter athletes get bonus)
      if (athlete.weight) {
        const weightBonus = (100 - Math.min(athlete.weight, 100)) * 2;
        score += weightBonus;
      }
      break;
    case 'consistency':
      // Bonus for consistent training (if we have training logs)
      score += (athlete.trainingFrequency || 0) * 20;
      break;
  }
  
  return Math.round(score);
}

function calculateTrainingFrequency(logs) {
  if (logs.length < 2) return 0;
  
  // Calculate average days between logs
  const dates = logs.map(log => new Date(log.date)).sort((a, b) => a - b);
  const totalDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
  
  if (totalDays === 0) return 0;
  
  const frequency = logs.length / totalDays * 7; // Logs per week
  return Math.round(frequency * 10) / 10;
}

function calculateTrainingConsistency(logs) {
  // Calculate consistency score (0-100)
  if (logs.length < 4) return 50; // Default
  
  const weeklyLogs = {};
  logs.forEach(log => {
    const date = new Date(log.date);
    const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;
    weeklyLogs[weekKey] = (weeklyLogs[weekKey] || 0) + 1;
  });
  
  const totalWeeks = Object.keys(weeklyLogs).length;
  const avgLogsPerWeek = logs.length / totalWeeks;
  
  // Calculate variance
  let variance = 0;
  Object.values(weeklyLogs).forEach(count => {
    variance += Math.pow(count - avgLogsPerWeek, 2);
  });
  variance /= totalWeeks;
  
  // Convert to consistency score (higher = more consistent)
  const consistency = 100 - Math.min(variance * 10, 100);
  return Math.round(consistency);
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function calculateImprovementRate(prs) {
  if (prs.length < 2) return 0;
  
  // Sort by date
  const sortedPRs = [...prs].sort((a, b) => new Date(a.attemptDate) - new Date(b.attemptDate));
  
  // Calculate improvement from first to last
  const firstTime = timeToSeconds(sortedPRs[0].hangTime);
  const lastTime = timeToSeconds(sortedPRs[sortedPRs.length - 1].hangTime);
  
  if (firstTime === 0) return 0;
  
  const improvement = ((lastTime - firstTime) / firstTime) * 100;
  return Math.round(improvement * 10) / 10;
}

function calculateMilestones(prs, logs) {
  const milestones = [];
  
  // PR milestones
  if (prs.length >= 1) milestones.push({ type: 'first_pr', achieved: true });
  if (prs.length >= 5) milestones.push({ type: '5_prs', achieved: true });
  if (prs.length >= 10) milestones.push({ type: '10_prs', achieved: true });
  
  // Time milestones
  const bestTime = prs.reduce((best, pr) => {
    return timeToSeconds(pr.hangTime) > timeToSeconds(best) ? pr.hangTime : best;
  }, '0:00');
  
  const bestSeconds = timeToSeconds(bestTime);
  if (bestSeconds >= 30) milestones.push({ type: '30_seconds', achieved: true });
  if (bestSeconds >= 60) milestones.push({ type: '1_minute', achieved: true });
  if (bestSeconds >= 120) milestones.push({ type: '2_minutes', achieved: true });
  
  // Training milestones
  if (logs.length >= 10) milestones.push({ type: '10_training_sessions', achieved: true });
  if (logs.length >= 50) milestones.push({ type: '50_training_sessions', achieved: true });
  
  // Consistency milestone
  const consistency = calculateTrainingConsistency(logs);
  if (consistency >= 80) milestones.push({ type: 'consistent_training', achieved: true });
  
  return milestones;
}

function calculatePRProgression(prs) {
  if (prs.length < 2) return [];
  
  // Sort by date
  const sortedPRs = [...prs].sort((a, b) => new Date(a.attemptDate) - new Date(b.attemptDate));
  
  return sortedPRs.map((pr, index) => ({
    date: pr.attemptDate,
    time: pr.hangTime,
    timeSeconds: timeToSeconds(pr.hangTime),
    sequence: index + 1,
    improvement: index > 0 ? timeToSeconds(pr.hangTime) - timeToSeconds(sortedPRs[index - 1].hangTime) : 0
  }));
}

function calculateGripAge(athleteId) {
  const athlete = getAthleteById(athleteId);
  if (!athlete || !athlete.createdAt) return 0;
  
  const joinDate = new Date(athlete.createdAt);
  const now = new Date();
  
  const months = (now.getFullYear() - joinDate.getFullYear()) * 12 + 
                 (now.getMonth() - joinDate.getMonth());
  
  return Math.max(0, months);
}
