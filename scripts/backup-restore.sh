#!/bin/bash

# Production to Development Database Backup & Restore Script
# Usage: 
#   ./scripts/backup-restore.sh backup       # Create backup from production
#   ./scripts/backup-restore.sh restore      # Restore backup to development
#   ./scripts/backup-restore.sh full-copy    # Direct copy from prod to dev

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/prod_backup_$TIMESTAMP.sql"

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

# Check if required environment variables are set
check_env_vars() {
    if [[ "$1" == "backup" || "$1" == "full-copy" ]]; then
        if [[ -z "$PROD_DATABASE_URL" ]]; then
            echo_error "PROD_DATABASE_URL environment variable is required"
            echo_info "Add your production database URL to Replit secrets:"
            echo_info "1. Go to Secrets tab in Replit"
            echo_info "2. Add key: PROD_DATABASE_URL"
            echo_info "3. Add value: your production PostgreSQL connection string"
            exit 1
        fi
    fi
    
    if [[ -z "$DATABASE_URL" ]]; then
        echo_error "DATABASE_URL environment variable is required"
        exit 1
    fi
}

# Create backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    echo_success "Backup directory created: $BACKUP_DIR"
}

# Backup production database
backup_production() {
    echo_info "Starting production database backup..."
    
    check_env_vars "backup"
    create_backup_dir
    
    echo_info "Backing up production database to: $BACKUP_FILE"
    
    # Create backup using pg_dump
    if pg_dump "$PROD_DATABASE_URL" > "$BACKUP_FILE"; then
        echo_success "Production backup completed: $BACKUP_FILE"
        echo_info "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
    else
        echo_error "Failed to create production backup"
        exit 1
    fi
}

# Restore backup to development
restore_to_development() {
    echo_info "Starting restore to development database..."
    
    check_env_vars "restore"
    
    # Find most recent backup if no specific file provided
    if [[ -z "$2" ]]; then
        LATEST_BACKUP=$(find "$BACKUP_DIR" -name "prod_backup_*.sql" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
        if [[ -z "$LATEST_BACKUP" ]]; then
            echo_error "No backup files found in $BACKUP_DIR"
            echo_info "Run: ./scripts/backup-restore.sh backup"
            exit 1
        fi
        BACKUP_FILE="$LATEST_BACKUP"
    else
        BACKUP_FILE="$2"
    fi
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        echo_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    echo_info "Using backup file: $BACKUP_FILE"
    echo_warning "This will REPLACE ALL DATA in the development database!"
    echo_warning "Press Ctrl+C to cancel, or press Enter to continue..."
    read -r
    
    # Extract database name from URL for connection
    DEV_DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    echo_info "Dropping and recreating development database..."
    
    # Drop all tables (safer than dropping database in hosted environments)
    psql "$DATABASE_URL" -c "
        DO \$\$ DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END \$\$;
    " || echo_warning "Could not drop existing tables (this is normal for empty databases)"
    
    echo_info "Restoring backup to development database..."
    
    # Restore backup
    if psql "$DATABASE_URL" < "$BACKUP_FILE"; then
        echo_success "Development database restored successfully"
    else
        echo_error "Failed to restore development database"
        exit 1
    fi
}

# Direct copy from production to development
full_copy() {
    echo_info "Starting direct copy from production to development..."
    
    check_env_vars "full-copy"
    
    echo_warning "This will REPLACE ALL DATA in the development database!"
    echo_warning "Press Ctrl+C to cancel, or press Enter to continue..."
    read -r
    
    # Create temporary backup
    TEMP_BACKUP="/tmp/prod_temp_backup_$TIMESTAMP.sql"
    
    echo_info "Creating temporary backup from production..."
    if pg_dump "$PROD_DATABASE_URL" > "$TEMP_BACKUP"; then
        echo_success "Temporary backup created"
    else
        echo_error "Failed to create temporary backup"
        exit 1
    fi
    
    echo_info "Clearing development database..."
    
    # Drop all tables
    psql "$DATABASE_URL" -c "
        DO \$\$ DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END \$\$;
    " || echo_warning "Could not drop existing tables"
    
    echo_info "Restoring production data to development..."
    
    # Restore to development
    if psql "$DATABASE_URL" < "$TEMP_BACKUP"; then
        echo_success "Production data copied to development successfully"
        rm -f "$TEMP_BACKUP"
        echo_info "Temporary backup file removed"
    else
        echo_error "Failed to restore to development database"
        echo_info "Temporary backup saved at: $TEMP_BACKUP"
        exit 1
    fi
}

# List available backups
list_backups() {
    echo_info "Available backup files:"
    if ls "$BACKUP_DIR"/prod_backup_*.sql 1> /dev/null 2>&1; then
        for backup in "$BACKUP_DIR"/prod_backup_*.sql; do
            echo "  - $(basename "$backup") ($(du -h "$backup" | cut -f1))"
        done
    else
        echo_warning "No backup files found in $BACKUP_DIR"
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 {backup|restore|full-copy|list}"
    echo ""
    echo "Commands:"
    echo "  backup      Create backup from production database"
    echo "  restore     Restore latest backup to development database"
    echo "  full-copy   Direct copy from production to development"
    echo "  list        List available backup files"
    echo ""
    echo "Environment variables required:"
    echo "  DATABASE_URL       - Development database connection string"
    echo "  PROD_DATABASE_URL  - Production database connection string (for backup/full-copy)"
}

# Main script logic
case "$1" in
    backup)
        backup_production
        ;;
    restore)
        restore_to_development "$@"
        ;;
    full-copy)
        full_copy
        ;;
    list)
        list_backups
        ;;
    *)
        show_usage
        exit 1
        ;;
esac