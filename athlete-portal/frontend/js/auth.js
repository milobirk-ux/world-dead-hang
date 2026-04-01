// ==============================================
// WDHC Athlete Portal - Authentication Module
// Magic Link Authentication System
// ==============================================

// Authentication state
let currentEmail = '';

/**
 * Initialize authentication page
 */
function initializeAuth() {
        
    // Error catching for debugging
    try {

    // Check URL params for register
    const u