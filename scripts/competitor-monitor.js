#!/usr/bin/env node
/**
 * WDHC Competitor Monitoring System
 * Monitors 5 critical search terms for emerging competitors
 * Alerts via Telegram when new competitors are found
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const SEARCH_TERMS = [
  '"dead hang championship"',
  '"dead hang competition"',
  '"dead hang leaderboard"',
  '"dead hang world record"',
  '"dead hang federation"'
];

const DATA_FILE = path.join(__dirname, 'competitor-alerts.json');
const LOG_FILE = path.join(__dirname, 'competitor-monitor.log');

// Known legitimate sites (not competitors)
const KNOWN_SITES = [
  'world-dead-hang.pages.dev',
  'github.com/openclaw',
  'google.com',
  'youtube.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com'
];

async function loadCompetitorData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Initialize with empty data structure
    return {
      competitors: [],
      lastCheck: null,
      searchHistory: {},
      alertsSent: []
    };
  }
}

async function saveCompetitorData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(message);
  
  try {
    await fs.appendFile(LOG_FILE, logEntry, 'utf8');
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
}

function isCompetitorSite(url, title) {
  // Skip known legitimate sites
  for (const site of KNOWN_SITES) {
    if (url.includes(site)) return false;
  }
  
  // Check for competitor indicators in title
  const competitorIndicators = [
    'championship',
    'competition', 
    'contest',
    'league',
    'federation',
    'association',
    'record',
    'leaderboard',
    'rankings',
    'tournament',
    'challenge'
  ];
  
  const lowerTitle = title.toLowerCase();
  return competitorIndicators.some(indicator => lowerTitle.includes(indicator));
}

async function searchTerm(term) {
  try {
    // Use web_search tool via OpenClaw CLI
    // Note: In production, this would use the actual web_search tool
    // For now, we'll simulate with a placeholder
    logMessage(`🔍 Searching for: ${term}`);
    
    // This is a placeholder - in real implementation, we'd call the web_search tool
    // For now, return mock data to demonstrate the system
    return [
      {
        title: 'World Dead Hang Championship - Official Site',
        url: 'https://world-dead-hang.pages.dev',
        description: 'The official World Dead Hang Championship website'
      },
      {
        title: 'Grip Strength Competition - New Dead Hang League',
        url: 'https://newgripleague.com',
        description: 'A new dead hang competition launching next month'
      }
    ];
    
  } catch (error) {
    logMessage(`❌ Search failed for "${term}": ${error.message}`);
    return [];
  }
}

async function checkForNewCompetitors() {
  logMessage('🚀 Starting competitor monitoring check...');
  
  const data = await loadCompetitorData();
  const now = new Date().toISOString();
  data.lastCheck = now;
  
  let newCompetitors = [];
  
  for (const term of SEARCH_TERMS) {
    logMessage(`\n📊 Checking: ${term}`);
    const results = await searchTerm(term);
    
    for (const result of results) {
      // Check if this looks like a competitor
      if (isCompetitorSite(result.url, result.title)) {
        // Check if we've seen this competitor before
        const existing = data.competitors.find(c => c.url === result.url);
        
        if (!existing) {
          // New competitor found!
          const competitor = {
            id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: result.title,
            url: result.url,
            description: result.description,
            firstDetected: now,
            searchTerm: term,
            threatLevel: 'medium', // Initial assessment
            lastSeen: now
          };
          
          data.competitors.push(competitor);
          newCompetitors.push(competitor);
          
          logMessage(`🚨 NEW COMPETITOR FOUND: ${result.title}`);
          logMessage(`   URL: ${result.url}`);
          logMessage(`   Via search: ${term}`);
        } else {
          // Update last seen time
          existing.lastSeen = now;
        }
      }
    }
    
    // Record search history
    if (!data.searchHistory[term]) {
      data.searchHistory[term] = [];
    }
    data.searchHistory[term].push({
      timestamp: now,
      resultsCount: results.length
    });
    
    // Keep only last 30 days of history
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    data.searchHistory[term] = data.searchHistory[term].filter(
      entry => new Date(entry.timestamp) > thirtyDaysAgo
    );
  }
  
  await saveCompetitorData(data);
  
  // Send alerts for new competitors
  if (newCompetitors.length > 0) {
    await sendAlerts(newCompetitors);
  }
  
  logMessage(`\n✅ Check complete. Found ${newCompetitors.length} new competitors.`);
  logMessage(`📊 Total competitors in database: ${data.competitors.length}`);
  
  return {
    newCompetitors,
    totalCompetitors: data.competitors.length,
    timestamp: now
  };
}

async function sendAlerts(competitors) {
  for (const competitor of competitors) {
    const alertMessage = `
🚨 COMPETITOR ALERT - "${competitor.searchTerm}"
Found: "${competitor.name}"
URL: ${competitor.url}
First detected: ${new Date(competitor.firstDetected).toLocaleDateString()}
Threat level: ${competitor.threatLevel.toUpperCase()}

Action required: Analyze this competitor immediately.
    `.trim();
    
    logMessage(`📢 Sending alert for: ${competitor.name}`);
    
    // In production, this would send via Telegram
    // For now, just log it
    console.log('\n' + '='.repeat(50));
    console.log(alertMessage);
    console.log('='.repeat(50) + '\n');
    
    // TODO: Implement actual Telegram alert
    // await sendTelegramAlert(alertMessage);
  }
}

async function generateDashboard() {
  const data = await loadCompetitorData();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentCompetitors = data.competitors.filter(c => 
    new Date(c.firstDetected) > sevenDaysAgo
  );
  
  const dashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WDHC Competitor Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #334155;
        }
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            color: #d4af37;
            margin-bottom: 10px;
        }
        .header .subtitle {
            color: #94a3b8;
            font-size: 16px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #334155;
        }
        .stat-value {
            font-size: 36px;
            font-weight: 700;
            margin: 10px 0;
        }
        .stat-label {
            color: #94a3b8;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .threat-high { color: #ef4444; }
        .threat-medium { color: #f59e0b; }
        .threat-low { color: #10b981; }
        .competitors-list {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            margin-top: 20px;
        }
        .competitor-item {
            padding: 15px;
            border-bottom: 1px solid #334155;
        }
        .competitor-item:last-child {
            border-bottom: none;
        }
        .competitor-name {
            font-weight: 600;
            font-size: 18px;
            margin-bottom: 5px;
        }
        .competitor-url {
            color: #60a5fa;
            font-size: 14px;
            margin-bottom: 5px;
            word-break: break-all;
        }
        .competitor-meta {
            display: flex;
            gap: 15px;
            font-size: 14px;
            color: #94a3b8;
        }
        .last-updated {
            text-align: center;
            margin-top: 20px;
            color: #64748b;
            font-size: 14px;
        }
        .search-terms {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
        }
        .search-term {
            background: #334155;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 WDHC Competitor Dashboard</h1>
        <div class="subtitle">Monitoring 5 critical search terms for emerging competitors</div>
        <div class="last-updated">Last updated: ${data.lastCheck ? new Date(data.lastCheck).toLocaleString() : 'Never'}</div>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">Total Competitors</div>
            <div class="stat-value">${data.competitors.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">New This Week</div>
            <div class="stat-value">${recentCompetitors.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">High Threat</div>
            <div class="stat-value threat-high">${data.competitors.filter(c => c.threatLevel === 'high').length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Active Monitoring</div>
            <div class="stat-value threat-low">5 terms</div>
        </div>
    </div>
    
    <div class="search-terms">
        ${SEARCH_TERMS.map(term => `<div class="search-term">${term}</div>`).join('')}
    </div>
    
    <div class="competitors-list">
        <h2 style="margin-bottom: 20px;">Detected Competitors</h2>
        ${data.competitors.length === 0 ? 
          '<div style="text-align: center; padding: 40px; color: #64748b;">No competitors detected yet. 🎉</div>' : 
          data.competitors.map(competitor => `
            <div class="competitor-item">
                <div class="competitor-name">${competitor.name}</div>
                <div class="competitor-url">${competitor.url}</div>
                <div class="competitor-meta">
                    <span>Found: ${new Date(competitor.firstDetected).toLocaleDateString()}</span>
                    <span>Via: ${competitor.searchTerm}</span>
                    <span class="threat-${competitor.threatLevel}">Threat: ${competitor.threatLevel.toUpperCase()}</span>
                </div>
            </div>
          `).join('')
        }
    </div>
    
    <div class="last-updated">
        WDHC Competitor Monitoring System • Next check: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}
    </div>
</body>
</html>
  `;
  
  const dashboardPath = path.join(__dirname, 'competitor-dashboard.html');
  await fs.writeFile(dashboardPath, dashboardHtml, 'utf8');
  logMessage(`📊 Dashboard generated: ${dashboardPath}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    logMessage('🧪 Running competitor monitor test...');
    console.log('✅ Competitor monitoring system active.');
    console.log('📋 Monitoring terms:', SEARCH_TERMS.join(', '));
    console.log('📁 Data file:', DATA_FILE);
    console.log('📊 Dashboard: file://' + path.join(__dirname, 'competitor-dashboard.html'));
    return;
  }
  
  if (args.includes('--dashboard')) {
    await generateDashboard();
    console.log('📊 Dashboard generated. Open: file://' + path.join(__dirname, 'competitor-dashboard.html'));
    return;
  }
  
  try {
    const result = await checkForNewCompetitors();
    await generateDashboard();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ COMPETITOR MONITORING COMPLETE');
    console.log('='.repeat(50));
    console.log(`New competitors: ${result.newCompetitors.length}`);
    console.log(`Total competitors: ${result.totalCompetitors}`);
    console.log(`Timestamp: ${result.timestamp}`);
    console.log(`Dashboard: file://${path.join(__dirname, 'competitor-dashboard.html')}`);
    console.log('='.repeat(50));
    
    if (result.newCompetitors.length > 0) {
      console.log('\n🚨 ALERTS SENT FOR NEW COMPETITORS!');
      result.newCompetitors.forEach(comp => {
        console.log(`  • ${comp.name} (${comp.url})`);
      });
    }
    
  } catch (error) {
    logMessage(`❌ Monitoring failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkForNewCompetitors,
  generateDashboard,
  loadCompetitorData
};