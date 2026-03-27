const { execSync } = require('child_process');

// Fill these in from the Cloudflare Dashboard
const ZONE_ID = 'ENTER_YOUR_ZONE_ID_HERE';
const API_TOKEN = 'ENTER_YOUR_API_TOKEN_HERE';

async function deployAndPurge() {
  try {
    console.log('🌎 Deploying to Cloudflare Pages...');
    
    // 1. Run the Wrangler Deploy Command
    execSync('npx wrangler pages deploy . --project-name=world-dead-hang --branch=master', { stdio: 'inherit', cwd: __dirname });
    
    console.log('\n✅ Deployment successful.');

    // If credentials aren't set, skip purge
    if (ZONE_ID.includes('ENTER_YOUR') || API_TOKEN.includes('ENTER_YOUR')) {
      console.log('⚠️  Skipping cache purge: Zone ID or API Token not configured.');
      console.log('   Please edit deploy_and_purge.js to enable auto-purging.');
      return;
    }

    console.log('🧹 Purging Edge Cache for worlddeadhang.com...');
    
    // 2. Call Cloudflare API to Purge Everything
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({ purge_everything: true })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Cache purged successfully. The live domain is now up to date.');
    } else {
      console.error('❌ Cache purge failed:');
      console.error(data.errors);
    }

  } catch (error) {
    console.error('\n❌ Deployment or Purge failed:', error.message);
    process.exit(1);
  }
}

deployAndPurge();
