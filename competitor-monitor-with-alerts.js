#!/usr/bin/env node
/**
 * WDHC Competitor Monitoring System with Telegram Alerts
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Configuration
const SEARCH_TERMS = [
  'dead hang championship',
  'dead hang competition', 
  'dead hang leaderboard',
  'dead hang world record',
  'dead hang federation'
];

const DATA_FILE = path.join(__dirname, 'competitor-alerts.json');
const LOG_FILE = path.join(__dirname, 'competitor-monitor.log');
const TELEGRAM_CONFIG_FILE = path.join(__dirname, 'telegram-config.json');

// Mock competitors for testing (remove in production)
const MOCK_COMPETITORS = [
  {
    id: 'comp_mock_1',
    name: 'Grip Strength Federation',
    url: 'https://gripfederation.com',
    description: 'New grip strength organization launching competitions',
    threatLevel: 'medium'
  },
  {
    id: 'comp_mock_2', 
    name: 'Dead Hang World Cup',
    url: 'https://deadhangworldcup.com',
    description: 'International dead hang competition series',
    threatLevel: 'high'
  }
];

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

async function loadTelegramConfig() {
  try {
    const data = await fs.readFile(TELEGRAM_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      botToken: '',
      chatId: '',
      enabled: false,
      alertOnNewCompetitor: true
    };
  }
}

async function sendTelegramAlert(competitor, config) {
  if (!config.enabled || !config.botToken || !config.chatId) {
    await logMessage(`Telegram alert not sent (disabled or not configured): ${competitor.name}`);
    return false;
  }

  try {
    const message = `🚨 <b>NEW COMPETITOR DETECTED!</b>

🏆 <b>${competitor.name}</b>
🔗 ${competitor.url}
📝 ${competitor.description}
🔍 Found via: ${competitor.searchTerm || 'monitoring system'}
⚠️ Threat Level: ${competitor.threatLevel.toUpperCase()}
⏰ First seen: ${new Date(competitor.firstDetected).toLocaleDateString()}

<i>View dashboard for details:</i>
file://C:/Users/milob/.openclaw/workspace/WDHC/competitor-dashboard.html`;

    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    
    if (data.ok) {
      await logMessage(`✅ Telegram alert sent: ${competitor.name}`);
      return true;
    } else {
      await logMessage(`❌ Telegram error: ${data.description}`);
      return false;
    }
  } catch (error) {
    await logMessage(`❌ Telegram send failed: ${error.message}`);
    return false;
  }
}

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

function generateCompetitorId() {
  return 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function isCompetitorTitle(title, searchTerm) {
  const titleLower = title.toLowerCase();
  const termLower = searchTerm.toLowerCase();
  
  // Check for competitor indicators
  const competitorIndicators = [
    'competition', 'championship', 'league', 'tournament', 'contest',
    'federation', 'association', 'organization', 'cup', 'series',
    'dead hang', 'grip strength', 'hang time', 'pull up', 'calisthenics'
  ];
  
  // Skip our own site
  if (titleLower.includes('world dead hang') || 
      titleLower.includes('wdhc') ||
      titleLower.includes('world-dead-hang')) {
    return false;
  }
  
  // Check if title contains search term or competitor indicators
  if (titleLower.includes(termLower)) {
    return true;
  }
  
  for (const indicator of competitorIndicators) {
    if (titleLower.includes(indicator) && 
        (titleLower.includes('dead') || titleLower.includes('hang') || titleLower.includes('grip'))) {
      return true;
    }
  }
  
  return false;
}

async function searchWeb(term) {
  // For now, use mock data
  // In production, implement actual web search
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate search delay
  
  // Return mock competitors for testing
  return MOCK_COMPETITORS.map(comp => ({
    ...comp,
    searchTerm: term,
    firstDetected: new Date().toISOString()
  }));
}

async function checkForNewCompetitors(existingData, newResults) {
  const telegramConfig = await loadTelegramConfig();
  const newCompetitors = [];
  const alertsSent = [];
  
  for (const result of newResults) {
    // Check if this competitor already exists
    const existing = existingData.competitors.find(c => 
      c.name === result.name || c.url === result.url
    );
    
    if (!existing) {
      // New competitor found
      const competitor = {
        id: generateCompetitorId(),
        name: result.name,
        url: result.url,
        description: result.description,
        searchTerm: result.searchTerm,
        firstDetected: result.firstDetected,
        threatLevel: result.threatLevel || 'medium',
        lastSeen: new Date().toISOString()
      };
      
      newCompetitors.push(competitor);
      existingData.competitors.push(competitor);
      
      // Send Telegram alert if enabled
      if (telegramConfig.enabled && telegramConfig.alertOnNewCompetitor) {
        const alertSent = await sendTelegramAlert(competitor, telegramConfig);
        if (alertSent) {
          alertsSent.push({
            competitorId: competitor.id,
            type: 'new',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      await logMessage(`🚨 NEW COMPETITOR: ${competitor.name} (${competitor.threatLevel})`);
    } else {
      // Update last seen timestamp
      existing.lastSeen = new Date().toISOString();
    }
  }
  
  // Update alerts sent
  existingData.alertsSent.push(...alertsSent);
  
  return { newCompetitors, alertsSent };
}

async function updateSearchHistory(existingData, term, resultsCount) {
  if (!existingData.searchHistory[term]) {
    existingData.searchHistory[term] = [];
  }
  
  existingData.searchHistory[term].push({
    timestamp: new Date().toISOString(),
    resultsCount: resultsCount
  });
  
  // Keep only last 100 entries per term
  if (existingData.searchHistory[term].length > 100) {
    existingData.searchHistory[term] = existingData.searchHistory[term].slice(-100);
  }
}

async function generateDashboardHTML(data) {
  const template = `
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
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 1px solid #334155;
        }
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #f59e0b, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .header .subtitle {
            color: #94a3b8;
            font-size: 16px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid #334155;
            transition: transform 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-2px);
            border-color: #f59e0b;
        }
        .stat-value {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 5px;
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
        .competitors {
            margin-bottom: 40px;
        }
        .section-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #f8fafc;
        }
        .competitor-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .competitor-card {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #334155;
        }
        .competitor-card.high { border-left: 4px solid #ef4444; }
        .competitor-card.medium { border-left: 4px solid #f59e0b; }
        .competitor-card.low { border-left: 4px solid #10b981; }
        .competitor-name {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #f8fafc;
        }
        .competitor-url {
            color: #60a5fa;
            text-decoration: none;
            font-size: 14px;
            margin-bottom: 10px;
            display: block;
        }
        .competitor-url:hover {
            text-decoration: underline;
        }
        .competitor-description {
            color: #cbd5e1;
            font-size: 14px;
            margin-bottom: 15px;
            line-height: 1.5;
        }
        .competitor-meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #94a3b8;
        }
        .search-history {
            margin-bottom: 40px;
        }
        .search-term {
            margin-bottom: 15px;
        }
        .term-name {
            font-weight: 600;
            margin-bottom: 5px;
            color: #f8fafc;
        }
        .term-stats {
            font-size: 14px;
            color: #94a3b8;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #334155;
            color: #94a3b8;
            font-size: 14px;
        }
        .last-updated {
            color: #f59e0b;
            font-weight: 600;
        }
        .alert-badge {
            display: inline-block;
            background: #ef4444;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>WDHC Competitor Intelligence Dashboard</h1>
        <div class="subtitle">Monitoring the competitive landscape for World Dead Hang Championship</div>
        <div class="last-updated">Last updated: ${new Date(data.lastCheck).toLocaleString()}</div>
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
            <div class="stat-value">${new Date(data.lastCheck).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            <div class="stat-label">Last Check</div>
        </div>
    </div>
    
    <div class="competitors">
        <div class="section-title">
            Active Competitors
            ${data.competitors.filter(c => !data.alertsSent.find(a => a.competitorId === c.id && a.type === 'new')).length > 0 ? 
              `<span class="alert-badge">${data.competitors.filter(c => !data.alertsSent.find(a => a.competitorId === c.id && a.type === 'new')).length} NEW</span>` : ''}
        </div>
        
        ${data.competitors.length === 0 ? 
          '<div style="text-align: center; color: #94a3b8; padding: 40px;">✅ No competitors detected yet. The market is yours!</div>' :
          `<div class="competitor-grid">
            ${data.competitors.map(competitor => `
              <div class="competitor-card ${competitor.threatLevel}">
                <div class="competitor-name">
                  ${competitor.name}
                  ${!data.alertsSent.find(a => a.competitorId === competitor.id && a.type === 'new') ? '<span class="alert-badge">NEW</span>' : ''}
                </div>
                <a href="${competitor.url}" class="competitor-url" target="_blank">${competitor.url}</a>
                <div class="competitor-description">${competitor.description}</div>
                <div class="competitor-meta">
                  <div>Threat: <span class="threat-${competitor.threatLevel}">${competitor.threatLevel.toUpperCase()}</span></div>
                  <div>First seen: ${new Date(competitor.firstDetected).toLocaleDateString()}</div>
                </div>
              </div>
            `).join('')}
          </div>`
        }
    </div>
    
    <div class="search-history">
        <div class="section-title">Search History</div>
        ${Object.entries(data.searchHistory).map(([term, history]) => `
          <div class="search-term">
            <div class="term-name">"${term}"</div>
            <div class="term-stats">
              Last check: ${history.length > 0 ? new Date(history[history.length - 1].timestamp).toLocaleTimeString() : 'Never'} |
              Results: ${history.length > 0 ? history[history.length - 1].resultsCount : 0} |
              Total checks: ${history.length}
            </div>
          </div>
        `).join('')}
    </div>
    
    <div class="footer">
        <div>WDHC Competitor Monitoring System • Automatic daily checks at 9:00 AM</div>
        <div>Telegram Alerts: ${data.telegramEnabled ? '✅ Enabled' : '❌ Disabled'} • Dashboard updates automatically</div>
    </div>
    
    <script>
        // Auto-refresh every 5 minutes
        setTimeout(() => {
            location.reload();
        }, 5 * 60 * 1000);
        
        // Highlight new competitors
        document.addEventListener('DOMContentLoaded', function() {
            const newCompetitors = document.querySelectorAll('.alert-badge');
            newCompetitors.forEach(badge => {
                badge.parentElement.parentElement.style.animation = 'pulse 2s infinite';
            });
        });
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = \`
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0