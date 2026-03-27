// WDHC Submissions Tracker - Daily Update System
// This script handles data fetching, chart updates, and daily tracking

// Configuration
const CONFIG = {
    googleSheetId: '1rq6xHnXJtK7KpR1Lk6Vq5X5Z5X5Z5X5Z5X5Z5X5Z5X5Z', // Replace with actual Sheet ID
    sheetName: 'Form Responses 1',
    apiKey: '', // Google Sheets API key would go here
    autoRefreshInterval: 5 * 60 * 1000, // 5 minutes
    dataCacheKey: 'wdhc_submissions_cache',
    cacheExpiry: 30 * 60 * 1000 // 30 minutes
};

// State management
let state = {
    currentTimeframe: 'week',
    chart: null,
    autoRefreshInterval: null,
    lastUpdate: null,
    isLoading: false
};

// Initialize the dashboard
function initDashboard() {
    console.log('WDHC Submissions Tracker initializing...');
    
    // Set up event listeners
    document.getElementById('autoRefresh').addEventListener('change', toggleAutoRefresh);
    document.getElementById('refreshBtn').addEventListener('click', loadData);
    
    // Set up timeframe buttons
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            changeTimeframe(this.dataset.timeframe);
        });
    });
    
    // Load initial data
    loadData();
    
    // Start auto-refresh if enabled
    if (document.getElementById('autoRefresh').checked) {
        startAutoRefresh();
    }
    
    console.log('Dashboard initialized');
}

// Load data from cache or generate mock data
async function loadData() {
    if (state.isLoading) return;
    
    state.isLoading = true;
    showLoading();
    document.getElementById('refreshBtn').disabled = true;
    
    try {
        // Check cache first
        const cachedData = getCachedData();
        if (cachedData) {
            console.log('Using cached data');
            updateDashboard(cachedData);
        } else {
            console.log('Generating mock data (no cache)');
            const mockData = await generateRealisticData();
            cacheData(mockData);
            updateDashboard(mockData);
        }
        
        state.lastUpdate = new Date();
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load data. Please try again.');
    } finally {
        state.isLoading = false;
        hideLoading();
        document.getElementById('refreshBtn').disabled = false;
    }
}

// Generate realistic mock data that simulates real growth patterns
async function generateRealisticData() {
    const now = new Date();
    const data = {
        totalSubmissions: 0,
        verifiedSubmissions: 0,
        avgTime: '0:00',
        countries: new Set(),
        submissionsByDate: [],
        recentSubmissions: [],
        dailyStats: {
            submissionsToday: 0,
            verifiedToday: 0,
            timeChange: '+0s',
            countryChange: '+0'
        }
    };

    // Generate 90 days of historical data with realistic growth
    const startDate = new Date();
    startDate.setDate(now.getDate() - 90);
    
    let totalCount = 0;
    let verifiedCount = 0;
    const countrySet = new Set();
    
    // Realistic growth curve: slow start, accelerating growth
    for (let i = 0; i <= 90; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Growth formula: more submissions as time goes on
        let dailyCount = 0;
        if (i < 30) {
            // First month: 0-1 submissions per day
            dailyCount = Math.random() > 0.7 ? 1 : 0;
        } else if (i < 60) {
            // Second month: 0-2 submissions per day
            dailyCount = Math.floor(Math.random() * 3);
        } else {
            // Third month: 1-4 submissions per day
            dailyCount = 1 + Math.floor(Math.random() * 4);
        }
        
        // Add some randomness for "viral" days
        if (Math.random() > 0.95) dailyCount += 2; // 5% chance of extra boost
        
        const dailyVerified = Math.floor(dailyCount * 0.7); // 70% verification rate
        
        data.submissionsByDate.push({
            date: dateStr,
            count: dailyCount,
            verified: dailyVerified
        });
        
        totalCount += dailyCount;
        verifiedCount += dailyVerified;
        
        // Generate individual submissions for recent days
        if (i >= 80) { // Last 10 days
            for (let j = 0; j < dailyCount; j++) {
                const submission = generateMockSubmission(date);
                data.recentSubmissions.push(submission);
                
                // Add country
                if (submission.country) {
                    countrySet.add(submission.country);
                }
            }
        }
    }
    
    // Calculate statistics
    data.totalSubmissions = totalCount;
    data.verifiedSubmissions = verifiedCount;
    data.countries = countrySet.size;
    
    // Calculate average time (weighted towards recent submissions)
    const recentTimes = data.recentSubmissions
        .filter(s => s.time && s.time !== 'N/A')
        .map(s => {
            const [min, sec] = s.time.split(':').map(Number);
            return min * 60 + sec;
        });
    
    if (recentTimes.length > 0) {
        const avgSeconds = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
        const avgMin = Math.floor(avgSeconds / 60);
        const avgSec = Math.floor(avgSeconds % 60);
        data.avgTime = `${avgMin}:${avgSec.toString().padStart(2, '0')}`;
    }
    
    // Calculate today's stats (last data point)
    const todayData = data.submissionsByDate[data.submissionsByDate.length - 1];
    data.dailyStats.submissionsToday = todayData.count;
    data.dailyStats.verifiedToday = todayData.verified;
    
    // Sort recent submissions by date (newest first)
    data.recentSubmissions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return data;
}

