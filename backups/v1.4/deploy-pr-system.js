#!/usr/bin/env node
// Deployment script for WDHC PR-aware system
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

async function deployPRSystem() {
    console.log('🚀 Deploying WDHC PR-Aware System\n');
    
    // 1. Backup existing files
    console.log('📦 Backing up existing files...');
    const backupDir = path.join(__dirname, 'backups', `pr-system-backup-${Date.now()}`);
    await fs.mkdir(backupDir, { recursive: true });
    
    const filesToBackup = [
        'approve-athlete.js',
        'sync-leaderboard.js',
        'grip-age-email-automation.js'
    ];
    
    for (const file of filesToBackup) {
        const source = path.join(__dirname, file);
        const target = path.join(backupDir, file);
        try {
            await fs.copyFile(source, target);
            console.log(`  ✓ Backed up ${file}`);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.log(`  ⚠️  Could not backup ${file}: ${err.message}`);
            }
        }
    }
    
    // 2. Deploy new files
    console.log('\n🚀 Deploying new PR-aware system...');
    
    const filesToDeploy = [
        {
            source: 'email-automation-pr-complete.js',
            target: 'grip-age-email-automation.js',
            description: 'Email automation with PR tracking'
        },
        {
            source: 'sync-leaderboard-pr.js', 
            target: 'sync-leaderboard.js',
            description: 'Leaderboard sync with PR badge support'
        },
        {
            source: 'approve-athlete-pr.js',
            target: 'approve-athlete.js',
            description: 'Athlete approval with PR badge management'
        }
    ];
    
    for (const file of filesToDeploy) {
        const source = path.join(__dirname, file.source);
        const target = path.join(__dirname, file.target);
        
        try {
            await fs.copyFile(source, target);
            console.log(`  ✓ Deployed ${file.target} (${file.description})`);
        } catch (err) {
            console.error(`  ❌ Failed to deploy ${file.target}: ${err.message}`);
            return false;
        }
    }
    
    // 3. Test the system
    console.log('\n🧪 Testing system components...');
    
    try {
        // Test that files can be required
        const syncLeaderboard = require('./sync-leaderboard.js');
        const approveAthlete = require('./approve-athlete.js');
        
        console.log('  ✓ System modules loaded successfully');
        
        // Check Google Sheets credentials
        const credentialsPath = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
        const credentialsExist = await fs.access(credentialsPath).then(() => true).catch(() => false);
        
        if (credentialsExist) {
            console.log('  ✓ Google Sheets credentials found');
        } else {
            console.log('  ⚠️  Google Sheets credentials not found (expected at: ../credentials/google-service-account.json)');
        }
        
    } catch (err) {
        console.error(`  ❌ System test failed: ${err.message}`);
        return false;
    }
    
    // 4. Create setup instructions
    console.log('\n📋 SETUP INSTRUCTIONS:');
    console.log('='.repeat(50));
    console.log('\n1. GOOGLE APPS SCRIPT SETUP:');
    console.log('   a. Open your WDHC Google Sheet');
    console.log('   b. Go to Extensions > Apps Script');
    console.log('   c. Delete any existing sendWelcomeEmailOnNewRow function');
    console.log('   d. Copy the entire contents of grip-age-email-automation.js');
    console.log('   e. Paste into Apps Script editor and save');
    console.log('   f. Set up trigger: Edit > Current project\'s triggers');
    console.log('   g. Add trigger: sendWelcomeEmailOnNewRow, On form submit');
    
    console.log('\n2. TEST THE SYSTEM:');
    console.log('   a. Make a test submission to the form');
    console.log('   b. Check that email is sent with PR tracking');
    console.log('   c. Check that "PR Badge" column is added to sheet');
    console.log('   d. Run: node approve-athlete.js approve "Test Athlete"');
    console.log('   e. Verify PR badge appears for best time');
    
    console.log('\n3. COLUMNS ADDED TO SHEET:');
    console.log('   - Emailed: Tracks if email was sent');
    console.log('   - Is PR: Marks if submission is personal record');
    console.log('   - Previous Best: Shows athlete\'s previous best time');
    console.log('   - PR Badge: Contains "🏆 PR" for current personal record');
    
    console.log('\n4. HOW PRs WORK:');
    console.log('   - First submission: Gets "First Submission" banner');
    console.log('   - New PR: Gets gold "NEW PERSONAL RECORD" banner + 🏆 badge');
    console.log('   - Non-PR: Shows how far from PR, no badge');
    console.log('   - When new PR is set: Old badge removed, new badge added');
    
    console.log('\n5. COMMAND LINE USAGE:');
    console.log('   Approve athlete: node approve-athlete.js approve "Athlete Name"');
    console.log('   Verify athlete: node approve-athlete.js verify "Athlete Name"');
    console.log('   Sync leaderboard: node sync-leaderboard.js');
    
    console.log('\n✅ Deployment complete! Backup saved to:', backupDir);
    console.log('\n⚠️  IMPORTANT: Test with a few submissions before going live!');
    
    return true;
}

// Run deployment
if (require.main === module) {
    deployPRSystem().then(success => {
        if (success) {
            console.log('\n🎉 PR-aware system deployed successfully!');
            process.exit(0);
        } else {
            console.error('\n❌ Deployment failed.');
            process.exit(1);
        }
    }).catch(err => {
        console.error('❌ Fatal error during deployment:', err);
        process.exit(1);
    });
}

module.exports = { deployPRSystem };