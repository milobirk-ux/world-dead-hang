// ==============================================
// WDHC Athlete Portal - SIMPLE API Client
// Mock API for testing without Google Apps Script backend
// ==============================================

// Mock athlete data for Milo Birk
const MOCK_ATHLETE_DATA = {
    'milobirk@gmail.com': {
        id: 'milo-birk-001',
        name: 'Milo Birk',
        email: 'milobirk@gmail.com',
        profile: {
            dateOfBirth: '1990-10-29',
            gender: 'male',
            bodyweight: 160,
            location: 'Detroit, MI / USA',
            occupation: 'Home Inspector',
            division: 'Open Men'
        },
        stats: {
            bestTime: '4:09',
            totalAttempts: 3,
            averageTime: '4:09',
            gripAge: '0 years 0 months 0 days', // Would calculate from first submission
            rank: 1,
            percentile: 99
        },
        prs: [
            { date: '2026-03-07', time: '4:09', verified: true },
            { date: '2026-03-09', time: '4.1', verified: false },
            { date: '2026-03-20', time: '4.26', verified: false }
        ],
        trainingLogs: [
            { date: '2026-03-01', duration: '2:30', notes: 'Warm-up session' },
            { date: '2026-03-05', duration: '3:15', notes: 'Strength training' },
            { date: '2026-03-07', duration: '4:09', notes: 'Competition attempt - NEW PR!' }
        ]
    }
};

// ==================== SIMPLE AUTHENTICATION ====================

/**
 * Get current session token
 */
function getSessionToken() {
    return localStorage.getItem('wdhc_session');
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    const token = getSessionToken();
    return !!token;
}

/**
 * Simple mock authentication - checks if email exists in mock data
 */
async function simpleAuth(email) {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (MOCK_ATHLETE_DATA[email]) {
                // Create mock session token
                const sessionToken = `mock-session-${Date.now()}-${email}`;
                localStorage.setItem('wdhc_session', sessionToken);
                localStorage.setItem('wdhc_athlete_email', email);
                resolve({ success: true, message: 'Authentication successful' });
            } else {
                resolve({ success: false, message: 'Email not found in system' });
            }
        }, 1000); // Simulate network delay
    });
}

/**
 * Request magic link (mock version)
 */
async function requestMagicLink(email, athleteName = '') {
    console.log(`Mock: Requesting magic link for ${email}`);
    
    // For testing, we'll just do immediate authentication
    // In a real system, this would send an email
    return simpleAuth(email);
}

/**
 * Verify magic link (mock version)
 */
async function verifyMagicLink(token) {
    console.log(`Mock: Verifying token ${token}`);
    
    // For testing, accept any token that starts with "mock-"
    if (token && token.startsWith('mock-')) {
        // Extract email from token (this is a mock)
        const email = token.split('-').pop() || 'milobirk@gmail.com';
        
        if (MOCK_ATHLETE_DATA[email]) {
            localStorage.setItem('wdhc_session', token);
            localStorage.setItem('wdhc_athlete_email', email);
            return { success: true, athlete: MOCK_ATHLETE_DATA[email] };
        }
    }
    
    return { success: false, message: 'Invalid token' };
}

// ==================== SIMPLE DATA FETCHING ====================

/**
 * Get athlete profile
 */
async function getAthleteProfile() {
    const email = localStorage.getItem('wdhc_athlete_email');
    if (!email || !MOCK_ATHLETE_DATA[email]) {
        return { success: false, message: 'Not authenticated' };
    }
    
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                profile: MOCK_ATHLETE_DATA[email].profile
            });
        }, 500);
    });
}

/**
 * Get athlete stats
 */
async function getAthleteStats() {
    const email = localStorage.getItem('wdhc_athlete_email');
    if (!email || !MOCK_ATHLETE_DATA[email]) {
        return { success: false, message: 'Not authenticated' };
    }
    
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                stats: MOCK_ATHLETE_DATA[email].stats
            });
        }, 500);
    });
}

/**
 * Get athlete PRs
 */
async function getAthletePRs() {
    const email = localStorage.getItem('wdhc_athlete_email');
    if (!email || !MOCK_ATHLETE_DATA[email]) {
        return { success: false, message: 'Not authenticated' };
    }
    
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                prs: MOCK_ATHLETE_DATA[email].prs
            });
        }, 500);
    });
}

/**
 * Get training logs
 */
async function getTrainingLogs() {
    const email = localStorage.getItem('wdhc_athlete_email');
    if (!email || !MOCK_ATHLETE_DATA[email]) {
        return { success: false, message: 'Not authenticated' };
    }
    
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                logs: MOCK_ATHLETE_DATA[email].trainingLogs
            });
        }, 500);
    });
}

/**
 * Get leaderboard data
 */
async function getLeaderboard() {
    // Return mock leaderboard data
    const leaderboard = [
        { rank: 1, name: 'Milo Birk', time: '4:09', division: 'Open Men', location: 'Detroit, MI / USA' },
        { rank: 2, name: 'Random R', time: '3:42', division: 'Open Men', location: 'Detroit, MI / USA' },
        { rank: 3, name: 'Testa Longername', time: '2:20', division: 'Masters (40+)', location: 'Test City' },
        { rank: 4, name: 'Markie Mullins', time: '1:16', division: 'Open Women', location: 'Unknown' },
        { rank: 5, name: 'Markie Mullins', time: '1:16', division: 'Open Men', location: 'Unknown' }
    ];
    
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                leaderboard: leaderboard
            });
        }, 500);
    });
}

/**
 * Logout
 */
function logout() {
    localStorage.removeItem('wdhc_session');
    localStorage.removeItem('wdhc_athlete_email');
    window.location.href = 'auth.html';
}

// ==================== EXPORT FUNCTIONS ====================

// Make functions available globally
window.WDHC_API = {
    // Authentication
    requestMagicLink,
    verifyMagicLink,
    isAuthenticated,
    getSessionToken,
    logout,
    
    // Data fetching
    getAthleteProfile,
    getAthleteStats,
    getAthletePRs,
    getTrainingLogs,
    getLeaderboard
};

console.log('WDHC Simple API loaded - using mock data for testing');