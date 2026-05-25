# Cloudflare API Token Permissions Needed for WDHC Deployment

## Current Token Status
✅ WORKING:
- Token verification
- Account info
- Zone info  
- Account Workers Scripts: Read
- Zone Cache Purge

❌ FAILING (Authentication error 10000):
- List Cloudflare Pages projects
- Access specific Pages project
- Create Cloudflare Pages project

## Root Cause
Your token has **Workers Scripts** permissions but is missing **Cloudflare Pages** permissions.
These are separate permission systems in Cloudflare.

## Required Permissions to Add
Go to: [Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens)

Edit your token: `cfut_F7HDwrOFoj7w9vQEApSSyFSfIZhgaZLOIgoIlc5j47f3ec33`

Under **Permissions**, ADD these exact permissions:

```
Account Settings
  └─ Pages
     └─ Projects
        └─ Edit

Zone Settings  
  └─ Cache
     └─ Purge
```

## Why This Is Needed
The deployment script:
1. `npx wrangler pages deploy . --project-name=world-dead-hang --branch=master`
   - Needs to check if project "world-dead-hang" exists (List Projects: Read)
   - Needs to create/update the project (Projects: Edit)
   - Needs to deploy to the project (Projects: Edit)

2. Cache purge API call
   - Already working (Zone → Cache → Purge)

## Verification After Update
After adding the Page → Projects → Edit permission, run:
```bash
cd /home/milobirk/.hermes/workspace/WDHC && \
CLOUDFLARE_API_TOKEN=cfut_F7HDwrOFoj7w9vQEApSSyFSfIZhgaZLOIgoIlc5j47f3ec33 \
CLOUDFLARE_ACCOUNT_ID=27718be6475e1cbdf906ece646d6ed0e \
node scripts/deploy_and_purge.js
```

Expected output:
```
🌎 Deploying to Cloudflare Pages...
[wrangler output showing deployment]
✅ Deployment successful.

🧹 Purging Edge Cache for worlddeadhang.com...
✅ Cache purged successfully. The live domain is now up to date.
```

## Alternative: Create Token from Scratch
If editing doesn't work, create a new token with:
- Account → Pages → Projects → Edit
- Zone → Cache → Purge
- (Optional) Account → Workers Scripts → Read (if you need it elsewhere)