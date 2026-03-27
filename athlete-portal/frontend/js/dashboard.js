// ==============================================
// WDHC Athlete Portal - Dashboard JavaScript
// ==============================================

// Global variables
let athleteData = null;
let prData = [];
let trainingData = [];
let gripAgeHangTimeChart = null;
let gripAgeDistributionChart = null;
let hangTimeDistributionChart = null;

// DOM Elements
const elements = {
    // User info
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    sidebarUserName: document.getElementById('sidebarUserName'),
    sidebarUserRank: document.getElementById('sidebarUserRank'),
    sidebarAvatar: document.getElementById('sidebarAvatar'),
    sidebarGripAge: document.getElementById('sidebarGripAge'),
    sidebarBestHang: document.getElementById('sidebarBestHang'),
    
    // Stats
    welcomeTitle: document.getElementById('welcomeTitle'),
    welcomeSubtitle: document.getElementById('welcomeSubtitle'),
    currentRank: document.getElementById('currentRank'),
    bestHang: document.getElementById('bestHang'),
    gripAge: document.getElementById('gripAge'),
    totalPRs: document.getElementById('totalPRs'),
    
    // Trend indicators
    rankTrendIcon: document.getElementById('rankTrendIcon'),
    rankTrendText: document.getElementById('rankTrendText'),
    hangTrendIcon: document.getElementById('hangTrendIcon'),
    hangTrendText: document.getElementById('hangTrendText'),
    prTrendIcon: document.getElementById('prTrendIcon'),
    prTrendText: document.getElementById('prTrendText'),
    
    // Analysis elements
    correlationStrength: document.getElementById('correlationStrength'),
    avgImprovement: document.getElementById('avgImprovement'),
    nextMilestone: document.getElementById('nextMilestone'),
    gripAgePercentile: document.getElementById('gripAgePercentile'),
    hangTimePercentile: document.getElementById('hangTimePercentile'),
    
    // Charts
    prProgressionChart: null,
    trainingFrequencyChart: null,
    
    // Controls
    prChartPeriod: document.getElementById('prChartPeriod'),
    trainingChartPeriod: document.getElementById('trainingChartPeriod'),
    gripAgeChartPeriod: document.getElementById('gripAgeChartPeriod'),
    toggleCorrelationBtn: document.getElementById('toggleCorrelationBtn'),
    
    // Activity
    activityList: document.getElementById('activityList'),
    prCountBadge: document.getElementById('prCountBadge'),
    trainingCountBadge: document.getElementById('trainingCountBadge'),
    
    // Buttons
    addPRBtn: document.getElementById('addPRBtn'),
    quickLogBtn: document.getElementById('quickLogBtn'),
    viewLeaderboardBtn: document.getElementById('viewLeaderboardBtn'),
    startActivityBtn: document.getElementById('startActivityBtn'),
    logPRBtn: document.getElementById('logPRBtn'),
    logTrainingBtn: document.getElementById('logTrainingBtn'),
    viewProgressBtn: document.getElementById('viewProgressBtn'),
    compareBtn: document.getElementById('compareBtn')
};

// Initialize dashboard
async function initDashboard() {
    try {
        // Check authentication
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = '/auth.html';
            return;
        }
        
        // Load athlete data
        await loadAthleteData();
        
        // Load PR data
        await loadPRData();
        
        // Load training data
        await loadTrainingData();
        
        // Update UI
        updateUserInfo();
        updateStats();
        updateActivity();
        
        // Initialize charts
        initCharts();
        
        // Initialize analysis charts
        initAnalysisCharts();
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('✅ Dashboard initialized');
        
    } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        showError('Failed to load dashboard data');
    }
}

