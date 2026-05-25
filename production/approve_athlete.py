#!/usr/bin/env python3
"""
WDHC Athlete Approval Script
Usage:
  python approve_athlete.py "Athlete Name" [--verified]
  python approve_athlete.py --status
  python approve_athlete.py --sync
"""

import sys
import subprocess
import os
import json
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
DEV_SCRIPTS_DIR = SCRIPT_DIR.parent / "development_scripts"
NODE_SCRIPT = DEV_SCRIPTS_DIR / "direct_leaderboard_sync.js"

def run_node(args):
    """Run Node script with given arguments."""
    cmd = ["node", str(NODE_SCRIPT)] + args
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=DEV_SCRIPTS_DIR, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(f"Errors: {result.stderr}")
    return result.returncode

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)
    
    if args[0] == "--status" or args[0] == "status":
        run_node(["--status"])
    elif args[0] == "--sync" or args[0] == "sync":
        run_node(["--sync"])
    elif args[0] == "--approve" and len(args) > 1:
        name = args[1]
        verified = "--verified" in args
        node_args = ["--approve", name]
        if verified:
            node_args.append("--verified")
        run_node(node_args)
    else:
        # Assume first arg is name, check for --verified
        name = args[0]
        verified = "--verified" in args or "-v" in args
        node_args = ["--approve", name]
        if verified:
            node_args.append("--verified")
        run_node(node_args)

if __name__ == "__main__":
    main()