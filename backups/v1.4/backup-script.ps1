# WDHC Backup Script
# Usage: .\backup-script.ps1 "version-name"

param(
    [string]$VersionName = $(Get-Date -Format "yyyy-MM-dd-HHmm")
)

$BackupDir = "backups\$VersionName"
$FilesToBackup = @("index.html", "submit.html", "rules.html", "privacy.html", "terms.html")

Write-Host "Creating backup: $VersionName" -ForegroundColor Green
Write-Host "Backup directory: $BackupDir" -ForegroundColor Yellow

# Create backup directory
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

# Copy main HTML files
foreach ($file in $FilesToBackup) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $BackupDir\
        Write-Host "  Copied: $file" -ForegroundColor Cyan
    } else {
        Write-Host "  Skipped (not found): $file" -ForegroundColor Gray
    }
}

# Copy media folder if it exists
if (Test-Path "media") {
    Copy-Item "media" -Destination $BackupDir\ -Recurse
    Write-Host "  Copied: media/ folder" -ForegroundColor Cyan
}

# Create README
$ReadmeContent = @"
# WDHC Backup - $VersionName
**Backup Date:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Git Status:** $(git status --short 2>$null | Out-String).Trim()
**Git Commit:** $(git log --oneline -1 2>$null)

## Files Included
$($FilesToBackup | ForEach-Object { "- $_" } | Out-String)

## Quick Restore
To restore this backup:
1. Copy files from `$BackupDir` to root directory
2. Run: `git add .`
3. Commit: `git commit -m "Restored backup: $VersionName"`
4. Deploy: `npx wrangler pages deploy . --commit-dirty=true`
"@

$ReadmeContent | Out-File -FilePath "$BackupDir\README.md" -Encoding UTF8
Write-Host "  Created: README.md" -ForegroundColor Cyan

Write-Host "`nBackup complete! Files saved to: $BackupDir" -ForegroundColor Green
Write-Host "Total size: $(Get-ChildItem $BackupDir -Recurse | Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum | ForEach-Object { [math]::Round($_/1KB, 2) }) KB" -ForegroundColor Yellow