/**
 * WDHC Analytics Dashboard JavaScript
 * Handles data fetching, chart updates, and real-time updates
 */

// Mock data for demonstration
// In production, this would fetch from Google Sheets API or your backend
async function fetchMockData() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate realistic mock data based on current date
    const now = new Date();
    const stats = generateStats(now);
    const charts = generateCharts(now);
    const tables = generateTables();
    
    return {
        stats,
        charts,
        tables,
        lastUpdated: now.toISOString()
    };
}

function generateStats(now) {
    // Base numbers that grow over time
    const daysSinceStart = Math.floor((now - new Date('2026-03-01')) / (1000 * 60 * 60 * 24));
    const baseAthletes = 42 + Math.floor(daysSinceStart * 1.5);
    const baseVerified = Math.floor(baseAthletes * 0.3);
    
    // Add daily variation
    const dailyVariation = Math.sin(daysSinceStart * 0.5) * 3;
    
    return {
        totalAthletes: baseAthletes + Math.floor(dailyVariation),
        verifiedAthletes: baseVerified + Math.floor(dailyVariation * 0.5),
        avgTime: 87.5 + Math.sin(daysSinceStart * 0.3) * 5, // seconds
        countries: 12 + Math.floor(daysSinceStart * 0.1),
        dailyChange: {
            athletes: Math.max(1, Math.floor(Math.random() * 5)),
            verified: Math.max(0, Math.floor(Math.random() * 3)),
            avgTime: (Math.random() > 0.5 ? 1 : -1) * Math.random() * 2,
            countries: Math.random() > 0.8 ? 1 : 0
        }
    };
}

function generateCharts(now) {
    const submissions = generateSubmissionsData(now);
    const tiers = generateTierData();
    const countries = generateCountryData();
    const times = generateTimeData();
    
    return { submissions, tiers, countries, times };
}

function generateSubmissionsData(now) {
    const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monthLabels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
    const allLabels = Array.from({ length: 90 }, (_, i) => `Day ${i + 1}`);
    
    // Generate realistic submission patterns
    const weekData = weekLabels.map(() => Math.floor(Math.random() * 8) + 2);
    const monthData = monthLabels.map(() => Math.floor(Math.random() * 10) + 1);
    const allData = allLabels.map((_, i) => {
        // Simulate growth over time
        const base = 1 + Math.floor(i / 10);
        return Math.floor(Math.random() * (base * 2)) + base;
    });
    
    return {
        week: { labels: weekLabels, data: weekData },
        month: { labels: monthLabels, data: monthData },
        all: { labels: allLabels, data: allData }
    };
}

function generateTierData() {
    return {
        labels: ['Freak', 'Legend', 'Elite', 'Challenger', 'Novice'],
        data: [2, 5, 12, 18, 5],
        colors: ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#94a3b8']
    };
}

function generateCountryData() {
    return {
        labels: ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'Other'],
        data: [25, 8, 6, 5, 3, 5],
        colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#94a3b8']
    };
}

function generateTimeData() {
    // Time distribution in seconds
    const bins = ['<60s', '60-90s', '90-120s', '120-150s', '150-180s', '>180s'];
    return {
        labels: bins,
        data: [8, 15, 12, 5, 1, 1],
        colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#6366f1']
    };
}

function generateTables() {
    const topAthletes = [
        { rank: 1, name: 'Milo Birk', time: 183, tier: 'Freak', country: 'USA', gripAge: 5.2, verified: true },
        { rank: 2, name: 'Alex Chen', time: 176, tier: 'Freak', country: 'Canada', gripAge: 4.8, verified: true },
        { rank: 3, name: 'Sarah Johnson', time: 162, tier: 'Legend', country: 'USA', gripAge: 3.5, verified: true },
        { rank: 4, name: 'James Wilson', time: 158, tier: 'Legend', country: 'UK', gripAge: 4.2, verified: false },
        { rank: 5, name: 'Maria Garcia', time: 152, tier: 'Elite', country: 'Spain', gripAge: 2.8, verified: true },
        { rank: 6, name: 'David Kim', time: 148, tier: 'Elite', country: 'South Korea', gripAge: 3.1, verified: false },
        { rank: 7, name: 'Emma Thompson', time: 142, tier: 'Elite', country: 'Australia', gripAge: 2.5, verified: true },
        { rank: 8, name: 'Michael Brown', time: 138, tier: 'Challenger', country: 'USA', gripAge: 1.8, verified: false },
        { rank: 9, name: 'Lisa Wang', time: 135, tier: 'Challenger', country: 'China', gripAge: 2.2, verified: true },
        { rank: 10, name: 'Robert Miller', time: 132, tier: 'Challenger', country: 'USA', gripAge: 1.5, verified: false }
    ];
    
    const recentSubmissions = [
        { date: '2026-03-21', name: 'John Davis', time: 127, status: 'Approved', country: 'USA' },
        { date: '2026-03-21', name: 'Sophie Martin', time: 118, status: 'Pending', country: 'France' },
        { date: '2026-03-20', name: 'Thomas Lee', time: 142, status: 'Approved', country: 'Canada' },
        { date: '2026-03-20', name: 'Anna Schmidt', time: 156, status: 'Verified', country: 'Germany' },
        { date: '2026-03-19', name: 'Carlos Rodriguez', time: 134, status: 'Approved', country: 'Mexico' },
        { date: '2026-03-19', name: 'Yuki Tanaka', time: 121, status: 'Pending', country: 'Japan' },
        { date: '2026-03-18', name: 'Mohammed Ali', time: 148, status: 'Verified', country: 'Egypt' },
        { date: '2026-03-18', name: 'Elena Petrova', time: 139, status: 'Approved', country: 'Russia' },
        { date: '2026-03-17', name: 'Brian O\'Connor', time: 125, status: 'Approved', country: 'Ireland' },
        { date: '2026-03-17', name: 'Jessica White', time: 131, status: 'Pending', country: 'USA' }
    ];
    
    return { topAthletes, recentSubmissions };
}

