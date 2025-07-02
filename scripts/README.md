# Database Management Scripts

This directory contains scripts for managing database operations between production and development environments.

## Production to Development Copy

### Prerequisites

1. **Add Production Database URL to Secrets**
   - Go to the Secrets tab in your Replit project
   - Add a new secret with key: `PROD_DATABASE_URL`
   - Add the value: your production PostgreSQL connection string
   - Format should be: `postgresql://user:password@host:port/database`

2. **Ensure Development Database is Set**
   - Your `DATABASE_URL` environment variable should already be configured
   - This points to your development database

### Available Scripts

#### 1. Bash Script (Recommended)
```bash
# Make script executable (first time only)
chmod +x scripts/backup-restore.sh

# Create backup from production
./scripts/backup-restore.sh backup

# Restore latest backup to development
./scripts/backup-restore.sh restore

# Direct copy from production to development (no backup file)
./scripts/backup-restore.sh full-copy

# List available backup files
./scripts/backup-restore.sh list
```

#### 2. Node.js Script (Alternative)
```bash
# Run with dry-run to see what would be copied
node scripts/copy-prod-to-dev.js --dry-run

# Copy all tables from production to development
node scripts/copy-prod-to-dev.js

# Copy specific tables only
node scripts/copy-prod-to-dev.js --tables=users,orders,locations
```

### Recommended Workflow

1. **First Time Setup**:
   ```bash
   # Add PROD_DATABASE_URL to Replit secrets
   # Then create your first backup
   ./scripts/backup-restore.sh backup
   ```

2. **Regular Development**:
   ```bash
   # Create fresh backup and restore to dev
   ./scripts/backup-restore.sh backup
   ./scripts/backup-restore.sh restore
   
   # OR do direct copy (faster, no backup file)
   ./scripts/backup-restore.sh full-copy
   ```

3. **Working with Backups**:
   ```bash
   # List all available backups
   ./scripts/backup-restore.sh list
   
   # Restore specific backup
   ./scripts/backup-restore.sh restore scripts/backups/prod_backup_20241230_143022.sql
   ```

### Safety Features

- **Confirmation prompts** before destructive operations
- **Dry-run mode** available for testing
- **Automatic backup creation** with timestamps
- **Batch processing** for large datasets
- **Connection testing** before operations
- **Sequence reset** after data copy

### Backup Storage

- Backups are stored in `scripts/backups/`
- Files are named with timestamp: `prod_backup_YYYYMMDD_HHMMSS.sql`
- You can manually manage these files as needed

### Troubleshooting

1. **Connection Issues**:
   - Verify `PROD_DATABASE_URL` is correctly set in Replit secrets
   - Check that your production database allows connections from Replit
   - Ensure `DATABASE_URL` points to your development database

2. **Permission Issues**:
   - Make sure the production database user has read permissions
   - Ensure the development database user has write permissions

3. **Large Database Issues**:
   - Use the Node.js script with `--tables` parameter for partial copies
   - Consider copying tables individually for very large datasets

### Security Notes

- Production credentials are stored securely in Replit secrets
- Backup files contain sensitive data - handle appropriately
- Development database will be completely replaced during restore operations

## Usage Examples

```bash
# Quick daily sync from production
./scripts/backup-restore.sh full-copy

# Create backup for safekeeping, then sync
./scripts/backup-restore.sh backup
./scripts/backup-restore.sh restore

# Copy only essential tables for development
node scripts/copy-prod-to-dev.js --tables=users,orders,locations,woo_orders
```