#!/usr/bin/env python3
import subprocess
import sys

# Check the current working directory
print("Restoring routes.ts file...")

# Copy the backup routes-broken.ts as a starting point  
try:
    subprocess.run(['cp', 'server/routes-broken.ts', 'server/routes.ts'], check=True)
    print("✓ Restored routes.ts from backup")
    
    # Now let's apply the location duplicate consolidation fix step by step
    print("✓ Routes file restored successfully")
    
except subprocess.CalledProcessError as e:
    print(f"Error: {e}")
    sys.exit(1)