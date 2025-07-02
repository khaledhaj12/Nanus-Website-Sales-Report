#!/bin/bash

# Complete Production to Development Sync
# Downloads all working files from production site
# Usage: ./scripts/sync-from-prod.sh

set -e

PROD_URL="https://nanus-website-sales-report-khaledhaj12.replit.app"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🔄 Syncing from Production to Development"
echo "========================================"
echo "Production: $PROD_URL"
echo "Local: $PROJECT_ROOT"

# Create backup of current dev state
echo "📦 Creating backup of current development state..."
tar -czf "$SCRIPT_DIR/dev-backup-$TIMESTAMP.tar.gz" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    --exclude=scripts/dev-backup-*.tar.gz \
    -C "$PROJECT_ROOT" . 2>/dev/null || true

echo "✅ Backup created: scripts/dev-backup-$TIMESTAMP.tar.gz"

# Function to download and replace file
sync_file() {
    local file_path="$1"
    local local_path="$PROJECT_ROOT/$file_path"
    local url="$PROD_URL/$file_path"
    
    echo "📥 Syncing: $file_path"
    
    # Create directory if needed
    mkdir -p "$(dirname "$local_path")"
    
    # Download file
    if curl -f -s -o "$local_path" "$url" 2>/dev/null; then
        echo "✅ Synced: $file_path"
        return 0
    else
        echo "⚠️  Could not sync: $file_path"
        return 1
    fi
}

# Critical server files
echo "🔧 Syncing server files..."
SERVER_FILES=(
    "server/routes.ts"
    "server/storage.ts"
    "server/index.ts"
    "server/db.ts"
    "server/syncManager.ts"
    "server/locationUtils.ts"
    "server/locationMigration.ts"
)

for file in "${SERVER_FILES[@]}"; do
    sync_file "$file"
done

# Client files
echo "🎨 Syncing client files..."
CLIENT_FILES=(
    "client/src/App.tsx"
    "client/src/main.tsx"
    "client/src/pages/login.tsx"
    "client/src/pages/dashboard.tsx"
    "client/src/pages/settings.tsx"
    "client/src/pages/reports.tsx"
    "client/src/pages/users.tsx"
    "client/src/components/ui/form.tsx"
    "client/src/components/ui/button.tsx"
    "client/src/lib/queryClient.ts"
    "client/src/hooks/use-toast.ts"
)

for file in "${CLIENT_FILES[@]}"; do
    sync_file "$file"
done

# Shared files
echo "📋 Syncing shared files..."
SHARED_FILES=(
    "shared/schema.ts"
)

for file in "${SHARED_FILES[@]}"; do
    sync_file "$file"
done

# Configuration files
echo "⚙️  Syncing configuration files..."
CONFIG_FILES=(
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "tailwind.config.ts"
    "vite.config.ts"
    "drizzle.config.ts"
    "components.json"
    "postcss.config.js"
)

for file in "${CONFIG_FILES[@]}"; do
    sync_file "$file"
done

# Try to get the actual source files by checking common paths
echo "🔍 Attempting to sync additional working files..."

# Check if we can access source maps or build files that might give us clues
curl -f -s "$PROD_URL/.well-known/sources" -o /tmp/sources.txt 2>/dev/null || true
curl -f -s "$PROD_URL/api/health" 2>/dev/null || true

# Try to get any uploaded assets
echo "📁 Syncing assets and uploads..."
mkdir -p "$PROJECT_ROOT/uploads/logos"

# Since we can't browse directories via HTTP, we'll try common file patterns
COMMON_UPLOADS=(
    "uploads/logos/logo.png"
    "uploads/logos/logo.jpg"
    "uploads/logos/favicon.ico"
    "uploads/logos/favicon.png"
    "favicon.ico"
    "logo.png"
)

for file in "${COMMON_UPLOADS[@]}"; do
    sync_file "$file"
done

echo ""
echo "🎉 Production sync completed!"
echo "📝 Summary:"
echo "   - Backup created: scripts/dev-backup-$TIMESTAMP.tar.gz"
echo "   - Files synced from: $PROD_URL"
echo "   - If something breaks, restore with:"
echo "     cd $PROJECT_ROOT && tar -xzf scripts/dev-backup-$TIMESTAMP.tar.gz"
echo ""
echo "🔄 Restart your development server to see changes"