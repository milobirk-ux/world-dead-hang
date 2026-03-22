// WDHC Telegram Alert System
// Sends alerts when new competitors are detected

const fs = require('fs');
const path = require('path');

class TelegramAlertSystem {
    constructor() {
        this.alertsFile = path.join(__dirname, 'competitor-alerts.json');
        this.configFile = path.join(__dirname, 'telegram-config.json');
        this.loadConfig();
        this.loadAlerts();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                this.config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
            } else {
                // Default config - needs to be filled in
                this.config = {
                    botToken: '', // Your Telegram bot token
                    chatId: '',   // Your Telegram chat ID
                    enabled: false,
                    alertOnNewCompetitor: true,
                    alertOnThreatChange: true,
                    dailySummary: true
                };
                this.saveConfig();
            }
        } catch (error) {
            console.error('Error loading config:', error);
            this.config = {
                botToken: '',
                chatId: '',
                enabled: false,
                alertOnNewCompetitor: true,
                alertOnThreatChange: true,
                dailySummary: true
            };
        }
    }

    loadAlerts() {
        try {
            if (fs.existsSync(this.alertsFile)) {
                this.alertsData = JSON.parse(fs.readFileSync(this.alertsFile, 'utf8'));
            } else {
                this.alertsData = {
                    competitors: [],
                    lastCheck: new Date().toISOString(),
                    searchHistory: {},
                    alertsSent: []
                };
            }
        } catch (error) {
            console.error('Error loading alerts:', error);
            this.alertsData = {
                competitors: [],
                lastCheck: new Date().toISOString(),
                searchHistory: {},
                alertsSent: []
            };
        }
    }

    saveConfig() {
        fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf8');
    }

    saveAlerts() {
        fs.writeFileSync(this.alertsFile, JSON.stringify(this.alertsData, null, 2), 'utf8');
    }

    async sendTelegramMessage(message) {
        if (!this.config.enabled || !this.config.botToken || !this.config.chatId) {
            console.log('Telegram alerts not configured. Message:', message);
            return false;
        }

        try {
            const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.config.chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            const data = await response.json();
            
            if (data.ok) {
                console.log('✅ Telegram alert sent:', message.substring(0, 50) + '...');
                return true;
            } else {
                console.error('❌ Telegram error:', data.description);
                return false;
            }
        } catch (error) {
            console.error('❌ Telegram send failed:', error.message);
            return false;
        }
    }

    checkForNewCompetitors() {
        const newCompetitors = [];
        const updatedCompetitors = [];

        // Check each competitor in alerts data
        this.alertsData.competitors.forEach(competitor => {
            // Check if alert was already sent
            const alertSent = this.alertsData.alertsSent.find(a => 
                a.competitorId === competitor.id && a.type === 'new'
            );

            if (!alertSent) {
                newCompetitors.push(competitor);
            }
        });

        return { newCompetitors, updatedCompetitors };
    }

    async sendNewCompetitorAlert(competitor) {
        const message = `🚨 <b>NEW COMPETITOR DETECTED!</b>

🏆 <b>${competitor.name}</b>
🔗 ${competitor.url}
📝 ${competitor.description}
🔍 Found via: ${competitor.searchTerm}
⚠️ Threat Level: ${competitor.threatLevel.toUpperCase()}
⏰ First seen: ${new Date(competitor.firstDetected).toLocaleDateString()}

<i>View dashboard for details:</i>
file://C:/Users/milob/.openclaw/workspace/WDHC/competitor-dashboard.html`;

        const sent = await this.sendTelegramMessage(message);
        
        if (sent) {
            // Record that alert was sent
            this.alertsData.alertsSent.push({
                competitorId: competitor.id,
                type: 'new',
                timestamp: new Date().toISOString(),
                message: message
            });
            this.saveAlerts();
        }

        return sent;
    }

    async sendDailySummary() {
        const totalCompetitors = this.alertsData.competitors.length;
        const today = new Date().toISOString().split('T')[0];
        
        const todayCompetitors = this.alertsData.competitors.filter(c => 
            c.firstDetected.startsWith(today)
        );

        const message = `📊 <b>WDHC Competitor Daily Summary</b>

📅 ${new Date().toLocaleDateString()}
👥 Total competitors tracked: ${totalCompetitors}
🆕 New today: ${todayCompetitors.length}
🔍 Last check: ${new Date(this.alertsData.lastCheck).toLocaleTimeString()}

${todayCompetitors.length > 0 ? 
`<b>New competitors today:</b>
${todayCompetitors.map(c => `• ${c.name} (${c.threatLevel})`).join('\n')}` : 
'✅ No new competitors detected today.'}

<i>View full dashboard:</i>
file://C:/Users/milob/.openclaw/workspace/WDHC/competitor-dashboard.html`;

        return await this.sendTelegramMessage(message);
    }

    async processAlerts() {
        if (!this.config.enabled) {
            console.log('Telegram alerts are disabled. Enable in config.');
            return;
        }

        const { newCompetitors } = this.checkForNewCompetitors();
        
        console.log(`Found ${newCompetitors.length} new competitors to alert`);

        // Send alerts for new competitors
        for (const competitor of newCompetitors) {
            await this.sendNewCompetitorAlert(competitor);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        }

        // Send daily summary if enabled and it's morning
        if (this.config.dailySummary) {
            const now = new Date();
            if (now.getHours() === 9 && now.getMinutes() < 10) { // Around 9 AM
                await this.sendDailySummary();
            }
        }

        console.log(`✅ Alerts processed. Sent ${newCompetitors.length} new competitor alerts.`);
    }

    // Setup instructions
    printSetupInstructions() {
        console.log(`
🎯 WDHC TELEGRAM ALERT SYSTEM SETUP
====================================

1. CREATE TELEGRAM BOT:
   • Open Telegram, search for @BotFather
   • Send: /newbot
   • Name: WDHC Competitor Monitor
   • Username: WDHCCompetitorBot (or similar)
   • Copy the bot token

2. GET YOUR CHAT ID:
   • Open Telegram, search for @userinfobot
   • Send: /start
   • Copy your Chat ID

3. CONFIGURE SYSTEM:
   • Edit telegram-config.json
   • Add your bot token and chat ID
   • Set enabled: true

4. TEST SYSTEM:
   • Run: node telegram-alert-system.js test
   • You should receive a test message

5. INTEGRATE WITH DAILY CHECK:
   • The system will auto-run with daily checks
   • Alerts sent when new competitors found
   • Daily summary at 9 AM

📁 Files:
   • telegram-config.json - Your credentials
   • telegram-alert-system.js - Alert logic
   • competitor-alerts.json - Competitor data
   • competitor-dashboard.html - Web dashboard

✅ Once configured, you'll get instant alerts when competitors appear!
        `);
    }

    async testSystem() {
        console.log('Testing Telegram alert system...');
        
        if (!this.config.botToken || !this.config.chatId) {
            console.log('❌ Bot token or chat ID not configured.');
            this.printSetupInstructions();
            return false;
        }

        const testMessage = `✅ <b>WDHC Competitor Monitor Test</b>

This is a test message from your WDHC competitor monitoring system.

📅 ${new Date().toLocaleDateString()}
⏰ ${new Date().toLocaleTimeString()}

System status: <b>ACTIVE</b>
Alerts enabled: ${this.config.enabled ? '✅ YES' : '❌ NO'}

<i>You will receive alerts when new competitors are detected.</i>`;

        const sent = await this.sendTelegramMessage(testMessage);
        
        if (sent) {
            console.log('✅ Test message sent successfully!');
            console.log('🎯 System is ready to protect WDHC from competitors.');
        } else {
            console.log('❌ Failed to send test message.');
            console.log('💡 Check your bot token and chat ID.');
        }

        return sent;
    }
}

// Command line interface
async function main() {
    const system = new TelegramAlertSystem();
    const command = process.argv[2];

    switch (command) {
        case 'test':
            await system.testSystem();
            break;
        case 'setup':
            system.printSetupInstructions();
            break;
        case 'process':
            await system.processAlerts();
            break;
        case 'summary':
            await system.sendDailySummary();
            break;
        case 'enable':
            system.config.enabled = true;
            system.saveConfig();
            console.log('✅ Telegram alerts enabled.');
            break;
        case 'disable':
            system.config.enabled = false;
            system.saveConfig();
            console.log('✅ Telegram alerts disabled.');
            break;
        default:
            console.log(`
WDHC Telegram Alert System
Usage: node telegram-alert-system.js [command]

Commands:
  test     - Send test message
  setup    - Show setup instructions
  process  - Process alerts (check & send)
  summary  - Send daily summary
  enable   - Enable alerts
  disable  - Disable alerts

Example:
  node telegram-alert-system.js test
  node telegram-alert-system.js setup
            `);
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TelegramAlertSystem;