// Load athlete data
async function loadAthleteData() {
    try {
        const response = await apiRequest('GET', '/athlete/profile');
        if (response.success) {
            athleteData = response.data;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading athlete data:', error);
        return false;
    }
}

// Load PR data
async function loadPRData() {
    try {
        const response = await apiRequest('GET', '/athlete/prs');
        if (response.success) {
            prData = response.data.prs || [];
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading PR data:', error);
        return false;
    }
}

// Load training data
async function loadTrainingData() {
    try {
        const response = await apiRequest('GET', '/athlete/training-logs');
        if (response.success) {
            trainingData = response.data.logs || [];
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading training data:', error);
        return false;
    }
}

// Update user info
function updateUserInfo() {
    if (!athleteData) return;
    
    const name = athleteData.displayName || athleteData.name || 'Athlete';
    const rank = athleteData.rank ? `#${athleteData.rank}` : '#--';
    const gripAge = athleteData.gripAge ? `${athleteData.gripAge} mo` : '0 mo';
    const bestHang = athleteData.bestHangTime || '0:00';
    
    // Update elements
    elements.userName.textContent = name;
    elements.sidebarUserName.textContent = name;
    elements.sidebarUserRank.textContent = `Rank: ${rank}`;
    elements.sidebarGripAge.textContent = gripAge;
    elements.sidebarBestHang.textContent = bestHang;
    
    // Update welcome message
    const hour = new Date().getHours();
    let greeting = 'Good ';
    if (hour < 12) greeting += 'morning';
    else if (hour < 18) greeting += 'afternoon';
    else greeting += 'evening';
    
    elements.welcomeTitle.textContent = `${greeting}, ${name.split(' ')[0]}!`;
    
    // Update avatar if available
    if (athleteData.profileImage) {
        elements.userAvatar.src = athleteData.profileImage;
        elements.sidebarAvatar.src = athleteData.profileImage;
    }
}

// Update stats
function updateStats() {
    if (!athleteData) return;
    
    elements.currentRank.textContent = athleteData.rank ? `#${athleteData.rank}` : '#--';
    elements.bestHang.textContent = athleteData.bestHangTime || '0:00';
    elements.gripAge.textContent = athleteData.gripAge ? `${athleteData.gripAge} mo` : '0 mo';
    elements.totalPRs.textContent = athleteData.totalPRs || '0';
    
    // Update badges
    elements.prCountBadge.textContent = athleteData.totalPRs || '0';
    elements.trainingCountBadge.textContent = trainingData.length || '0';
    
    // Update trends (mock data for now)
    updateTrends();
}

// Update trends (mock data)
function updateTrends() {
    // Mock trend data - in production, this would come from API
    const mockTrends = {
        rank: { icon: '↑', text: '+2 spots', positive: true },
        hang: { icon: '↑', text: '+15s', positive: true },
        prs: { icon: '↑', text: '+3 PRs', positive: true }
    };
    
    elements.rankTrendIcon.textContent = mockTrends.rank.icon;
    elements.rankTrendText.textContent = mockTrends.rank.text;
    elements.hangTrendIcon.textContent = mockTrends.hang.icon;
    elements.hangTrendText.textContent = mockTrends.hang.text;
    elements.prTrendIcon.textContent = mockTrends.prs.icon;
    elements.prTrendText.textContent = mockTrends.prs.text;
    
    // Add color classes based on trend
    if (mockTrends.rank.positive) {
        elements.rankTrendIcon.classList.add('positive');
        elements.rankTrendText.classList.add('positive');
    }
    
    if (mockTrends.hang.positive) {
        elements.hangTrendIcon.classList.add('positive');
        elements.hangTrendText.classList.add('positive');
    }
    
    if (mockTrends.prs.positive) {
        elements.prTrendIcon.classList.add('positive');
        elements.prTrendText.classList.add('positive');
    }
}

// Update activity
function updateActivity() {
    if (!prData.length && !trainingData.length) {
        // Show empty state
        return;
    }
    
    // Combine and sort activities by date
    const activities = [
        ...prData.map(pr => ({
            type: 'pr',
            title: 'New Personal Record',
            description: `Hang time: ${pr.hangTime}`,
            date: new Date(pr.attemptDate),
            icon: '🏆'
        })),
        ...trainingData.map(log => ({
            type: 'training',
            title: 'Training Session',
            description: `${log.type} - ${log.duration} min`,
            date: new Date(log.date),
            icon: '💪'
        }))
    ].sort((a, b) => b.date - a.date).slice(0, 5); // Get 5 most recent
    
    // Update activity list
    elements.activityList.innerHTML = '';
    
    if (activities.length === 0) {
        // Show empty state
        elements.activityList.innerHTML = `
            <div class="activity-empty">
                <div class="empty-icon">📊</div>
                <h3 class="empty-title">No activity yet</h3>
                <p class="empty-description">Start by logging your first PR or training session!</p>
                <button class="btn btn-primary" id="startActivityBtn">
                    <span class="btn-icon">+</span>
                    Get Started
                </button>
            </div>
        `;
        return;
    }
    
    activities.forEach(activity => {
        const activityEl = document.createElement('div');
        activityEl.className = 'activity-item';
        activityEl.innerHTML = `
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <h4 class="activity-title">${activity.title}</h4>
                <p class="activity-description">${activity.description}</p>
                <span class="activity-date">${formatDate(activity.date)}</span>
            </div>
            <button class="btn btn-secondary btn-sm activity-action">View</button>
        `;
        elements.activityList.appendChild(activityEl);
    });
}

// Initialize charts
function initCharts() {
    // PR Progression Chart
    const prCtx = document.getElementById('prProgressionChart').getContext('2d');
    elements.prProgressionChart = new Chart(prCtx, {
        type: 'line',
        data: {
            labels: generateDateLabels(30),
            datasets: [{
                label: 'Hang Time (seconds)',
                data: generateMockPRData(30),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Hang Time: ${secondsToTime(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Seconds'
                    },
                    ticks: {
                        callback: function(value) {
                            return secondsToTime(value);
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
    
    // Training Frequency Chart
    const trainingCtx = document.getElementById('trainingFrequencyChart').getContext('2d');
    elements.trainingFrequencyChart = new Chart(trainingCtx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Training Sessions',
                data: [2, 3, 1, 4, 2, 3, 1],
                backgroundColor: '#10b981',
                borderColor: '#10b981',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Sessions'
                    },
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Initialize analysis charts (Grip Age vs Hang Time)
function initAnalysisCharts() {
    // Generate mock data for analysis
    const analysisData = generateGripAgeHangTimeData();
    
    // Calculate correlation and insights
    const correlation = calculateCorrelation(analysisData.hangTimes, analysisData.gripAges);
    const insights = calculateInsights(analysisData);
    
    // Update insight elements
    updateAnalysisInsights(correlation, insights);
    
    // 1. Grip Age vs Hang Time Overlapping Chart
    const gripAgeHangTimeCtx = document.getElementById('gripAgeHangTimeChart').getContext('2d');
    gripAgeHangTimeChart = new Chart(gripAgeHangTimeCtx, {
        type: 'line',
        data: {
            labels: analysisData.labels,
            datasets: [
                {
                    label: 'Hang Time (seconds)',
                    data: analysisData.hangTimes,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Grip Age (months)',
                    data: analysisData.gripAges,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `Hang Time: ${secondsToTime(context.raw)}`;
                            } else {
                                return `Grip Age: ${context.raw} months`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Timeline (Months of Training)',
                        font: {
                            weight: 'bold'
                        }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Hang Time (seconds)',
                        font: {
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            return secondsToTime(value);
                        }
                    },
                    grid: {
                        drawOnChartArea: true
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Grip Age (months)',
                        font: {
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
    
    // 2. Grip Age Distribution Chart
    const gripAgeDistributionCtx = document.getElementById('gripAgeDistributionChart').getContext('2d');
    gripAgeDistributionChart = new Chart(gripAgeDistributionCtx, {
        type: 'doughnut',
        data: {
            labels: ['0-3 months', '3-6 months', '6-12 months', '1-2 years', '2+ years'],
            datasets: [{
                data: [25, 30, 20, 15, 10],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgb(59, 130, 246)',
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)',
                    'rgb(139, 92, 246)',
                    'rgb(239, 68, 68)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
    
    // 3. Hang Time Distribution Chart
    const hangTimeDistributionCtx = document.getElementById('hangTimeDistributionChart').getContext('2d');
    hangTimeDistributionChart = new Chart(hangTimeDistributionCtx, {
        type: 'bar',
        data: {
            labels: ['< 1:00', '1:00-2:00', '2:00-3:00', '3:00-4:00', '4:00+'],
            datasets: [{
                label: 'Athletes',
                data: [40, 30, 15, 10, 5],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgb(59, 130, 246)',
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)',
                    'rgb(139, 92, 246)',
                    'rgb(239, 68, 68)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Percentage of Athletes'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hang Time Ranges'
                    }
                }
            }
        }
    });
}

// Generate grip age vs hang time data
function generateGripAgeHangTimeData() {
    const months = 12; // 12 months of data
    const labels = [];
    const hangTimes = [];
    const gripAges = [];
    
    // Start with base values
    let currentHangTime = 45; // 45 seconds
    let currentGripAge = 1; // 1 month
    
    for (let i = 0; i < months; i++) {
        labels.push(`Month ${i + 1}`);
        gripAges.push(currentGripAge);
        
        // Simulate hang time improvement with some variation
        const improvement = 5 + Math.random() * 10; // 5-15 seconds per month
        currentHangTime += improvement;
        
        // Add some random variation
        const variation = (Math.random() - 0.5) * 10;
        hangTimes.push(Math.max(30, currentHangTime + variation));
        
        currentGripAge++;
    }
    
    return { labels, hangTimes, gripAges };
}

// Calculate correlation between two arrays
function calculateCorrelation(array1, array2) {
    if (array1.length !== array2.length || array1.length < 2) {
        return 0;
    }
    
    const n = array1.length;
    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;
    
    for (let i = 0; i < n; i++) {
        sum1 += array1[i];
        sum2 += array2[i];
        sum1Sq += array1[i] * array1[i];
        sum2Sq += array2[i] * array2[i];
        pSum += array1[i] * array2[i];
    }
    
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
    
    return den === 0 ? 0 : num / den;
}

// Calculate insights from analysis data
function calculateInsights(data) {
    const { hangTimes, gripAges } = data;
    
    // Calculate average improvement per month
    let totalImprovement = 0;
    for (let i = 1; i < hangTimes.length; i++) {
        totalImprovement += hangTimes[i] - hangTimes[i - 1];
    }
    const avgImprovement = totalImprovement / (hangTimes.length - 1);
    
    // Calculate next milestone (3:00 = 180 seconds)
    const currentHangTime = hangTimes[hangTimes.length - 1];
    const targetHangTime = 180; // 3:00
    const monthsToTarget = Math.max(1, Math.ceil((targetHangTime - currentHangTime) / avgImprovement));
    
    // Calculate percentiles (mock data)
    const gripAgePercentile = 75;
    const hangTimePercentile = 60;
    
    return {
        avgImprovement,
        monthsToTarget,
        gripAgePercentile,
        hangTimePercentile,
        currentHangTime,
        targetHangTime
    };
}

// Update analysis insights
function updateAnalysisInsights(correlation, insights) {
    // Format correlation strength
    let correlationStrength = 'Weak';
    let correlationColor = 'text-warning';
    
    if (Math.abs(correlation) > 0.7) {
        correlationStrength = 'Strong';
        correlationColor = 'text-success';
    } else if (Math.abs(correlation) > 0.3) {
        correlationStrength = 'Moderate';
        correlationColor = 'text-info';
    }
    
    elements.correlationStrength.textContent = `${correlationStrength} (${correlation.toFixed(2)})`;
    elements.correlationStrength.className = `insight-value ${correlationColor}`;
    
    // Format average improvement
    elements.avgImprovement.textContent = `+${insights.avgImprovement.toFixed(1)}s/month`;
    
    // Format next milestone
    const targetTime = secondsToTime(insights.targetHangTime);
    elements.nextMilestone.textContent = `${targetTime} at ${insights.monthsToTarget} months`;
    
    // Update percentiles
    elements.gripAgePercentile.textContent = `${insights.gripAgePercentile}th`;
    elements.hangTimePercentile.textContent = `${insights.hangTimePercentile}th`;
}

// Generate date labels
function generateDateLabels(days) {
    const labels = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    return labels;
}

// Generate mock PR data
function generateMockPRData(days) {
    const data = [];
    let currentValue = 60; // Start at 60 seconds
    
    for (let i = 0; i < days; i++) {
        // Add some random variation
        const variation = (Math.random() - 0.5) * 10;
        currentValue = Math.max(30, currentValue + variation);
        
        // Occasionally add a PR improvement
        if (Math.random() > 0.8) {
            currentValue += 5 + Math.random() * 15;
        }
        
        data.push(currentValue);
    }
    
    return data;
}

// Convert seconds to time string (MM:SS)
function secondsToTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Convert time string (MM:SS) to seconds
function timeToSeconds(timeStr) {
    const [mins, secs] = timeStr.split(':').map(Number);
    return mins * 60 + secs;
}

// Format date for display
function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

// Show error message
function showError(message) {
    const errorToast = document.createElement('div');
    errorToast.className = 'error-toast';
    errorToast.innerHTML = `
        <span class="toast-icon">⚠️</span>
        <span class="toast-message">${message}</span>
    `;
    
    document.body.appendChild(errorToast);
    
    // Show toast
    setTimeout(() => {
        errorToast.classList.add('show');
    }, 10);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        errorToast.classList.remove('show');
        setTimeout(() => {
            if (errorToast.parentNode) {
                errorToast.parentNode.removeChild(errorToast);
            }
        }, 300);
    }, 5000);
}

// Set up event listeners
function setupEventListeners() {
    // Chart period controls
    elements.prChartPeriod.addEventListener('change', updatePRChart);
    elements.trainingChartPeriod.addEventListener('change', updateTrainingChart);
    elements.gripAgeChartPeriod.addEventListener('change', updateGripAgeAnalysis);
    
    // Toggle correlation button
    elements.toggleCorrelationBtn.addEventListener('click', toggleCorrelationView);
    
    // Action buttons
    elements.addPRBtn?.addEventListener('click', () => {
        alert('Add PR functionality coming soon!');
    });
    
    elements.quickLogBtn?.addEventListener('click', () => {
        alert('Quick log functionality coming soon!');
    });
    
    elements.viewLeaderboardBtn?.addEventListener('click', () => {
        window.location.href = '/leaderboard.html';
    });
    
    // Quick action buttons
    elements.logPRBtn?.addEventListener('click', () => {
        alert('Log PR functionality coming soon!');
    });
    
    elements.logTrainingBtn?.addEventListener('click', () => {
        alert('Log training functionality coming soon!');
    });
    
    elements.viewProgressBtn?.addEventListener('click', () => {
        alert('View progress functionality coming soon!');
    });
    
    elements.compareBtn?.addEventListener('click', () => {
        alert('Compare functionality coming soon!');
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
                mobileMenu.classList.remove('show');
            }
        });
    }
}

// Update PR chart based on selected period
function updatePRChart() {
    const days = parseInt(elements.prChartPeriod.value);
    const labels = generateDateLabels(days);
    const data = generateMockPRData(days);
    
    elements.prProgressionChart.data.labels = labels;
    elements.prProgressionChart.data.datasets[0].data = data;
    elements.prProgressionChart.update();
}

// Update training chart based on selected period
function updateTrainingChart() {
    const days = parseInt(elements.trainingChartPeriod.value);
    
    // Generate mock training data for the selected period
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = labels.map(() => Math.floor(Math.random() * 5));
    
    elements.trainingFrequencyChart.data.datasets[0].data = data;
    elements.trainingFrequencyChart.update();
}

// Update grip age analysis based on selected period
function updateGripAgeAnalysis() {
    const months = parseInt(elements.gripAgeChartPeriod.value);
    
    // Generate new data for the selected period
    const analysisData = generateGripAgeHangTimeData();
    
    // Update the main chart
    gripAgeHangTimeChart.data.labels = analysisData.labels;
    gripAgeHangTimeChart.data.datasets[0].data = analysisData.hangTimes;
    gripAgeHangTimeChart.data.datasets[1].data = analysisData.gripAges;
    
    // Recalculate insights
    const correlation = calculateCorrelation(analysisData.hangTimes, analysisData.gripAges);
    const insights = calculateInsights(analysisData);
    updateAnalysisInsights(correlation, insights);
    
    gripAgeHangTimeChart.update();
}

// Toggle correlation view
function toggleCorrelationView() {
    const btn = elements.toggleCorrelationBtn;
    const isShowingCorrelation = btn.textContent.includes('Hide');
    
    if (isShowingCorrelation) {
        // Hide correlation line
        btn.innerHTML = '<span class="btn-icon">📊</span> Show Correlation';
        // Remove correlation line from chart if it exists
    } else {
        // Show correlation line
        btn.innerHTML = '<span class="btn-icon">📊</span> Hide Correlation';
        // Add correlation line to chart
    }
    
    // In a real implementation, this would toggle a correlation line on the chart
    alert('Correlation line visualization coming soon!');
}

// Logout function
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('athlete_id');
    window.location.href = '/auth.html';
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initDashboard,
        generateGripAgeHangTimeData,
        calculateCorrelation,
        calculateInsights,
        secondsToTime,
        timeToSeconds
    };
}
