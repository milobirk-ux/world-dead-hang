# WDHC Version 1.2 Backup
**Backup Date:** March 18, 2026 (01:36 AM EDT)
**Live Site:** https://a18ad182.world-dead-hang.pages.dev

## What This Version Includes

### Header Changes (Latest)
- **Reduced header height:** Vertical padding reduced from 15px to 10px
- **Logo size unchanged:** 40px height
- **Tab text size unchanged:** 0.9rem
- **Horizontal padding unchanged:** 40px

### Challenger Badge Fixes (Multiple Attempts)
- **Final approach:** Using default `.tier-badge` styling (110px width, 0.5px letter-spacing)
- **Previous attempts:** Tried widths 115px, 120px; letter-spacing 0.3px, 0.1px
- **Mobile overrides:** Sidebar/details panel badges: 95px min/max-width

### Mobile UI Improvements
- **Clickable rows:** Mobile users can tap anywhere on row to open/close details
- **Auto-close:** Other details panels close when new one opens
- **Better location text:** Font size 0.9rem, color #888, normal case, font-weight: 500

### Email Automation Scripts
- `final-email-automation.js` - Complete email automation
- `pr-aware-email-automation.js` - PR-aware version

## Files Included
1. `index.html` - Main leaderboard (83189 bytes)
2. `submit.html` - Submission page (20309 bytes)
3. `media/` - All logo and image assets

## CSS Highlights
- **Header:** `padding: 10px 40px` (reduced from 15px 40px)
- **Challenger badge:** Default styling (no special overrides)
- **Location text:** Improved readability on mobile/desktop
- **Mobile interactions:** Enhanced touch experience

## Git Commit Hash
`b1ed558` - "UI: Reduced header height - padding from 15px to 10px (vertical), logo and tab text size unchanged"

## Notes
This backup captures the state after header height reduction while maintaining logo and navigation text size. The Challenger badge uses default styling after multiple centering attempts.