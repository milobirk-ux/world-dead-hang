// Using built-in fetch in Node 20+

const token = process.env.CLOUDFLARE_API_TOKEN || 'cfut_F7HDwrOFoj7w9vQEApSSyFSfIZhgaZLOIgoIlc5j47f3ec33';
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '27718be6475e1cbdf906ece646d6ed0e';
const zoneId = '1d84062683e67d1f2723f0be045bbbb9';

console.log('Checking Cloudflare API Token Permissions...\n');

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
      return true;
    } else {
      console.log(`❌ ${description}: FAILED`);
      console.log(`   Errors: ${JSON.stringify(data.errors)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: ERROR - ${error.message}`);
    return false;
  }
}

async function main() {
  // Test 1: Token verification
  await checkEndpoint('https://api.cloudflare.com/client/v4/user/tokens/verify', 'Token Verify');
  
  // Test 2: Account info
  await checkEndpoint(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, 'Account Info');
  
  // Test 3: Zone info (should work based on earlier test)
  await checkEndpoint(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, 'Zone Info');
  
  // Test 4: Account Workers Scripts: Read (required for Pages)
  await checkEndpoint(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, 'Account Workers Scripts: Read');
  
  // Test 5: Cloudflare Pages: List Projects (what's failing)
  await checkEndpoint(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`, 'Cloudflare Pages: List Projects');
  
  // Test 6: Cloudflare Pages: Create Project (what deploy might need to do if project doesn't exist)
  // We'll test with a dummy name that likely doesn't exist
  await checkEndpoint(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`, 'Cloudflare Pages: Create Project', {
    method: 'POST',
    body: {
      name: 'test-project-dont-delete-me-12345',
      production_branch: 'main'
    }
  });
  
  // Test 7: Check specific project (what deploy tries to access)
  await checkEndpoint(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/world-dead-hang`, 'Access Pages Project');
  
  // Test 8: Cache purge (the second part of deploy)
  await checkEndpoint(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, 'Cache Purge Endpoint', { 
    method: 'POST',
    body: { purge_everything: true }
  });
}

main().catch(console.error);