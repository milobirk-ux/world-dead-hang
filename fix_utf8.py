#!/usr/bin/env python3
"""
Fix UTF-8 encoding issues in WDHC index.html file
"""

import re

def fix_encoding():
    # Read the file with proper UTF-8 handling
    with open('index.html', 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    # Fix marquee banner symbols
    content = re.sub(r'\?\? The world', '🌍 The world', content)
    content = re.sub(r'\?\? No minimum', '⚡ No minimum', content)
    content = re.sub(r'\?\? Grip strength', '💪 Grip strength', content)
    content = re.sub(r'\? 30 seconds', '⚡ 30 seconds', content)
    
    # Fix em dash
    content = re.sub(r' - officially', ' — officially', content)
    
    # Fix template literals for checkmark and lightning bolt
    content = re.sub(r'verified-badge.*?>\?<', 'verified-badge" title="Pro-Level Verification">✓<', content)
    content = re.sub(r'pr-val.*?>\? ', 'pr-val">⚡ ', content)
    
    # Fix flag emojis in getCountryFlag function
    flag_replacements = {
        "'\\?\\?\\?\\?'": "'🇺🇸'",
        "'\\?\\?\\?\\?'": "'🇬🇧'", 
        "'\\?\\?\\?\\?'": "'🇨🇦'",
        "'\\?\\?\\?\\?'": "'🇲🇽'",
        "'\\?\\?\\?\\?'": "'🇩🇪'",
        "'\\?\\?\\?\\?'": "'🇫🇷'",
        "'\\?\\?\\?\\?'": "'🇦🇺'",
        "'\\?\\?\\?\\?'": "'🇯🇵'",
        "'\\?\\?'": "'🌍'"
    }
    
    # Fix athlete country data
    content = re.sub(r'"country": "\?\?\?\?",', '"country": "🇺🇸",', content)
    
    # Write back with UTF-8 BOM
    with open('index.html', 'w', encoding='utf-8-sig') as f:
        f.write(content)
    
    print("UTF-8 encoding fixed!")

if __name__ == '__main__':
    fix_encoding()