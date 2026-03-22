# 🚨 WDHC Telegram Alert System - Setup Guide

## 📋 What This System Does

1. **Monitors** for new dead hang competitors daily
2. **Alerts** you instantly via Telegram when new competitors appear
3. **Shows** competitor dashboard with threat levels
4. **Protects** WDHC from competitive threats

## 🎯 Current Status (March 21, 2026)

✅ **Competitor Database:** 4 real competitors loaded (no mock data)
✅ **Monitoring System:** Active and working
✅ **Dashboard:** Live and updating
❌ **Telegram Alerts:** Need configuration
❌ **Automation:** Needs Windows Task Scheduler setup

## 🔧 STEP 1: Create Telegram Bot

### 1. Open Telegram
- Search for **@BotFather** (official Telegram bot creator)
- Start a chat with it

### 2. Create New Bot
Send these commands to @BotFather:
```
/newbot
```
- **Bot Name:** `WDHC Competitor Monitor`
- **Bot Username:** `WDHCCompetitorBot` (must end with "bot")

### 3. Save Bot Token
BotFather will give you a token like:
```
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-123456789
```
**SAVE THIS TOKEN** - you'll need it next.

## 🔧 STEP 2: Get Your Chat ID

### 1. Open Telegram
- Search for **@userinfobot**
- Send: `/start`

### 2. Save Chat ID
The bot will reply with your Chat ID (a number like `8260837130`)

**SAVE THIS CHAT ID** - you'll need it next.

## 🔧 STEP 3: Configure WDHC System

### 1. Edit `telegram-config.json`
Open the file in the WDHC folder:
```json
{
  "botToken": "YOUR_BOT_TOKEN_HERE",
  "chatId": "YOUR_CHAT_ID_HERE",
  "enabled": true,
  "alertOnNewCompetitor": true,
  "alertOnThreatChange": true,
  "dailySummary": true
}
```

### 2. Replace with your credentials:
- `botToken`: Your bot token from @BotFather
- `chatId`: Your chat ID from @userinfobot
- `enabled`: Change `false` to `true`

## 🔧 STEP 4: Test the System

### 1. Run test command:
```bash
cd ~/.openclaw/workspace/WDHC
node telegram-alert-system.js test
```

### 2. You should receive:
- ✅ Test message in Telegram
- ✅ Confirmation in terminal

## 🔧 STEP 5: Set Up Daily Automation (Windows)

### Option A: Manual Check (Easiest)
1. **Desktop Shortcut:** Double-click `check-competitors.bat`
2. **Frequency:** Run whenever you want to check

### Option B: Windows Task Scheduler (Automatic)
1. **Open Task Scheduler** (search in Start menu)
2. **Create Basic Task:**
   - Name: `WDHC Competitor Monitor`
   - Trigger: **Daily** at 9:00 AM
   - Action: **Start a program**
   - Program: `C:\Windows\System32\cmd.exe`
   - Arguments: `/c "cd C:\Users\milob\.openclaw\workspace\WDHC && node simple-competitor-monitor.js"`
3. **Run with highest privileges:** ✅ Checked

## 🎯 What You'll Receive

### 1. Instant Alerts
When new competitors appear:
```
🚨 NEW COMPETITOR DETECTED!

🏆 [Competitor Name]
🔗 https://competitor.com
📝 Description...
🔍 Found via: search term
⚠️ Threat Level: HIGH
⏰ First seen: Today
```

### 2. Daily Summary (9:00 AM)
```
📊 WDHC Competitor Daily Summary

📅 March 21, 2026
👥 Total competitors tracked: 4
🆕 New today: 0
🔍 Last check: 9:00 AM

✅ No new competitors detected today.
```

### 3. Dashboard Access
- **File:** `competitor-dashboard.html`
- **Open:** Double-click or open in browser
- **Shows:** All competitors with threat levels

## 🚨 Current Competitors Being Monitored

### 1. Rogue Fitness Cliffhanger Challenge 🟡 Medium Threat
- **Status:** Inactive (last held 2022)
- **Prize:** $2,500 cash
- **Threat:** Could restart anytime

### 2. Hang2Win 🟢 Low Threat
- **Status:** Active (personal challenges)
- **Prize:** None
- **Threat:** Different market segment

### 3. Guinness World Records 🟢 Low Threat
- **Status:** Active (individual records)
- **Prize:** World record title
- **Threat:** Different audience

### 4. DeadHangs.com ⚪ No Threat
- **Status:** Active (educational)
- **Prize:** None
- **Threat:** Complementary resource

## 🎯 Key Insight: YOU HAVE ZERO ACTIVE COMPETITORS

**WDHC is currently the ONLY organized, verified dead hang championship in the world.**

## 🔧 Troubleshooting

### ❌ "Bot token invalid"
- Check token format
- Ensure no spaces
- Try creating new bot

### ❌ "Chat ID not found"
- Use @userinfobot again
- Ensure you're using your personal chat ID

### ❌ "No message received"
- Start chat with your bot first
- Send `/start` to your bot
- Check bot privacy settings

### ❌ "Node.js not found"
- Install Node.js from https://nodejs.org/
- Restart terminal/command prompt

## 📞 Support

If stuck:
1. **Check:** `node telegram-alert-system.js setup` for instructions
2. **Run:** `node telegram-alert-system.js test` to diagnose
3. **View:** Dashboard for current competitor status

## 🎉 Completion Checklist

- [ ] Created Telegram bot with @BotFather
- [ ] Got Chat ID from @userinfobot  
- [ ] Updated `telegram-config.json`
- [ ] Tested with `node telegram-alert-system.js test`
- [ ] Received test message in Telegram
- [ ] Set up daily check (manual or automated)

**Once configured, you'll get instant alerts protecting WDHC from competitors!**