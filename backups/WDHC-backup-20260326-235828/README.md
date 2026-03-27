# WDHC Workspace Organization

This workspace has been organized into a logical folder structure for better maintainability.

## Folder Structure

### Root Directory (Essential Files)
- `index.html` - Main landing page
- `submit.html` - Submission form
- `about.html` - About page
- `benefits.html` - Benefits page
- `privacy.html` - Privacy policy
- `terms.html` - Terms of service
- `rules.html` - Competition rules
- `CNAME` - Custom domain configuration
- `robots.txt` - Search engine instructions
- `sitemap.xml` - Site map for SEO
- `.wranglerignore` - Cloudflare Workers ignore file

### Organized Folders

#### `scripts/` (64 files)
- All JavaScript files for website functionality
- Includes email automation, leaderboard sync, competitor monitoring, etc.

#### `google-scripts/` (45 files)
- Google Apps Script files for backend automation
- Email automation scripts, form handlers, etc.

#### `drafts/` (42 files)
- Draft HTML pages and experimental versions
- Backup versions, previews, and test pages

#### `automation/` (28 files)
- PowerShell scripts (.ps1) for local automation
- Batch files (.bat) for scheduled tasks
- Task scheduling and monitoring scripts

#### `docs/` (21 files)
- Documentation files (.md)
- Guides, SOPs, setup instructions, and changelogs

#### `media/` (20 files)
- Images, logos, and media assets
- Website graphics and visual elements

#### `backups/` (11 files)
- Backup versions of HTML pages
- Previous live versions and historical backups

#### `tests/` (10 files)
- Test files and experimental scripts
- Debugging and validation scripts

#### `config/` (6 files)
- Configuration files (.json)
- API credentials, Telegram config, competitor alerts

#### `assets/` (2 files)
- PDF files and downloadable assets
- Flyers and promotional materials

#### `data/` (1 file)
- Database file (wdhc.db)
- Local data storage

#### `logs/` (1 file)
- Log files from monitoring systems
- Competitor monitor logs

#### Existing Project Folders
- `athlete-portal/` - Athlete portal system
- `social-proof-system/` - Social proof automation
- `WDHC-athlete-portal/` - Alternative athlete portal

## Benefits of This Organization

1. **Clean Root Directory** - Only essential files remain in root
2. **Logical Grouping** - Files organized by type and purpose
3. **Easy Navigation** - Clear folder structure for quick access
4. **Better Maintenance** - Related files grouped together
5. **Scalability** - Easy to add new files to appropriate folders

## File Movement Summary

- **64 JavaScript files** moved to `scripts/`
- **45 Google Apps Script files** moved to `google-scripts/`
- **42 HTML draft files** moved to `drafts/`
- **28 PowerShell/Batch files** moved to `automation/`
- **21 documentation files** moved to `docs/`
- **6 configuration files** moved to `config/`
- **2 PDF files** moved to `assets/`
- **1 database file** moved to `data/`
- **1 log file** moved to `logs/`
- **1 image file** moved to `media/`

Total files organized: **211+ files**