// Using built-in fetch in Node 20+

const token = process.env.CLOUDFLARE_API_TOKEN || 'cfut_F7HDwrOFoj7w9vQEApSSyFSfIZhgaZLOIgoIlc5j47f3ec33';
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '27718be6475e1cbdf906ece646d6ed0e';

console.log('Testing Pages Project Creation...\n');

async function testCreateProject() {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`;
  const data = {
    name: 'world-dead-hang',
    production_branch: 'main'
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
       },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Create Pages Project: SUCCESS`);
      console.log(`   Project ID: ${result.result.id}`);
      return true;
    } else {
      console.log(`❌ Create Pages Project: FAILED`);
      console.log(`   Errors: ${JSON.stringify(result.errors)}`);
      console.log(`   Messages: ${JSON.stringify(result.messages)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Create Pages Project: ERROR - ${error.message}`);
    return false;
  }
}

testCreateProject().catch(console.error);