// Generate a mock submission
function generateMockSubmission(date) {
    const names = [
        'John Smith', 'Sarah Johnson', 'Mike Chen', 'Emma Wilson', 'Alex Rodriguez',
        'Lisa Brown', 'David Kim', 'Maria Garcia', 'James Miller', 'Sophia Lee',
        'Robert Taylor', 'Jennifer White', 'Michael Brown', 'Emily Davis',
        'Christopher Lee', 'Amanda Martinez', 'Daniel Thompson', 'Jessica Garcia'
    ];
    
    const countries = ['US', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Brazil', 'Spain', 'Italy'];
    const tiers = ['Novice', 'Challenger', 'Elite', 'Legend', 'Freak'];
    
    // Realistic time distribution
    const timeOptions = [
        '0:45', '0:52', '1:03', '1:15', '1:28', '1:42', '2:01', '2:23', '2:50', '3:22',
        '0:38', '0:49', '1:08', '1:32', '1:59', '2:30', '3:05', '3:45', '4:30', '5:22'
    ];
    
    return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        athlete: names[Math.floor(Math.random() * names.length)],
        time: timeOptions[Math.floor(Math.random() * timeOptions.length)],
        tier: tiers[Math.floor(Math.random() * tiers.length)],
        country: countries[Math.floor(Math.random() * countries.length)],
        status: Math.random() > 0.3 ? 'Verified ✓' : 'Pending'
    };
}

// Update all dashboard components
function updateDashboard(data) {
    updateStats(data);
    updateChart(data);
    updateTable(data);
}

// Update statistics display
function updateStats(data) {
    document.getElementById('totalSubmissions').textContent = data.totalSubmissions.toLocaleString();
    document.getElementById('verifiedSubmissions').textContent = data.verifiedSubmissions.toLocaleString();
    document.getElementById('avgTime').textContent = data.avgTime;
    document.getElementById('countries').textContent = data.countries;
    
    document.getElementById('submissionsChange').textContent = `+${data.dailyStats.submissionsToday} today`;
    document.getElementById('verifiedChange').textContent = `+${data.dailyStats.verifiedToday} today`;
    document.getElementById('timeChange').textContent = data.dailyStats.timeChange;
    document.getElementById('countryChange').textContent = `+${data.dailyStats.countryChange} today`;
}

