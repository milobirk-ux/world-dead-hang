# WDHC Website - Version 1.1 Backup
**Backup Date:** March 18, 2026 - 22:20 EDT
**Live Site:** https://e3858c3e.world-dead-hang.pages.dev

## Version Features

### Desktop Layout (Fixed)
- **Title:** Two-line layout
  - Line 1: "World Dead Hang" (World in gold, Dead Hang in white)
  - Line 2: "CHAMPIONSHIP" (gold)
- **Font Size:** 7rem (decreased from 7.5rem)
- **CSS Fix:** `white-space: nowrap` to prevent line breaks

### Mobile Layout
- **Title:** Three-line layout
  - Line 1: "WORLD"
  - Line 2: "DEAD HANG"
  - Line 3: "CHAMPIONSHIP"
- **Font Size:** 3.5rem (increased from 3rem)
- **CSS:** Mobile-specific media query at `max-width: 900px`

### Key Fixes in This Version
1. **UTF-8 Encoding:** All emojis and symbols fixed (flags, checkmarks, lightning bolts)
2. **Country Flags:** Correct flag emojis restored (was showing all Japan flags)
3. **PR Badge:** Border and background removed as requested
4. **Gender Label:** Added margin-top for better spacing
5. **Watch Button:** Fixed cutoff on mobile (increased column width)

### Technical Details
- **HTML File:** `index.html` (76,191 bytes)
- **JavaScript Files:**
  - `grip-age-email-automation.js` (14,178 bytes)
  - `approve-athlete.js` (3,510 bytes)
  - `deploy_and_purge.js` (1,655 bytes)
- **Data:** `data.json` (3,743 bytes)
- **Media:** `media/` folder with logos and assets

### Deployment
- **Provider:** Cloudflare Pages
- **Deployment Command:** `npx wrangler pages deploy . --commit-dirty=true`
- **Git Repository:** https://github.com/milobirk-ux/world-dead-hang

### Notes
- This version represents the stable state after multiple layout fixes
- Desktop and mobile layouts are now optimized for their respective screen sizes
- All UTF-8 symbols display correctly across all browsers
- The site is fully responsive and passes accessibility checks