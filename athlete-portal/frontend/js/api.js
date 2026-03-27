// ==============================================
// WDHC Athlete Portal - API Client
// Google Apps Script API integration
// ==============================================

const API_CONFIG = {
    // Google Apps Script Web App URL
    BASE_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    
    // Endpoints
    ENDPOINTS: {
        AUTH_MAGIC_LINK: '/auth/magic-link',
        AUTH_VERIFY: '/auth/verify',
        ATHLETE_PROFILE: '/athlete/profile',
        ATHLETE_STATS: '/athlete/stats',
        ATHLETE_PRS: '/athlete/prs',
        ATHLETE_TRAINING_LOGS: '/athlete/training-logs',
        LEADERBOARD: '/leaderboard',
        LEADERBOARD_GLOBAL: '/leaderboard/global',
        LEADERBOARD_MONTHLY: '/leaderboard/monthly'
    },
    
    // Default headers
    HEADERS: {
        'Content-Type': 'application/json'
    }
};

// ==================== AUTHENTICATION ====================

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
 * Request magic link for login/registration
 */
async function requestMagicLink(email, athleteName = '') {
    try {
        const response = await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.AUTH_MAGIC_LINK, {
            method: 'POST',
            headers: API_CONFIG.HEADERS,
            body: JSON.stringify({ email, athleteName })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Magic link request error:', error);
        throw error;
    }
}

/**
 * Verify magic link (handled by redirect from Google Apps Script)
 */
function verifyMagicLink(token) {
    // This is handled by the Google Apps Script redirect
    // The token should be in the URL query parameters
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH_VERIFY}?token=${token}`;
    window.location.href = url;
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem('wdhc_session');
    window.location.href = '/auth.html';
}

// ==================== API REQUEST HELPER ====================

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const token = getSessionToken();
    
    if (!token) {
        throw new Error('Authentication required');
    }
    
    const defaultOptions = {
        headers: {
            ...API_CONFIG.HEADERS,
            'Authorization': `Bearer ${token}`
        }
    };
    
    const requestOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(API_CONFIG.BASE_URL + endpoint, requestOptions);
        
        if (response.status === 401) {
            // Token expired or invalid
            logout();
            throw new Error('Session expired. Please login again.');
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// ==================== ATHLETE ENDPOINTS ====================

/**
 * Get athlete profile
 */
async function getAthleteProfile() {
    return await apiRequest(API_CONFIG.ENDPOINTS.ATHLETE_PROFILE);
}

/**
 * Update athlete profile
 */
async function updateAthleteProfile(updates) {
    return await apiRequest(API_CONFIG.ENDPOINTS.ATHLETE_PROFILE, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
}

/**
 * Get athlete stats
 */
async function getAthleteStats() {
    return await apiRequest(API_CONFIG.ENDPOINTS.ATHLETE_STATS);
}

/**
 * Get athlete PRs
 */
async function getAthletePRs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString 
        ? `${API_CONFIG.ENDPOINTS.ATHLETE_PRS}?${queryString}`
        : API_CONFIG.ENDPOINTS.ATHLETE_PRS;
    
    return await apiRequest(endpoint);
}

/**
 * Add new PR
 */
async function addAthletePR(prData) {
    return await apiRequest(API_CONFIG.ENDPOINTS.ATHLETE_PRS, {
        method: 'POST',
        body: JSON.stringify(prData)
    });
}

/**
 * Update PR
 */
async function updateAthletePR(prId, updates) {
    return await apiRequest(`${API_CONFIG.ENDPOINTS.ATHLETE_PRS}/${prId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
}

/**
 * Delete PR
 */
async function deleteAthletePR(prId) {
    return await apiRequest(`${API_CONFIG.ENDPOINTS.ATHLETE_PRS}/${prId}`, {
        method: 'DELETE'
    });
}

/**
 * Get training logs
 */
async function getTrainingLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString 
        ? `${API_CONFIG.ENDPOINTS.ATHLETE_TRAINING_LOGS}?${queryString}`
        : API_CONFIG.ENDPOINTS.ATHLETE_TRAINING_LOGS;
    
    return await apiRequest(endpoint);
}

/**
 * Add training log
 */
async function addTrainingLog(logData) {
    return await apiRequest(API_CONFIG.ENDPOINTS.ATHLETE_TRAINING_LOGS, {
        method: 'POST',
        body: JSON.stringify(logData)
    });
}

