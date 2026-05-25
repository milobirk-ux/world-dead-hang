const API_CONFIG = {
    BASE_URL: "https://wdhc-portal.milobirk.workers.dev/api",
    DATA_URL: 'data.json'
};

const WDHC_API = {
    CONFIG: API_CONFIG,

    getSessionToken: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('session');
        
        if (urlToken) {
            localStorage.setItem('wdhc_session', urlToken);
            const pData = urlParams.get('p');
            if (pData) {
                try {
                    const decoded = JSON.parse(decodeURIComponent(pData));
                    if (decoded.email) {
                        localStorage.setItem('wdhc_athlete_email', decoded.email.toLowerCase());
                    }
                    localStorage.setItem('wdhc_athlete_data', pData);
                } catch(e) { console.error('Data error:', e); }
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        return localStorage.getItem('wdhc_session');
    },

    requestMagicLink: async function(email, athleteName = '') {
        try {
            const response = await fetch(`${this.CONFIG.BASE_URL}/auth/magic-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'auth/magic-link',
                    email: email,
                    athleteName: athleteName
                })
            });
            return await response.json();
        } catch(postError) {
            console.warn("POST failed, trying GET fallback:", postError);
            const url = `${this.CONFIG.BASE_URL}/auth/magic-link?email=${encodeURIComponent(email)}&name=${encodeURIComponent(athleteName)}&_cb=${Date.now()}`;
            try {
                const response = await fetch(url);
                return await response.json();
            } catch(getError) {
                console.error("Both POST and GET failed:", getError);
                return { success: true, warning: 'Opaque response - assuming success' };
            }
        }
    },

    apiRequest: async function(method, endpoint) {
        if (endpoint.includes('athlete/profile')) {
            const cached = localStorage.getItem('wdhc_athlete_data');
            if (cached) {
                try { return { success: true, data: JSON.parse(decodeURIComponent(cached)) }; } catch(e) {}
            }
        }

        const token = this.getSessionToken();
        if (!token) throw new Error('No session');
        
        const url = `${this.CONFIG.BASE_URL}/${endpoint}?token=${token}&_cb=${Date.now()}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network error: ' + response.status);
            return await response.json();
        } catch (err) {
            console.error('API Request Failed:', err);
            throw err;
        }
    },

    submitHang: async function(hangTime, videoUrl = '', attemptDate = '', notes = '') {
        const token = this.getSessionToken();
        if (!token) throw new Error('No session');

        const url = `${this.CONFIG.BASE_URL}/athlete/submit-hang?token=${token}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hangTime, videoUrl, attemptDate, notes })
        });
        return await response.json();
    }
};

function apiRequest(method, endpoint) { return WDHC_API.apiRequest(method, endpoint); }
function getSessionToken() { return WDHC_API.getSessionToken(); }
