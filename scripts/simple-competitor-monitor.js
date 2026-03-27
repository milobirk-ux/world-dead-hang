#!/usr/bin/env node
/**
 * Simple WDHC Competitor Monitor
 * Working version without complex HTML generation
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'competitor-alerts.json');
const DASHBOARD_FILE = path.join(__dirname, 'competitor-dashboard.html');

// Real competitor data (loaded from competitor-alerts.json)
// This monitor just updates the dashboard with existing data

async function loadCompetitorData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
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

async function updateDashboard(data) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WDHC Competitor Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #0f172a;
            color: white;
            padding: 20px;
            margin: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #334155;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #1e293b;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #334155;
        }
        .stat-value {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #94a3b8;
            font-size: 14px;
        }
        .competitor-list {
            display: grid;
            gap: 15px;
        }
        .competitor-card {
            background: #1e293b;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid;
        }
        .competitor-card.high { border-color: #ef4444; }
        .competitor-card.medium { border-color: #f59e0b; }
        .competitor-card.low { border-color: #10b981; }
        .competitor-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .competitor-url {
            color: #60a5fa;
            text-decoration: none;
        }
        .competitor-description {
            color: #cbd5e1;
            margin: 10px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #334155;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>WDHC Competitor Dashboard</h1>
        <p>Last updated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <div class="stat-value">${data.competitors.length}</div>
            <div class="stat-label">Total Competitors</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.competitors.filter(c => c.threatLevel === 'high').length}</div>
            <div class="stat-label">High Threat</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.competitors.filter(c => c.threatLevel === 'medium').length}</div>
            <div class="stat-label">Medium Threat</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}</div>
            <div class="stat-label">Last Check</div>
        </div>
    </div>
    
    <div class="competitor-list">
        ${data.competitors.length === 0 ? 
          '<p style="text-align: center; color: #94a3b8;">✅ No competitors detected yet.</p>' :
          data.competitors.map(comp => `
            <div class="competitor-card ${comp.threatLevel}">
                <div class="competitor-name">${comp.name}</div>
                <a href="${comp.url}" class="competitor-url" target="_blank">${comp.url}</a>
                <div class="competitor-description">${comp.description}</div>
                <div style="color: #94a3b8; font-size: 12px;">
                    Threat: ${comp.threatLevel.toUpperCase()} | 
                    First seen: ${new Date(comp.firstDetected).toLocaleDateString()}
                </div>
            </div>
          `).join('')
        }
    </div>
    
    <div class="footer">
        <p>WDHC Competitor Monitoring System • Automatic daily checks</p>
        <p>Telegram alerts available when configured</p>
    </div>
</body>
</html>`;

  await fs.writeFile(DASHBOARD_FILE, html, 'utf8');
  console.log('✅ Dashboard updated');
}

async function main() {
  console.log('🔍 WDHC Competitor Monitor');
  console.log('==========================');
  
  // Load existing data
  const data = await loadCompetitorData();
  
  console.log(`📊 Total competitors tracked: ${data.competitors.length}`);
  
  // Show current competitors
  if (data.competitors.length > 0) {
    console.log('\n🏆 Current Competitors:');
    data.competitors.forEach(comp => {
      const threatEmoji = comp.threatLevel === 'high' ? '🔴' : 
                         comp.threatLevel === 'medium' ? '🟡' : '🟢';
      console.log(`   ${threatEmoji} ${comp.name} (${comp.threatLevel})`);
    });
  } else {
    console.log('✅ No competitors detected in market');
  }
  
  // Update last check time
  data.lastCheck = new Date().toISOString();
  
  // Save updated data
  await saveCompetitorData(data);
  
  // Update dashboard
  await updateDashboard(data);
  
  console.log('\n✅ Monitoring complete');
  console.log(`📊 Total competitors tracked: ${data.competitors.length}`);
  console.log(`📁 Dashboard: file://${DASHBOARD_FILE}`);
  
  // Check Telegram config
  try {
    const telegramConfig = await fs.readFile(path.join(__dirname, 'telegram-config.json'), 'utf8');
    const config = JSON.parse(telegramConfig);
    if (config.enabled && config.botToken && config.chatId) {
      console.log('✅ Telegram alerts: CONFIGURED');
      console.log('💡 Run: node telegram-alert-system.js process (to send alerts)');
    } else {
      console.log('⚠️  Telegram alerts: NOT CONFIGURED');
      console.log('   Run: node telegram-alert-system.js setup');
    }
  } catch (error) {
    console.log('⚠️  Telegram config not found');
    console.log('   Run: node telegram-alert-system.js setup');
  }
}

if (require.main === module) {
  main().catch(console.error);
}