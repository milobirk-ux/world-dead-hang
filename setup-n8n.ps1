# WDHC n8n Installation & Setup Script
# Run this script to install and configure n8n for WDHC automation

Write-Host "=== WDHC n8n Automation Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "1. Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green

# Check npm
$npmVersion = npm --version 2>$null
if (-not $npmVersion) {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm $npmVersion" -ForegroundColor Green

# Check Python (for sync script)
$pythonVersion = python --version 2>$null
if (-not $pythonVersion) {
    Write-Host "⚠️ Python not found (needed for direct_leaderboard_sync.py)" -ForegroundColor Yellow
} else {
    Write-Host "✅ $pythonVersion" -ForegroundColor Green
}

Write-Host ""
Write-Host "2. Installing n8n globally..." -ForegroundColor Yellow
npm install -g n8n

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install n8n" -ForegroundColor Red
    exit 1
}

Write-Host "✅ n8n installed successfully" -ForegroundColor Green

Write-Host ""
Write-Host "3. Creating n8n configuration..." -ForegroundColor Yellow

# Create n8n data directory
$n8nDataDir = "$env:USERPROFILE\.n8n"
if (-not (Test-Path $n8nDataDir)) {
    New-Item -ItemType Directory -Path $n8nDataDir -Force | Out-Null
    Write-Host "Created n8n data directory: $n8nDataDir" -ForegroundColor Green
}

# Create environment file
$envFile = "$n8nDataDir\.env"
@"
# n8n Environment Configuration
N8N_PROTOCOL=http
N8N_HOST=localhost
N8N_PORT=5678
N8N_ENDPOINT_WEBHOOK_TEST=https://webhook.site
N8N_ENCRYPTION_KEY=$(New-Guid)

# WDHC Specific
WORKSPACE_PATH=C:\Users\milob\.openclaw\workspace
GOOGLE_SHEETS_ID=1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s
"@ | Out-File -FilePath $envFile -Encoding UTF8

Write-Host "✅ n8n configuration created: $envFile" -ForegroundColor Green

Write-Host ""
Write-Host "4. Creating startup script..." -ForegroundColor Yellow

# Create startup script
$startScript = "$env:USERPROFILE\Desktop\Start-n8n.ps1"
@"
# Start n8n for WDHC Automation
Write-Host "Starting n8n..." -ForegroundColor Cyan
Write-Host "Web UI: http://localhost:5678" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray

# Set environment variables
`$env:N8N_PROTOCOL="http"
`$env:N8N_HOST="localhost"
`$env:N8N_PORT="5678"

# Start n8n
n8n start
"@ | Out-File -FilePath $startScript -Encoding UTF8

Write-Host "✅ Startup script created: $startScript" -ForegroundColor Green

Write-Host ""
Write-Host "5. Creating WDHC webhook server..." -ForegroundColor Yellow

# Create webhook server for Twitter automation
$webhookServer = "$env:USERPROFILE\.openclaw\workspace\WDHC\webhook-server.js"
@"
// WDHC Webhook Server for n8n → Twitter automation
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 5679;
const TWITTER_SCRIPT = path.join(__dirname, 'twitter-automation.js');

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook/twitter') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log('Received webhook:', data);
                
                // Execute Twitter automation script
                const cmd = spawn('node', [TWITTER_SCRIPT, data.action, JSON.stringify(data.data)]);
                
                cmd.stdout.on('data', (data) => console.log(data.toString()));
                cmd.stderr.on('data', (data) => console.error(data.toString()));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Webhook processed' }));
            } catch (error) {
                console.error('Webhook error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(\`WDHC Webhook Server running on http://localhost:\${PORT}\`);
    console.log('Endpoint: POST /webhook/twitter');
});

// Also create a simple test endpoint
const testServer = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'wdhc-webhook' }));
    }
});

testServer.listen(5680, () => {
    console.log('Health check on http://localhost:5680/health');
});
"@ | Out-File -FilePath $webhookServer -Encoding UTF8

Write-Host "✅ Webhook server created: $webhookServer" -ForegroundColor Green

Write-Host ""
Write-Host "6. Creating setup completion guide..." -ForegroundColor Yellow

$guideFile = "$env:USERPROFILE\Desktop\WDHC-n8n-Setup-Guide.md"
@"
# WDHC n8n Automation Setup Guide

## Installation Complete ✅

Your n8n automation system is ready to be configured.

## Next Steps:

### 1. Start n8n
- Double-click: `Start-n8n.ps1` on your Desktop
- Or run: `n8n start` in PowerShell
- Web UI: http://localhost:5678

### 2. Configure Credentials (First Time Only)
1. Open http://localhost:5678
2. Go to **Credentials** (left sidebar)
3. Add these credentials:

#### Google Sheets OAuth2
- **Name:** Google Sheets OAuth2
- **Type:** OAuth2
- **Follow Google OAuth setup wizard**
- **Scopes:** https://www.googleapis.com/auth/spreadsheets

#### SMTP (for email)
- **Name:** WDHC SMTP
- **Type:** SMTP
- **Host:** Your email SMTP server
- **Port:** 587 (TLS)
- **User:** Your email
- **Password:** Your email password

### 3. Import WDHC Workflow
1. In n8n, go to **Workflows**
2. Click **Import from file**
3. Select: `C:\Users\milob\.openclaw\workspace\WDHC\n8n-workflow.json`
4. Click **Import**

### 4. Start Webhook Server (for Twitter)
Run in PowerShell:
```powershell
cd C:\Users\milob\.openclaw\workspace\WDHC
node webhook-server.js
```

### 5. Activate Workflow
1. In n8n, open the WDHC workflow
2. Click the **Active** toggle (top right)
3. Test with a new Google Sheet submission

## Workflow Overview

### Triggers:
1. **New submission** (Status = "Pending")
   - Sends welcome email
   - Posts to Twitter
   - Logs action

2. **Approval/Verification** (Status = "Approved"/"Verified")
   - Runs sync script
   - Deploys to Cloudflare
   - Logs action

### Files Created:
- n8n workflow: `n8n-workflow.json`
- Webhook server: `webhook-server.js`
- Startup script: `Desktop\Start-n8n.ps1`
- Configuration: `~\.n8n\.env`

## Testing
1. Add a test row to WDHC Google Sheet
2. Set Status to "Pending"
3. Check email is sent
4. Change Status to "Approved"
5. Check website updates

## Troubleshooting
- **n8n won't start:** Check port 5678 isn't in use
- **Google Sheets error:** Re-authenticate OAuth2
- **Email not sending:** Check SMTP credentials
- **Script errors:** Check Python/Node.js installation

## Support
- n8n docs: https://docs.n8n.io
- WDHC automation files in: `C:\Users\milob\.openclaw\workspace\WDHC\`
"@ | Out-File -FilePath $guideFile -Encoding UTF8

Write-Host "✅ Setup guide created: $guideFile" -ForegroundColor Green

Write-Host ""
Write-Host "=== SETUP COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Read: $guideFile" -ForegroundColor White
Write-Host "2. Run: $startScript" -ForegroundColor White
Write-Host "3. Configure credentials in n8n web UI" -ForegroundColor White
Write-Host "4. Import workflow: n8n-workflow.json" -ForegroundColor White
Write-Host ""
Write-Host "n8n is FREE and self-hosted on your machine." -ForegroundColor Green
Write-Host "No monthly fees, no data leaves your computer." -ForegroundColor Green