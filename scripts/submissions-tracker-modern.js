                }
            },
            scales: type === 'pie' ? {} : {
                x: {
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        },
        animation: {
            duration: 750,
            easing: 'easeOutQuart'
        }
    };
    
    return baseOptions;
}

// Update charts with data
function updateCharts() {
    if (!state.data || !state.data.timeSeries) return;
    
    const timeSeries = state.data.timeSeries;
    const stats = state.data.stats;
    
    console.log('Updating charts with time series data...');
    
    // Update submissions chart
    if (state.charts.submissions) {
        state.charts.submissions.data.labels = timeSeries.labels;
        state.charts.submissions.data.datasets[0].data = timeSeries.total;
        state.charts.submissions.data.datasets[1].data = timeSeries.verified;
        state.charts.submissions.update('none');
    }
    
    // Update tier chart
    if (state.charts.tier) {
        state.charts.tier.data.datasets[0].data = [
            stats.tierDistribution.freak,
            stats.tierDistribution.legend,
            stats.tierDistribution.elite,
            stats.tierDistribution.challenger
        ];
        state.charts.tier.update('none');
    }
    
    // Update performance chart
    if (state.charts.performance) {
        state.charts.performance.data.labels = timeSeries.labels;
        state.charts.performance.data.datasets[0].data = timeSeries.avgTime;
        state.charts.performance.update('none');
    }
    
    // Update growth chart
    if (state.charts.growth) {
        // Show last 7 days for growth chart
        const last7Days = timeSeries.labels.slice(-7);
        const last7DaysData = timeSeries.total.slice(-7);
        
        state.charts.growth.data.labels = last7Days;
        state.charts.growth.data.datasets[0].data = last7DaysData;
        state.charts.growth.update('none');
    }
    
    console.log('Charts updated successfully');
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Timeframe buttons
    document.querySelectorAll('[data-timeframe]').forEach(button => {
        button.addEventListener('click', (e) => {
            const timeframe = e.target.dataset.timeframe;
            setTimeframe(timeframe);
        });
    });
    
    // Chart type buttons
    document.querySelectorAll('[data-chart]').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.target.dataset.chart;
            setChartType(chartType);
        });
    });
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.filters.search = e.target.value;
            updateTable();
        });
    }
    
    // Tier filter
    const filterTier = document.getElementById('filterTier');
    if (filterTier) {
        filterTier.addEventListener('change', (e) => {
            state.filters.tier = e.target.value;
            updateTable();
        });
    }
    
    // Status filter
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            updateTable();
        });
    }
    
    // Manual refresh button
    const refreshBtn = document.getElementById('manualRefresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            if (state.isRefreshing) return;
            await refreshData();
        });
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + R to refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            if (!state.isRefreshing) {
                refreshData();
            }
        }
        
        // Escape to clear search
        if (e.key === 'Escape' && searchInput) {
            searchInput.value = '';
            state.filters.search = '';
            updateTable();
        }
    });
    
    console.log('Event listeners setup complete');
}

// Set timeframe for charts
function setTimeframe(timeframe) {
    state.currentTimeframe = timeframe;
    
    // Update button states
    document.querySelectorAll('[data-timeframe]').forEach(button => {
        button.classList.toggle('active', button.dataset.timeframe === timeframe);
    });
    
    // Update charts based on timeframe
    if (state.data && state.data.timeSeries) {
        const timeSeries = state.data.timeSeries;
        let labels, totalData, verifiedData;
        
        switch(timeframe) {
            case 'week':
                labels = timeSeries.labels.slice(-7);
                totalData = timeSeries.total.slice(-7);
                verifiedData = timeSeries.verified.slice(-7);
                break;
            case 'month':
                labels = timeSeries.labels;
                totalData = timeSeries.total;
                verifiedData = timeSeries.verified;
                break;
            case 'all':
                // For "all", show aggregated monthly data
                labels = aggregateMonthlyLabels(timeSeries.labels);
                totalData = aggregateMonthlyData(timeSeries.total);
                verifiedData = aggregateMonthlyData(timeSeries.verified);
                break;
        }
        
        if (state.charts.submissions) {
            state.charts.submissions.data.labels = labels;
            state.charts.submissions.data.datasets[0].data = totalData;
            state.charts.submissions.data.datasets[1].data = verifiedData;
            state.charts.submissions.update();
        }
    }
}

// Set chart type
function setChartType(chartType) {
    if (!state.charts.tier) return;
    
    // Update button states
    document.querySelectorAll('[data-chart]').forEach(button => {
        button.classList.toggle('active', button.dataset.chart === chartType);
    });
    
    // Change chart type
    state.charts.tier.config.type = chartType;
    state.charts.tier.update();
}

// Helper functions for data aggregation
function aggregateMonthlyLabels(dailyLabels) {
    // Convert daily labels to monthly labels
    const months = {};
    dailyLabels.forEach((label, index) => {
        const month = label.split(' ')[0]; // Get month abbreviation
        if (!months[month]) {
            months[month] = { label: month, count: 0 };
        }
    });
    
    return Object.values(months).map(m => m.label);
}

function aggregateMonthlyData(dailyData) {
    // Aggregate daily data into monthly totals
    const monthlyData = [];
    let currentMonthTotal = 0;
    
    // This is a simplified version - in reality, you'd need to track actual months
    const monthlyCount = 6; // Show last 6 months
    const dataPerMonth = Math.ceil(dailyData.length / monthlyCount);
    
    for (let i = 0; i < dailyData.length; i++) {
        currentMonthTotal += dailyData[i];
        
        if ((i + 1) % dataPerMonth === 0 || i === dailyData.length - 1) {
            monthlyData.push(currentMonthTotal);
            currentMonthTotal = 0;
        }
    }
    
    return monthlyData;
}

// Export data function
function exportData(format = 'csv') {
    if (!state.data) return;
    
    const submissions = state.data.submissions;
    let content = '';
    
    if (format === 'csv') {
        // CSV header
        content = 'Athlete,Time,Tier,Grip Age,Country,Status,Date\n';
        
        // CSV rows
        submissions.forEach(sub => {
            const dateStr = sub.date.toISOString().split('T')[0];
            const status = sub.verified ? 'Verified' : 'Pending';
            content += `"${sub.name}","${sub.time}","${sub.tierName}","${sub.gripAge}","${sub.countryName}","${status}","${dateStr}"\n`;
        });
        
        // Create download link
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wdhc-submissions-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } else if (format === 'json') {
        content = JSON.stringify(state.data, null, 2);
        
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wdhc-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Add export functionality to window for debugging
window.exportWDHCData = exportData;
window.refreshWDHCData = refreshData;
window.getWDHCState = () => state;

console.log('WDHC Modern Dashboard JavaScript loaded');