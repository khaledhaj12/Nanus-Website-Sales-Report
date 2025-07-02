#!/bin/bash

# Pull Production Code to Development Script
# This script pulls the working production code back to development environment
# Usage: ./scripts/pull-from-production.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$SCRIPT_DIR/dev-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo_info "Production to Development Code Pull"
echo "===================================="

# Check if we have the production URL
if [[ -z "$REPL_SLUG" || -z "$REPL_OWNER" ]]; then
    echo_error "Cannot determine production URL automatically"
    echo_info "Please provide your production URL:"
    echo_info "Format: https://your-repl-name--your-username.replit.app"
    read -p "Production URL: " PROD_URL
    if [[ -z "$PROD_URL" ]]; then
        echo_error "Production URL is required"
        exit 1
    fi
else
    PROD_URL="https://${REPL_SLUG}--${REPL_OWNER}.replit.app"
fi

echo_info "Production URL: $PROD_URL"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup of current development state
echo_info "Creating backup of current development state..."
BACKUP_FILE="$BACKUP_DIR/dev_backup_$TIMESTAMP.tar.gz"

# Backup current state (excluding node_modules, .git, etc.)
tar -czf "$BACKUP_FILE" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    --exclude=.next \
    --exclude=scripts/dev-backups \
    --exclude=scripts/backups \
    -C "$PROJECT_ROOT" . 2>/dev/null || echo_warning "Some files couldn't be backed up (this is normal)"

echo_success "Development backup created: $BACKUP_FILE"

# Function to download a specific file from production
download_file() {
    local file_path="$1"
    local local_path="$PROJECT_ROOT/$file_path"
    local url="$PROD_URL/$file_path"
    
    echo_info "Downloading: $file_path"
    
    # Create directory if it doesn't exist
    mkdir -p "$(dirname "$local_path")"
    
    # Download file
    if curl -f -s -o "$local_path" "$url"; then
        echo_success "Downloaded: $file_path"
        return 0
    else
        echo_warning "Could not download: $file_path (may not exist in production)"
        return 1
    fi
}

# Function to get the Git commit hash from production (if available)
get_production_commit() {
    echo_info "Attempting to get production version info..."
    
    # Try to get version from a potential API endpoint
    if curl -f -s "$PROD_URL/api/version" 2>/dev/null; then
        echo_success "Got production version info"
    else
        echo_info "No version endpoint available"
    fi
}

echo_warning "This will overwrite files in your development environment!"
echo_warning "A backup has been created at: $BACKUP_FILE"
echo_info "Press Ctrl+C to cancel, or press Enter to continue..."
read -r

# Critical files to pull from production
CRITICAL_FILES=(
    "server/routes.ts"
    "server/storage.ts" 
    "client/src/components/ui/form.tsx"
    "client/src/pages/login.tsx"
    "client/src/pages/settings.tsx"
    "package.json"
    "package-lock.json"
)

# Try to download critical files
echo_info "Downloading critical application files..."
for file in "${CRITICAL_FILES[@]}"; do
    download_file "$file"
done

# Try to download the entire uploads directory
echo_info "Downloading uploads directory..."
UPLOAD_FILES=(
    "uploads/logos/"
    "uploads/"
)

# Since we can't easily download entire directories via HTTP, 
# we'll focus on getting key server files that contain the working logic

# Alternative approach: Use git if this is a git repository
if [[ -d "$PROJECT_ROOT/.git" ]]; then
    echo_info "Git repository detected. Checking for production branch..."
    
    # Check if there's a production branch or tag
    git fetch --all 2>/dev/null || true
    
    # Look for production-related branches
    PROD_BRANCHES=$(git branch -a | grep -E "(prod|production|main|master)" | head -5)
    
    if [[ -n "$PROD_BRANCHES" ]]; then
        echo_info "Available branches that might contain production code:"
        echo "$PROD_BRANCHES"
        echo_warning "You may want to check out a specific branch/commit that matches production"
    fi
fi

# Provide manual instructions for complete restoration
echo ""
echo_success "Partial file download completed"
echo ""
echo_warning "For complete restoration, you may need to:"
echo "1. Check if there's a git commit/tag that matches your production deployment"
echo "2. Manually copy specific files that are critical for reCAPTCHA and logo functionality"
echo "3. Look at the backup file if you need to restore: $BACKUP_FILE"
echo ""
echo_info "To restore from backup if needed:"
echo "  cd $PROJECT_ROOT"
echo "  tar -xzf $BACKUP_FILE"
echo ""

# Specific guidance for the reCAPTCHA and logo issue
echo_info "For reCAPTCHA and logo functionality:"
echo "  The issue is likely in server/routes.ts where the endpoints were modified"
echo "  Check the downloaded server/routes.ts against your current version"
echo "  Key endpoints needed: /api/recaptcha-settings, /api/logo-settings, /api/logo-upload"

echo_success "Production pull completed. Check the downloaded files and restart your development server."