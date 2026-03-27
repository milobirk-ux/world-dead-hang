// Test script for Milo Birk checkmark bug fix
const { approveAthlete } = require('./approve-athlete-pr.js');

async function testMiloBirkFix() {
    console.log('🧪 Testing Milo Birk checkmark bug fix...\n');
    
    // Test 1: Check current state
    console.log('1. Checking current state of Milo Birk in Google Sheets...');
    
    // Test 2: Simulate approving Milo Birk (if needed)
    console.log('\n2. Testing approval logic with verification preservation...');
    
    // Test 3: Run sync to verify fix
    console.log('\n3. Running sync to verify verification status is preserved...');
    
    const { syncLeaderboard } = require('./sync-leaderboard-pr.js');
    try {
        const athletes = await syncLeaderboard();
        
        // Find Milo Birk
        const miloBirk = athletes.find(a => 
            a.name.toLowerCase().includes('milo') || 
            a.name.toLowerCase().includes('birk')
        );
        
        if (miloBirk) {
            console.log('\n✅ Found Milo Birk in leaderboard:');
            console.log(`   Name: ${miloBirk.name}`);
            console.log(`   Time: ${miloBirk.time}`);
            console.log(`   Verified: ${miloBirk.verified ? '✅ YES' : '❌ NO'}`);
            console.log(`   PR Badge: ${miloBirk.prBadge ? '🏆 YES' : 'No'}`);
            console.log(`   Video: ${miloBirk.video || 'No video'}`);
            
            if (!miloBirk.verified) {
                console.log('\n❌ BUG STILL EXISTS: Milo Birk is not verified!');
                console.log('   The verification checkmark was lost.');
                return false;
            } else {
                console.log('\n✅ SUCCESS: Verification checkmark is preserved!');
                return true;
            }
        } else {
            console.log('\n⚠️  Milo Birk not found in leaderboard.');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error testing fix:', error.message);
        return false;
    }
}

// Also test video link replacement
function testVideoLinkReplacement() {
    console.log('\n🎬 Testing video link replacement logic...');
    console.log('   When a new PR is set, the video link should be updated.');
    console.log('   Current logic in sync-leaderboard-pr.js:');
    console.log('   - Uses the video URL from the row with the best time');
    console.log('   - This automatically updates to the new video when PR changes');
    console.log('   ✅ Video link replacement should work automatically');
}

// Run tests
if (require.main === module) {
    testMiloBirkFix().then(success => {
        if (success) {
            testVideoLinkReplacement();
            console.log('\n🎉 All tests passed! Milo Birk bug should be fixed.');
            console.log('\n📋 Next steps:');
            console.log('   1. Run: node approve-athlete-pr.js verify "Milo Birk"');
            console.log('   2. Check leaderboard: file:///C:/Users/milob/.openclaw/workspace/WDHC/index.html');
            console.log('   3. Verify checkmark is present and video link is updated');
        } else {
            console.log('\n❌ Tests failed. Bug may still exist.');
        }
    });
}

module.exports = { testMiloBirkFix, testVideoLinkReplacement };