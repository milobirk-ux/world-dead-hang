# WDHC Website Version Log

## Version 1.4 - March 21, 2026 (1:00 AM)
**Changes:**
- **Marquee Border:** Added gold border to top of moving banner to match bottom border (index.html & leaderboard-full.html)
- **Header Compact:** Further reduced vertical header space on desktop (padding: 30px 20px 20px) for more compact layout
- **Desktop Header Size:** Made top header smaller on desktop only (padding: 40px 20px 30px in desktop media query)
- **Mobile Title Bold:** Bolded main text font "WORLD DEAD HANG CHAMPIONSHIP" on mobile only (font-weight: 700)
- **Marquee Speed:** Slowed moving banner speed (40s→50s) and made it truly continuous (animation from -100% to -50%)
- **Header Navigation:** Moved header tabs to right side (opposite logo) with flexbox
- **Marquee Font:** Changed moving banner text to match "GLOBAL STANDINGS" font with gradient effect
- **Title Centering:** Added text-align: center to header on desktop for all main pages
- **Critical Fix:** Restored truncated index.html file (103KB), removed BOM from all HTML files
- **Header Padding:** Fixed header padding (nav: 5px 30px, header: 40px 20px 30px, marquee: 5px 0)
- **UTF-8 Symbols:** Corrected corrupted UTF-8 symbols (📹, ▼, 🌐, 📝) on submission page
- **Search Filter:** Fixed search to respect current category filter
- **Mobile Layout:** Fixed mobile search layout to match original design
- **Flag Fix:** Fixed US flag showing as earth emoji in mobile search
- **Search Bar:** Added search functionality back to mobile view with responsive design
- **Submission Page:** Fixed corrupted UTF-8 symbols (📹, ▼, 🌐, 📝) in "How to upload your video" section

## Version 1.3 - March 20, 2026
**Changes:**
- Initial backup with basic website structure
- Logo implementation across all pages
- Basic responsive design
- Leaderboard functionality
- Submission form
- Rules page

## Backup Protocol
- Always create backup before major changes
- Use next decimal version (1.4 → 1.5 → 1.6, etc.)
- Store in `backups/vX.X/` directory
- Update version_log.md with changes
- Include all website files except `.git` and `backups` directory