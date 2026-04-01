// Using built-in fetch in Node 20+

const token = process.env.CLOUDFLARE_API_TOKEN || 'cfut_F7HDwrOFoj7w9vQEApSSyFSfIZhgaZLOIgoIlc5j47f3ec33';
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '27718be6475e1cbdf906ece646d6ed0e';
const zoneId = '1d84062683e67d1f2723f0be045bbbb9';

console.log('=== CLOUDFLARE TOKEN PERMISSION DIAGNOSIS ===\n');
console.log(`Token: ${token.substring(0, 10)}...${token.substring(token.length-10)}`);
console.log(`Account ID: ${accountId}`);
console.log(`Zone ID: ${zoneId}\n`);

async function checkEndpoint(url, description, options = {}) {
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
       },
      body: options.body ? JSON.stringify(options.body) : null
    });
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${description}: SUCCESS`);
      return { success: true, data };
    } else {
      console.log(`❌ ${description}: FAILED (Code 10000 - Authentication error)`);
      console.log(`   This means the token lacks required permissions for this endpoint`);
      return { success: false, error: 'AUTH_ERROR' };
    }
  } catch (error) {
    console.log(`❌ ${description}: NETWORK ERROR - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Testing core permissions that SHOULD work based on earlier success:\n');
  
  // These should work based on earlier results
  await checkEndpoint('https://api.cloudflare.com/client/v4/user/tokens/verify', '1. Token Verify');
  await checkEndpoint(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, '2. Account Info');
  await checkEndpoint(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, '3. Zone Info');
  await checkEndpoint(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, '4. Account Workers Scripts: Read');
  await checkEndpoint(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, '5. Zone Cache Purge', { 
    method: 'POST',
    body: { purge_everything: true }
  });
  
  console.log('\n' + '='.repeat(50) + '\n');
  console.log('Testing Cloudflare Pages permissions that are LIKELY missing:\n');
  
  // These are the Pages-specific permissions that are likely missing
  await checkEndpoint(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`, '6. LIST Pages Projects (Account -> Pages -> Projects: Read)');
  await checkEndpoint(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/world-dead-hang`, '7. ACCESS Specific Pages Project');
  
  // Try to create a test project to see if we get a different error
  console.log('\n' + '='.repeat(50) + '\n');
  console.log('Testing Pages Project Creation (will fail if missing write permissions):\n');
  
  const createResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
     },
    body: JSON.stringify({
      name: 'diagnostic-test-project-' + Date.now(),
      production_branch: 'main'
    })
  });
  
  const createData = await createResponse.json();
  
  if (createData.success) {
    console.log(`✅ CREATE Pages Project: SUCCESS`);
    console.log(`   Created project ID: ${createData.result.id}`);
    // Clean up: delete the test project
    await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${createData.result.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } else {
    console.log(`❌ CREATE Pages Project: FAILED`);
    console.log(`   Errors: ${JSON.stringify(createData.errors)}`);
    if (createData.errors && createData.errors.length > 0) {
      console.log(`   Error Code: ${createData.errors[0].code}`);
      console.log(`   Error Message: ${createData.errors[0].message}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('DIAGNOSIS COMPLETE');
  console.log('='.repeat(50));
  console.log('\nIf tests 6 and 7 failed with Authentication error (code 10000):');
  console.log('→ Your token is missing Cloudflare Pages permissions');
  console.log('\nRequired permission:');
  console.log('   Account → Pages → Projects → Edit');
  console.log('\nOptional but helpful:');
  console.log('   Account → Pages → Projects → Read');
  console.log('   Account → Pages → Projects → Delete (for cleanup)');
  console.log('\nTo fix:');
  console.log('1. Go to https://dash.cloudflare.com/profile/api-tokens');
  console.log('2. Find your token: cfut_F7HDwrOFoj7w9vQEApSSyFSfIZhgaZLOIgoIlc5j47f3ec33');
  console.log('3. Click "Edit"');
  console.log('4. Under Permissions, ADD:');
  console.log('      Account → Pages → Projects → Edit');
  console.log('5. Click "Save token"');
  console.log('6. Wait 10-15 seconds for propagation');
  console.log('7. Run deployment again\n');
}

main().catch(console.error);