// Update the chart
function updateChart(data) {
    const ctx = document.getElementById('submissionsChart').getContext('2d');
    
    // Filter data based on timeframe
    let filteredData = data.submissionsByDate;
    let labelFormat = 'MMM d';
    
    if (state.currentTimeframe === 'week') {
        filteredData = data.submissionsByDate.slice(-7);
        labelFormat = 'EEE';
    } else if (state.currentTimeframe === 'month') {
        filteredData = data.submissionsByDate.slice(-30);
        labelFormat = 'MMM d';
    }
    
    const labels = filteredData.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { 
            weekday: state.currentTimeframe === 'week' ? 'short' : undefined,
            month: 'short', 
            day: 'numeric' 
        });
    });
    
    const counts = filteredData.map(d => d.count);
    const verified = filteredData.map(d => d.verified);
    
    // Destroy existing chart if it exists
    if (state.chart) {
        state.chart.destroy();
    }
    
    // Create new chart
    state.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Submissions',
                    data: counts,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Verified',
                    data: verified,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#cbd5e1',
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: '#334155',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        precision: 0
                    }
                }
            }
        }
    });
}

// Update the table with recent submissions
function updateTable(data) {
    const tableBody = document.getElementById('recentSubmissionsBody');
    tableBody.innerHTML = '';
    
    // Show only last 10 submissions
    const recent = data.recentSubmissions.slice(0, 10);
    
    recent.forEach(submission => {
        const row = document.createElement('tr');
        
        // Tier badge class
        const tierClass = `tier-${submission.tier.toLowerCase()}`;
        
        row.innerHTML = `
            <td>${submission.date}</td>
            <td><strong>${submission.athlete}</strong></td>
            <td>${submission.time}</td>
            <td><span class="tier-badge ${tierClass}">${submission.tier}</span></td>
            <td>${submission.country}</td>
            <td>${submission.status}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Show table and hide loading
    document.getElementById('recentSubmissionsTable').style.display = 'table';
    document.getElementById('tableLoading').style.display = 'none';
}

// Change timeframe and refresh chart
function changeTimeframe(timeframe) {
    state.currentTimeframe = timeframe;
    
    // Update active button
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.timeframe === timeframe) {
            btn.classList.add('active');
        }
    });
    
    // Reload data to update chart
    loadData();
}

// Toggle auto-refresh
function toggleAutoRefresh() {
    const autoRefresh = document.getElementById('autoRefresh').checked;
    
    if (autoRefresh) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
}

// Start auto-refresh interval
function startAutoRefresh() {
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
    }
    
    state.autoRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing data...');
        loadData();
    }, CONFIG.autoRefreshInterval);
    
    console.log('Auto-refresh started');
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
        state.autoRefreshInterval = null;
    }
    
    console.log('Auto-refresh stopped');
}

// Update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    document.getElementById('lastUpdated').textContent = `${now.toLocaleDateString()} ${timeStr}`;
}

// Show loading state
function showLoading() {
    document.getElementById('refreshBtn').textContent = 'Loading...';
}

// Hide loading state
function hideLoading() {
    document.getElementById('refreshBtn').textContent = 'Refresh';
}

// Show error message
function showError(message) {
    // Create error toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Cache management
function cacheData(data) {
    const cache = {
        data: data,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem(CONFIG.dataCacheKey, JSON.stringify(cache));
    } catch (e) {
        console.warn('Failed to cache data:', e);
    }
}

function getCachedData() {
    try {
        const cached = localStorage.getItem(CONFIG.dataCacheKey);
        if (!cached) return null;
        
        const cache = JSON.parse(cached);
        const age = Date.now() - cache.timestamp;
        
        if (age < CONFIG.cacheExpiry) {
            return cache.data;
        }
        
        // Cache expired
        localStorage.removeItem(CONFIG.dataCacheKey);
        return null;
    } catch (e) {
        console.warn('Failed to read cache:', e);
        return null;
    }
}

// Add CSS animations for error toasts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Export for use in HTML
window.WDHCTracker = {
    init: initDashboard,
    loadData: loadData,
    changeTimeframe: changeTimeframe
};

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}