# WDHC Deployment Guide

## Quick Deploy
```bash
cd /home/milobirk/.hermes/workspace/WDHC
git add index.html
git commit -m "Your message"
git push origin master
```

Cloudflare Pages auto-deploys on GitHub push to `master`.

## Important Rules
- **Deploy branch**: `master` only. Never deploy from `night-shift-autopilot-*`
- **SSH auth only**: CF API tokens (cfat_/cfut_) are READ ONLY — they cannot deploy
- **Always edit drafts first**: Edit `index-draft.html`, then copy to `index.html` after approval
- **Backup before push**: `cp index.html backups/index-$(date +%Y%m%d_%H%M%S).html`

## Site Files
- `index.html` — Leaderboard (main page, 716KB, heavily edited)
- `rules.html` — Rules
- `submit.html` — Submission form (MOCK_MODE=false production, true testing)
- `about.html` — About page
- `benefits.html` — Gym benefits
- `athlete-portal/frontend/` — Mock auth athlete portal

## Mobile-Only Rule
- Any edit to index.html MUST be inside `@media (max-width: 900px)` for mobile
- `@media (min-width: 901px)` for desktop-only
- Never change desktop HTML structure without explicit approval
- Desktop grid: `80px 120px 300px 1.5fr 1fr 140px 120px` (7 columns)

## Git Remote
- Repo: `github.com:milobirk-ux/world-dead-hang`
- SSH auth (permanent key in ~/.ssh/)
- Default branch on deploy: `master`

## Current State (as of 2026-04-01)
- Leaderboard: 13 test athletes
- SVG icons replacing emojis
- Mobile: 5-col grid (Rank | Name | Location | Time | Watch)
- Desktop: 7-col grid (Rank | Tier | Name | Background | Location | Time | Watch)
- Dark theme: gold (#D4AF37), black (#050505)
- Branch name: `master` for deploy, `night-shift-autopilot-*` for Otis's work

## What Otis Handles
- Mobile layout fixes (always @media wrapped)
- SVG icons
- Draft → live pushes
- Backups
- Night Shift automation

## What wdhc Profile Handles
- WDHC-specific tasks delegated by Milo
- Needs to know this deploy workflow
- Should NOT touch desktop styling without explicit instruction
