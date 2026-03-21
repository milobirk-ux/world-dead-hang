#!/usr/bin/env node
// Test script for WDHC PR-aware system
const fs = require('fs').promises;
const path = require('path');

async function testPRSystem() {
    console.log('🧪 Testing WDHC PR-Aware System\n');
    
    let allTestsPassed = true;
    
    // Test 1: Check if all required files exist
    console.log('1. Checking file structure...');
    const requiredFiles = [
        'approve-athlete.js',
        'sync-leaderboard.js', 
        'grip-age-email-automation.js'
    ];
    
    for (const file of requiredFiles) {
        const filePath = path.join(__dirname, file);
        try {
            await fs.access(filePath);
            console.log(`  ✓ ${file} exists`);
            
            // Check if it's the PR-aware version
            const content = await fs.readFile(filePath, 'utf8');
            if (content.includes('PR Badge') || content.includes('prBadge') || content.includes('Is PR')) {
                console.log(`    → Contains PR-aware code`);
            } else {
                console.log(`    ⚠️  May not be PR-aware version`);
                allTestsPassed = false;
            }
        } catch (err) {
            console.log(`  ❌ ${file} missing: ${err.message}`);
            allTestsPassed = false;
        }
    }
    
    // Test 2: Check Google Sheets credentials
    console.log('\n2. Checking credentials...');
    const credentialsPath = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
    try {
        await fs.access(credentialsPath);
        const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
        
        if (credentials.client_email && credentials.private_key) {
            console.log('  ✓ Google Sheets credentials valid');
        } else {
            console.log('  ❌ Google Sheets credentials incomplete');
            allTestsPassed = false;
        }
    } catch (err) {
        console.log(`  ❌ Google Sheets credentials not found: ${err.message}`);
        console.log('    Expected at: ../credentials/google-service-account.json');
        allTestsPassed = false;
    }
    
    // Test 3: Check module loading
    console.log('\n3. Testing module loading...');
    try {
        // Try to require the modules
        const syncLeaderboard = require('./sync-leaderboard.js');
        const approveAthlete = require('./approve-athlete.js');
        
        console.log('  ✓ Modules load successfully');
        
        // Check if they have the expected functions
        if (typeof syncLeaderboard.syncLeaderboard === 'function') {
            console.log('    → syncLeaderboard function exists');
        }
        if (typeof approveAthlete.approveAthlete === 'function') {
            console.log('    → approveAthlete function exists');
        }
        
    } catch (err) {
        console.log(`  ❌ Module loading failed: ${err.message}`);
        allTestsPassed = false;
    }
    
    // Test 4: Check email automation script structure
    console.log('\n4. Checking email automation script...');
    try {
        const emailScript = await fs.readFile(path.join(__dirname, 'grip-age-email-automation.js'), 'utf8');
        
        const checks = [
            { name: 'PR tracking', check: emailScript.includes('Is PR') || emailScript.includes('prCol') },
            { name: 'PR badge column', check: emailScript.includes('PR Badge') || emailScript.includes('prBadgeColIndex') },
            { name: 'Previous best tracking', check: emailScript.includes('Previous Best') || emailScript.includes('previousBestCol') },
            { name: 'sendWelcomeEmailOnNewRow function', check: emailScript.includes('function sendWelcomeEmailOnNewRow') },
            { name: 'PR message templates', check: emailScript.includes('NEW PERSONAL RECORD') || emailScript.includes('FIRST SUBMISSION') }
        ];
        
        for (const check of checks) {
            if (check.check) {
                console.log(`  ✓ ${check.name}`);
            } else {
                console.log(`  ❌ ${check.name} missing`);
                allTestsPassed = false;
            }
        }
        
    } catch (err) {
        console.log(`  ❌ Could not read email script: ${err.message}`);
        allTestsPassed = false;
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    if (allTestsPassed) {
        console.log('✅ All tests passed! PR-aware system is ready.');
        console.log('\nNext steps:');
        console.log('1. Copy grip-age-email-automation.js to Google Apps Script');
        console.log('2. Set up trigger for sendWelcomeEmailOnNewRow function');
        console.log('3. Test with a form submission');
        console.log('4. Run: node approve-athlete.js approve "Test Athlete"');
    } else {
        console.log('❌ Some tests failed. Please check the issues above.');
        console.log('\nRun the deployment script first:');
        console.log('node deploy-pr-system.js');
    }
    
    return allTestsPassed;
}

// Run tests
if (require.main === module) {
    testPRSystem().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(err => {
        console.error('❌ Test runner error:', err);
        process.exit(1);
    });
}

module.exports = { testPRSystem };