/**
 * Update training log
 */
async function updateTrainingLog(logId, updates) {
    return await apiRequest(`${API_CONFIG.ENDPOINTS.ATHLETE_TRAINING_LOGS}/${logId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
}

/**
 * Delete training log
 */
async function deleteTrainingLog(logId) {
    return await apiRequest(`${API_CONFIG.ENDPOINTS.ATHLETE_TRAINING_LOGS}/${logId}`, {
        method: 'DELETE'
    });
}

// ==================== LEADERBOARD ENDPOINTS ====================

/**
 * Get leaderboard
 */
async function getLeaderboard(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString 
        ? `${API_CONFIG.ENDPOINTS.LEADERBOARD}?${queryString}`
        : API_CONFIG.ENDPOINTS.LEADERBOARD;
    
    return await apiRequest(endpoint);
}

/**
 * Get global leaderboard
 */
async function getGlobalLeaderboard(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString 
        ? `${API_CONFIG.ENDPOINTS.LEADERBOARD_GLOBAL}?${queryString}`
        : API_CONFIG.ENDPOINTS.LEADERBOARD_GLOBAL;
    
    return await apiRequest(endpoint);
}

/**
 * Get monthly leaderboard
 */
async function getMonthlyLeaderboard(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString 
        ? `${API_CONFIG.ENDPOINTS.LEADERBOARD_MONTHLY}?${queryString}`
        : API_CONFIG.ENDPOINTS.LEADERBOARD_MONTHLY;
    
    return await apiRequest(endpoint);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format time from seconds to MM:SS
 */
function formatTimeFromSeconds(seconds) {
    if (!seconds && seconds !== 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse time string to seconds
 */
function parseTimeToSeconds(timeString) {
    if (!timeString) return 0;
    
    // Handle MM:SS format
    if (timeString.includes(':')) {
        const [mins, secs] = timeString.split(':').map(Number);
        return (mins * 60) + (secs || 0);
    }
    
    // Handle decimal format (M.SS)
    if (timeString.includes('.')) {
        const [mins, secs] = timeString.split('.').map(Number);
        return (mins * 60) + (secs || 0);
    }
    
    // Assume seconds
    return parseFloat(timeString) || 0;
}

/**
 * Calculate grip age in months
 */
function calculateGripAge(joinDate) {
    if (!joinDate) return 0;
    
    const join = new Date(joinDate);
    const now = new Date();
    
    const months = (now.getFullYear() - join.getFullYear()) * 12 + 
                   (now.getMonth() - join.getMonth());
    
    return Math.max(0, months);
}

/**
 * Format date for display
 */
function formatDate(dateString, format = 'medium') {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        return 'Invalid date';
    }
    
    const options = {
        short: {
            month: 'short',
            day: 'numeric'
        },
        medium: {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        },
        long: {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }
    };
    
    return date.toLocaleDateString('en-US', options[format] || options.medium);
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return formatDate(timestamp, 'short');
}

/**
 * Validate email address
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Show error message
 */
function showError(message, elementId = null) {
    if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            return;
        }
    }
    
    // Fallback to alert for now
    alert(message);
}

/**
 * Clear error message
 */
function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

/**
 * Show loading state
 */
function showLoading(button) {
    if (!button) return;
    
    const text = button.querySelector('.btn-text');
    const spinner = button.querySelector('.btn-spinner');
    
    if (text) text.style.display = 'none';
    if (spinner) spinner.style.display = 'inline-block';
    button.disabled = true;
}

/**
 * Hide loading state
 */
function hideLoading(button) {
    if (!button) return;
    
    const text = button.querySelector('.btn-text');
    const spinner = button.querySelector('.btn-spinner');
    
    if (text) text.style.display = 'inline-block';
    if (spinner) spinner.style.display = 'none';
    button.disabled = false;
}

// ==================== MOCK DATA FOR DEVELOPMENT ====================

// Remove this section in production

const MOCK_DATA = {
    athlete: {
        id: 'athlete_123',
        email: 'athlete@example.com',
        name: 'John Smith',
        displayName: 'John S',
        cityState: 'Detroit, MI',
        country: 'US',
        dob: '1990-01-01',
        gender: 'male',
        weight: 180,
        height: 72,
        bio: 'Grip strength enthusiast',
        socialLinks: {},
        profileImage: 'assets/default-avatar.jpg',
        bestHangTime: '2:45',
        totalPRs: 12,
        rank: 42,
        gripAge: 8,
        preferences: {},
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-03-25T00:00:00Z'
    },
    
    stats: {
        basic: {
            totalPRs: 12,
            bestHangTime: '2:45',
            rank: 42,
            gripAge: 8,
            joinDate: '2024-01-01T00:00:00Z'
        },
        prProgression: [
            { date: '2024-01-15', time: '1:30', timeSeconds: 90 },
            { date: '2024-02-01', time: '1:45', timeSeconds: 105 },
            { date: '2024-02-15', time: '2:00', timeSeconds: 120 },
            { date: '2024-03-01', time: '2:15', timeSeconds: 135 },
            { date: '2024-03-15', time: '2:30', timeSeconds: 150 },
            { date: '2024-03-25', time: '2:45', timeSeconds: 165 }
        ],
        trainingFrequency: 3.2,
        consistency: 85,
        improvementRate: 83.3,
        milestones: [
            { type: 'first_pr', achieved: true },
            { type: '5_prs', achieved: true },
            { type: '30_seconds', achieved: true },
            { type: '1_minute', achieved: true },
            { type: '10_training_sessions', achieved: true },
            { type: 'consistent_training', achieved: true }
        ]
    },
    
    prs: [
        {
            id: 'pr_1',
            athleteId: 'athlete_123',
            hangTime: '2:45',
            attemptDate: '2024-03-25',
            weight: 180,
            gripType: 'standard',
            notes: 'Feeling strong today!',
            videoUrl: 'https://youtube.com/watch?v=example',
            verified: true,
            verifiedBy: 'admin_1',
            verifiedAt: '2024-03-25T12:00:00Z',
            status: 'approved',
            submittedAt: '2024-03-25T10:00:00Z',
            updatedAt: '2024-03-25T12:00:00Z'
        }
        // More PRs...
    ],
    
    trainingLogs: [
        {
            id: 'log_1',
            athleteId: 'athlete_123',
            date: '2024-03-24',
            type: 'hang',
            duration: '30:00',
            exercises: 'Max hangs, endurance hangs',
            sets: '4',
            reps: '5',
            weight: 'Bodyweight',
            notes: 'Good session, felt strong',
            rpe: 7,
            fatigue: 6,
            loggedAt: '2024-03-24T18:00:00Z',
            updatedAt: '2024-03-24T18:00:00Z'
        }
        // More logs...
    ],
    
    leaderboard: [
        {
            rank: 1,
            athleteId: 'athlete_456',
            name: 'Alex Chen',
            country: 'US',
            bestHangTime: '5:22',
            totalPRs: 24,
            score: 5422
        }
        // More athletes...
    ]
};

/**
 * Mock API functions for development
 * Replace with real API calls in production
 */
if (process.env.NODE_ENV === 'development' || !API_CONFIG.BASE_URL.includes('YOUR_SCRIPT_ID')) {
    // Override API functions with mock data
    window.mockApi = true;
    
    const mockApiRequest = async (endpoint, options = {}) => {
        console.log('Mock API call:', endpoint, options);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return mock data based on endpoint
        if (endpoint.includes('/athlete/profile')) {
            return { success: true, data: MOCK_DATA.athlete };
        }
        
        if (endpoint.includes('/athlete/stats')) {
            return { success: true, data: MOCK_DATA.stats };
        }
        
        if (endpoint.includes('/athlete/prs')) {
            return { success: true, data: { prs: MOCK_DATA.prs, total: MOCK_DATA.prs.length } };
        }
        
        if (endpoint.includes('/athlete/training-logs')) {
            return { success: true, data: { logs: MOCK_DATA.trainingLogs, total: MOCK_DATA.trainingLogs.length } };
        }
        
        if (endpoint.includes('/leaderboard')) {
            return { success: true, data: { leaderboard: MOCK_DATA.leaderboard, total: MOCK_DATA.leaderboard.length } };
        }
        
        // Default response
        return { success: true, data: {} };
    };
    
    // Override apiRequest for development
    const originalApiRequest = apiRequest;
    apiRequest = mockApiRequest;
    
    // Override requestMagicLink for development
    const originalRequestMagicLink = requestMagicLink;
    requestMagicLink = async (email, athleteName = '') => {
        console.log('Mock magic link request:', email, athleteName);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { success: true, message: 'Magic link sent (mock)', isNewAthlete: !!athleteName };
    };
    
    console.log('📱 Using mock API for development');
}