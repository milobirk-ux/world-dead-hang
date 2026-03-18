#!/usr/bin/env python3
"""
Brute force fix for UTF-8 encoding issues
"""

def fix_mojibake():
    # Common mojibake patterns and their corrections
    # These are common when UTF-8 is interpreted as Windows-1252
    replacements = {
        # Globe 🌍 (F0 9F 8C 8D) corrupted
        'ðŸŒ': '🌍',
        'Ã°Å¸Å' : '🌍',
        
        # Lightning ⚡ (E2 8F B1) + variation selector (EF B8 8F)
        'â±ï¸': '⚡',
        'Ã¢ÂÂ±Ã¯Â¸Â': '⚡',
        
        # Flex 💪 (F0 9F 92 AA)
        'ðŸ’ª': '💪',
        'Ã°Å¸â€™Âª': '💪',
        
        # Checkmark ✓ (E2 9C 93)
        'âœ"': '✓',
        'Ã¢ÂœÂ"': '✓',
        
        # Em dash — (E2 80 94)
        'â€"': '—',
        'Ã¢Â€Â"': '—',
        
        # Simple lightning ⚡ (E2 9A A1)
        'âš¡': '⚡',
        'Ã¢ÂšÂ¡': '⚡',
        
        # Flag patterns
        'ðŸ‡ºðŸ‡¸': '🇺🇸',  # US
        'ðŸ‡¬ðŸ‡§': '🇬🇧',  # UK
        'ðŸ‡¨ðŸ‡¦': '🇨🇦',  # Canada
        'ðŸ‡²ðŸ‡½': '🇲🇽',  # Mexico
        'ðŸ‡©ðŸ‡ª': '🇩🇪',  # Germany
        'ðŸ‡«ðŸ‡·': '🇫🇷',  # France
        'ðŸ‡¦ðŸ‡º': '🇦🇺',  # Australia
        'ðŸ‡¯ðŸ‡µ': '🇯🇵',  # Japan
    }
    
    # Read the file
    with open('index.html', 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    # Apply all replacements
    for bad, good in replacements.items():
        if bad in content:
            print(f"Replacing '{bad}' with '{good}'")
            content = content.replace(bad, good)
    
    # Also fix literal ? symbols in template literals
    import re
    
    # Fix verified-badge ? symbols
    content = re.sub(
        r'(verified-badge.*?title="Pro-Level Verification">)\?(</span>)',
        r'\1✓\2',
        content
    )
    
    # Fix pr-val ? symbols  
    content = re.sub(
        r'(pr-val">)\?(\s*\d+)',
        r'\1⚡\2',
        content
    )
    
    # Fix country flags in getCountryFlag function
    flag_fixes = {
        "'????'": "'🇺🇸'",
        "'????'": "'🇬🇧'",
        "'????'": "'🇨🇦'",
        "'????'": "'🇲🇽'",
        "'????'": "'🇩🇪'",
        "'????'": "'🇫🇷'",
        "'????'": "'🇦🇺'",
        "'????'": "'🇯🇵'",
        "'??'": "'🌍'"
    }
    
    for bad, good in flag_fixes.items():
        content = content.replace(bad, good)
    
    # Fix athlete country data
    content = content.replace('"country": "????",', '"country": "🇺🇸",')
    
    # Write back with UTF-8 BOM
    with open('index.html', 'w', encoding='utf-8-sig') as f:
        f.write(content)
    
    print("\nFile has been fixed with brute force method!")

if __name__ == '__main__':
    fix_mojibake()