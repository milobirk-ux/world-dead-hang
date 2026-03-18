#!/usr/bin/env python3
"""
Examine and fix UTF-8 encoding issues
"""

import re

def examine_file():
    # Read file as bytes
    with open('index.html', 'rb') as f:
        data = f.read()
    
    # Try to find the marquee content
    pattern = b"The world's first sanctioned dead hang championship"
    match = re.search(pattern, data)
    
    if match:
        start = max(0, match.start() - 50)
        end = min(len(data), match.start() + 150)
        
        print("Found marquee content:")
        print("Raw bytes:", data[start:end])
        print("\nDecoded as UTF-8:", data[start:end].decode('utf-8', errors='replace'))
        print("\nDecoded as Windows-1252:", data[start:end].decode('windows-1252', errors='replace'))
        
        # Check what's before "The world"
        before = data[match.start()-10:match.start()]
        print(f"\nBytes before 'The world': {before}")
        print(f"Hex: {before.hex()}")
        
        # These are the UTF-8 bytes for 🌍: F0 9F 8C 8D
        # If corrupted, they might appear as different bytes
        globe_bytes = bytes([0xF0, 0x9F, 0x8C, 0x8D])
        if globe_bytes in data[start:match.start()]:
            print("✅ Found proper 🌍 bytes in file")
        else:
            print("❌ No proper 🌍 bytes found")

def fix_file():
    # Read the file with different encodings to see what works
    try:
        with open('index.html', 'r', encoding='utf-8') as f:
            content = f.read()
            print("Successfully read as UTF-8")
    except UnicodeDecodeError:
        try:
            with open('index.html', 'r', encoding='windows-1252') as f:
                content = f.read()
                print("Successfully read as Windows-1252")
        except UnicodeDecodeError:
            print("Could not read file with either encoding")
            return
    
    # Now fix the content
    # Replace corrupted globe symbol (might appear as ï¿½ or other)
    content = content.replace('?? The world', '🌍 The world')
    content = content.replace('? The world', '🌍 The world')
    
    # Fix other symbols
    content = content.replace('?? No minimum', '⚡ No minimum')
    content = content.replace('?? Grip strength', '💪 Grip strength')
    content = content.replace('? 30 seconds', '⚡ 30 seconds')
    
    # Fix em dash
    content = content.replace(' - officially', ' — officially')
    
    # Write back with UTF-8 BOM
    with open('index.html', 'w', encoding='utf-8-sig') as f:
        f.write(content)
    
    print("File rewritten with UTF-8 BOM")

if __name__ == '__main__':
    print("=== Examining file ===")
    examine_file()
    print("\n=== Fixing file ===")
    fix_file()