// Chart update functions
function updateTierChart(tierData) {
    const ctx = document.getElementById('tierChart').getContext('2d');
    
    if (window.tierChart) {
        window.tierChart.destroy();
    }
    
    window.tierChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: tierData.labels,
            datasets: [{
                data: tierData.data,
                backgroundColor: tierData.colors,
                borderWidth: 2,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#cbd5e1',
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1
                }
            },
            cutout: '60%'
        }
    });
}

function updateCountryChart(countryData) {
    const ctx = document.getElementById('countryChart').getContext('2d');
    
    if (window.countryChart) {
        window.countryChart.destroy();
    }
    
    window.countryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: countryData.labels,
            datasets: [{
                label: 'Athletes',
                data: countryData.data,
                backgroundColor: countryData.colors,
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
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
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function updateTimeChart(timeData) {
    const ctx = document.getElementById('timeChart').getContext('2d');
    
    if (window.timeChart) {
        window.timeChart.destroy();
    }
    
    window.timeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: timeData.labels,
            datasets: [{
                label: 'Athletes',
                data: timeData.data,
                backgroundColor: timeData.colors,
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} athletes`;
                        }
                    }
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
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Table update functions
function updateTables(data) {
    updateTopAthletesTable(data.tables.topAthletes);
    updateRecentSubmissionsTable(data.tables.recentSubmissions);
}

function updateTopAthletesTable(athletes) {
    const tbody = document.getElementById('topAthletesBody');
    tbody.innerHTML = '';
    
    athletes.forEach(athlete => {
        const row = document.createElement('tr');
        
        // Format time
        const timeFormatted = formatTime(athlete.time);
        
        // Get tier class
        const tierClass = `tier-${athlete.tier.toLowerCase()}`;
        
        // Add verified badge if applicable
        const nameDisplay = athlete.verified 
            ? `${athlete.name} <span style="color: #fbbf24; margin-left: 4px;">✓</span>`
            : athlete.name;
        
        row.innerHTML = `
            <td>${athlete.rank}</td>
            <td>${nameDisplay}</td>
            <td>${timeFormatted}</td>
            <td><span class="tier-badge ${tierClass}">${athlete.tier}</span></td>
            <td>${athlete.country}</td>
            <td>${athlete.gripAge.toFixed(1)} years</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Show table and hide loading
    document.getElementById('topAthletesLoading').style.display = 'none';
    document.getElementById('topAthletesTable').style.display = 'table';
}

function updateRecentSubmissionsTable(submissions) {
    const tbody = document.getElementById('recentSubmissionsBody');
    tbody.innerHTML = '';
    
    submissions.forEach(submission => {
        const row = document.createElement('tr');
        
        // Format date
        const date = new Date(submission.date);
        const dateFormatted = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        
        // Format time
        const timeFormatted = formatTime(submission.time);
        
        // Status badge
        let statusBadge;
        switch(submission.status) {
            case 'Verified':
                statusBadge = '<span style="color: #fbbf24; font-weight: bold;">✓ Verified</span>';
                break;
            case 'Approved':
                statusBadge = '<span style="color: #10b981; font-weight: bold;">✓ Approved</span>';
                break;
            case 'Pending':
                statusBadge = '<span style="color: #f59e0b; font-weight: bold;">⏳ Pending</span>';
                break;
            default:
                statusBadge = submission.status;
        }
        
        row.innerHTML = `
            <td>${dateFormatted}</td>
            <td>${submission.name}</td>
            <td>${timeFormatted}</td>
            <td>${statusBadge}</td>
            <td>${submission.country}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Show table and hide loading
    document.getElementById('recentSubmissionsLoading').style.display = 'none';
    document.getElementById('recentSubmissionsTable').style.display = 'table';
}

// Utility functions
function formatTime(seconds) {
    if (!seconds || seconds === 0) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateLastUpdated() {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    
    document.getElementById('lastUpdated').textContent = formatted;
}

function changeTimeframe(timeframe) {
    // Update active button
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    currentTimeframe = timeframe;
    
    // Reload data to update chart
    loadDashboardData();
}

function showError(message) {
    // Simple error display
    alert(`Error: ${message}`);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    // Refresh data every 5 minutes
    setInterval(loadDashboardData, 5 * 60 * 1000);
});