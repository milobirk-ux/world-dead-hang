document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const registerParam = urlParams.get('register');
    const emailParam = urlParams.get('email');
    
    if (registerParam === 'true') {
        switchToRegister();
    }
    
    // Auto-fill email if passed from index
    if (emailParam) {
        const loginEmail = document.getElementById('loginEmail');
        if (loginEmail) loginEmail.value = emailParam;
    }
    
    // Check for session token (magic link verification)
    const sessionToken = urlParams.get('session');
    if (sessionToken) {
        localStorage.setItem('wdhc_session', sessionToken);
        window.location.href = 'dashboard.html';
    }
    
    // Tab switching
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            forms.forEach(form => form.classList.remove('active'));
            const targetForm = document.getElementById(`${tabName}Form`);
            if (targetForm) targetForm.classList.add('active');
        });
    });
    
    // Form switching
    const switchLinks = document.querySelectorAll('.auth-switch');
    switchLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetTab = this.getAttribute('data-switch-to');
            
            if (targetTab === 'register') {
                switchToRegister();
            } else {
                switchToLogin();
            }
        });
    });
    
    // Back to login button
    const backToLoginBtn = document.getElementById('backToLogin');
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', function() {
            document.getElementById('magicLinkSent').classList.remove('active');
            document.getElementById('loginForm').classList.add('active');
            
            tabs.forEach(t => t.classList.remove('active'));
            const loginTab = document.querySelector('[data-tab="login"]');
            if (loginTab) loginTab.classList.add('active');
        });
    }
    
    // Resend magic link
    const resendLink = document.getElementById('resendLink');
    if (resendLink) {
        resendLink.addEventListener('click', function(e) {
            e.preventDefault();
            const email = this.getAttribute('data-email');
            if (email) {
                requestMagicLink(email);
            }
        });
    }
    
    // Form submissions
    const loginForm = document.getElementById('loginFormElement');
    const registerForm = document.getElementById('registerFormElement');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
});

function switchToRegister() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    const registerTab = document.querySelector('[data-tab="register"]');
    if (registerTab) registerTab.classList.add('active');
    
    forms.forEach(form => form.classList.remove('active'));
    const regForm = document.getElementById('registerForm');
    if (regForm) regForm.classList.add('active');
}

function switchToLogin() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    const loginTab = document.querySelector('[data-tab="login"]');
    if (loginTab) loginTab.classList.add('active');
    
    forms.forEach(form => form.classList.remove('active'));
    const logForm = document.getElementById('loginForm');
    if (logForm) logForm.classList.add('active');
}

function showMagicLinkSent(email) {
    const forms = document.querySelectorAll('.auth-form');
    const emailElement = document.getElementById('magicLinkEmail');
    const resendLink = document.getElementById('resendLink');
    
    forms.forEach(form => form.classList.remove('active'));
    const sentView = document.getElementById('magicLinkSent');
    if (sentView) sentView.classList.add('active');
    
    if (emailElement) {
        emailElement.textContent = email;
    }
    
    if (resendLink) {
        resendLink.setAttribute('data-email', email);
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const email = form.email.value.trim();
    const athleteName = form.athleteName ? form.athleteName.value.trim() : '';
    const submitBtn = document.getElementById('loginSubmit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    clearErrors('login');
    
    if (!isValidEmail(email)) {
        showError('loginEmail', 'Please enter a valid email address');
        return;
    }
    
    submitBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';
    
    try {
        const response = await requestMagicLink(email, athleteName);
        
        if (response.success) {
            showMagicLinkSent(email);
        } else {
            showError('loginEmail', response.error || 'Failed to send magic link');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('loginEmail', 'An error occurred. Please try again.');
    } finally {
        submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline-block';
        if (btnSpinner) btnSpinner.style.display = 'none';
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const country = form.country.value;
    const terms = form.terms.checked;
    
    const submitBtn = document.getElementById('registerSubmit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    clearErrors('register');
    
    let isValid = true;
    
    if (!name) {
        showError('registerName', 'Please enter your name');
        isValid = false;
    }
    
    if (!isValidEmail(email)) {
        showError('registerEmail', 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!country) {
        showError('registerCountry', 'Please select your country');
        isValid = false;
    }
    
    if (!terms) {
        showError('registerTerms', 'You must agree to the terms and privacy policy');
        isValid = false;
    }
    
    if (!isValid) return;
    
    submitBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';
    
    try {
        const response = await requestMagicLink(email, name);
        
        if (response.success) {
            showMagicLinkSent(email);
        } else {
            showError('registerEmail', response.error || 'Failed to create account');
        }
    } catch (error) {
        console.error('Register error:', error);
        showError('registerEmail', 'An error occurred. Please try again.');
    } finally {
        submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline-block';
        if (btnSpinner) btnSpinner.style.display = 'none';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}Error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearErrors(formType) {
    const errorElements = document.querySelectorAll(`[id$="${formType}Error"]`);
    errorElements.forEach(element => {
        element.textContent = '';
        element.style.display = 'none';
    });
}

async function requestMagicLink(email, athleteName = '') {
    // Standardizing on GET for magic link request to ensure maximum compatibility and zero CORS issues on mobile
    const url = `${API_CONFIG.BASE_URL}?action=auth/magic-link&email=${encodeURIComponent(email)}&name=${encodeURIComponent(athleteName)}`;
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Network error requesting magic link:', error);
        return { success: false, error: 'Network error. Please try again.' };
    }
}