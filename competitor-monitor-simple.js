#!/usr/bin/env node
/**
 * Simple WDHC Competitor Monitoring System
 * No external dependencies - pure Node.js
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

async function searchWeb(term) {
  // Simple web search using DuckDuckGo HTML scrape
  // Note: This is a basic implementation - for production use a proper API
  return new Promise((resolve) => {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(term)}`;
    
    https.get(searchUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Parse HTML for results (simplified)
        const results = parseDuckDuckGoResults(data, term);
        resolve(results);
      });
    }).on('error', (err) => {
      console.error(`Search error for "${term}":`, err.message);
      resolve([]); // Return empty on error
    });
  });
}

function parseDuckDuckGoResults(html, term) {
  const results = [];
  
  // Simple regex parsing (for demonstration)
  // In production, use a proper HTML parser like cheerio
  const titleRegex = /class="result__title".*?>(.*?)<\/a>/g;
  const urlRegex = /class="result__url".*?>(.*?)<\/a>/g;
  
  let titleMatch;
  while ((titleMatch = titleRegex.exec(html)) !== null) {
    const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
    
    // Skip our own site
    if (title.includes('World Dead Hang Championship') || 
        title.includes('WDHC') ||
        title.toLowerCase().includes('world-dead-hang')) {
      continue;
    }
    
    // Check if this looks like a competitor
    if (isCompetitorTitle(title, term)) {
      results.push({
        title: title,
        url: 'https://example.com', // Placeholder
        description: `Found via search: ${term}`,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return results.slice(0, 5); // Return top 5 results
}

function isCompetitorTitle(title, term) {
  const lowerTitle = title.toLowerCase();
  const lowerTerm = term.toLowerCase();
  
  // Check for competitor indicators
  const competitorWords = [
    'championship', 'competition', 'contest', 'league',
    'federation', 'association', 'tournament', 'challenge',
    'record', 'leaderboard', 'rankings', 'contest'
  ];
  
  // Must contain the search term AND a competitor word
  return lowerTitle.includes(lowerTerm) && 
         competitorWords.some(word => lowerTitle.includes(word));
}

async function checkForNewCompetitors() {
  await logMessage('🚀 Starting competitor monitoring check...');
  
  const data = await loadCompetitorData();
  const now = new Date().toISOString();
  data.lastCheck = now;
  
  let newCompetitors = [];
  
  for (const term of SEARCH_TERMS) {
    await logMessage(`📊 Checking: "${term}"`);
    
    try {
      const results = await searchWeb(term);
      
      for (const result of results) {
        // Check if we've seen this competitor before
        const existing = data.competitors.find(c => 
          c.title === result.title || c.url === result.url
        );
        
        if (!existing) {
          // New competitor found!
          const competitor = {
            id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: result.title,
            url: result.url,
            description: result.description,
            firstDetected: now,
            searchTerm: term,
            threatLevel: 'medium',
            lastSeen: now
          };
          
          data.competitors.push(competitor);
          newCompetitors.push(competitor);
          
          await logMessage(`🚨 NEW COMPETITOR FOUND: ${result.title}`);
          await logMessage(`   Via search: ${term}`);
        } else {
          // Update last seen time
          existing.lastSeen = now;
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
      
    } catch (error) {
      await logMessage(`❌ Search failed for "${term}": ${error.message}`);
    }
  }
  
  await saveCompetitorData(data);
  
  // Generate dashboard
  await generateDashboard(data);
  
  await logMessage(`\n✅ Check complete. Found ${newCompetitors.length} new competitors.`);
  await logMessage(`📊 Total competitors in database: ${data.competitors.length}`);
  
  return {
    newCompetitors,
    totalCompetitors: data.competitors.length,
    timestamp: now
  };
}

async function generateDashboard(data) {
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
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            color: #333;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #ddd;
        }
        .header h1 {
            font-size: 28px;
            color: #d4af37;
            margin-bottom: 10px;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .stat-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
            min-width: 200px;
        }
        .stat-value {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }
        .threat-high { color: #e74c3c; }
        .threat-medium { color: #f39c12; }
        .threat-low { color: #27ae60; }
        .competitors {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-top: 20px;
        }
        .competitor-item {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }
        .competitor-item:last-child {
            border-bottom: none;
        }
        .search-terms {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 20px 0;
        }
        .search-term {
            background: #3498db;
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 14px;
        }
        .last-updated {
            text-align: center;
            margin-top: 20px;
            color: #777;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 WDHC Competitor Dashboard</h1>
        <p>Monitoring for emerging dead hang competitors</p>
        <div class="last-updated">Last updated: ${data.lastCheck ? new Date(data.lastCheck).toLocaleString() : 'Never'}</div>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <div>Total Competitors</div>
            <div class="stat-value">${data.competitors.length}</div>
        </div>
        <div class="stat-card">
            <div>New This Week</div>
            <div class="stat-value">${recentCompetitors.length}</div>
        </div>
        <div class="stat-card">
            <div>High Threat</div>
            <div class="stat-value threat-high">${data.competitors.filter(c => c.threatLevel === 'high').length}</div>
        </div>
    </div>
    
    <div class="search-terms">
        ${SEARCH_TERMS.map(term => `<div class="search-term">"${term}"</div>`).join('')}
    </div>
    
    <div class="competitors">
        <h2>Detected Competitors</h2>
        ${data.competitors.length === 0 ? 
          '<p style="text-align: center; padding: 40px; color: #777;">No competitors detected yet. 🎉</p>' : 
          data.competitors.map(competitor => `
            <div class="competitor-item">
                <strong>${competitor.title}</strong><br>
                <small>Found: ${new Date(competitor.firstDetected).toLocaleDateString()} via "${competitor.searchTerm}"</small><br>
                <span class="threat-${competitor.threatLevel}">Threat: ${competitor.threatLevel.toUpperCase()}</span>
            </div>
          `).join('')
        }
    </div>
    
    <div class="last-updated">
        WDHC Competitor Monitoring System • Next automatic check: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}
    </div>
</body>
</html>
  `;
  
  const dashboardPath = path.join(__dirname, 'competitor-dashboard.html');
  await fs.writeFile(dashboardPath, dashboardHtml, 'utf8');
  await logMessage(`📊 Dashboard generated: ${dashboardPath}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    console.log('✅ Competitor monitoring system active.');
    console.log('📋 Monitoring terms:', SEARCH_TERMS.join(', '));
    console.log('📁 Data file:', DATA_FILE);
    console.log('📊 Dashboard: file://' + path.join(__dirname, 'competitor-dashboard.html'));
    return;
  }
  
  if (args.includes('--dashboard')) {
    const data = await loadCompetitorData();
    await generateDashboard(data);
    console.log('📊 Dashboard generated.');
    return;
  }
  
  try {
    const result = await checkForNewCompetitors();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ COMPETITOR MONITORING COMPLETE');
    console.log('='.repeat(50));
    console.log(`New competitors: ${result.newCompetitors.length}`);
    console.log(`Total competitors: ${result.totalCompetitors}`);
    console.log(`Dashboard: file://${path.join(__dirname, 'competitor-dashboard.html')}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}