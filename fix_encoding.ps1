# Fix UTF-8 encoding for WDHC website
# This script will fix all corrupted UTF-8 symbols in index.html

# Create backup
Copy-Item index.html index.html.backup2 -Force

# Read the file as UTF-8 (with BOM to ensure proper encoding)
$content = Get-Content index.html -Encoding UTF8 -Raw

# Fix all corrupted symbols in the marquee banner
$content = $content -replace 'ðŸŒ', '🌍'
$content = $content -replace 'â€”', '—'
$content = $content -replace 'â±ï¸', '⚡'
$content = $content -replace 'ðŸ’ª', '💪'
$content = $content -replace 'âš¡', '⚡'

# Fix checkmark and lightning bolt in template literals
# These might appear as literal '?' or other corrupted forms
$content = $content -replace 'verified-badge.*?>\?<', 'verified-badge" title="Pro-Level Verification">✓<'
$content = $content -replace 'pr-val.*?>\? ', 'pr-val">⚡ '

# Fix flag emojis in getCountryFlag function
$content = $content -replace "'\?\?\?\?'", "'🇺🇸'"
$content = $content -replace "'\?\?\?\?'", "'🇬🇧'"
$content = $content -replace "'\?\?\?\?'", "'🇨🇦'"
$content = $content -replace "'\?\?\?\?'", "'🇲🇽'"
$content = $content -replace "'\?\?\?\?'", "'🇩🇪'"
$content = $content -replace "'\?\?\?\?'", "'🇫🇷'"
$content = $content -replace "'\?\?\?\?'", "'🇦🇺'"
$content = $content -replace "'\?\?\?\?'", "'🇯🇵'"
$content = $content -replace "'\?\?'", "'🌍'"

# Fix athlete country data
$content = $content -replace '"country": "\?\?\?\?",', '"country": "🇺🇸",'

# Save with proper UTF-8 encoding with BOM
$utf8WithBom = [System.Text.Encoding]::UTF8
$bytes = $utf8WithBom.GetBytes($content)
# Add BOM: EF BB BF
$bom = [byte[]]@(0xEF, 0xBB, 0xBF)
$bytesWithBom = $bom + $bytes
[System.IO.File]::WriteAllBytes("index.html", $bytesWithBom)

Write-Host "✅ Encoding fixed! All UTF-8 symbols should now display correctly." -ForegroundColor Green