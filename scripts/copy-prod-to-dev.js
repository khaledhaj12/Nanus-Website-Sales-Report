#!/usr/bin/env node

/**
 * Production to Development Database Copy Script
 * 
 * This script copies data from production database to development database
 * Usage: node scripts/copy-prod-to-dev.js [--dry-run] [--tables table1,table2]
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema.js';
import { sql } from 'drizzle-orm';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const tablesArg = args.find(arg => arg.startsWith('--tables='));
const specificTables = tablesArg ? tablesArg.split('=')[1].split(',') : null;

console.log('🔄 Production to Development Database Copy');
console.log('==========================================');

if (isDryRun) {
  console.log('🧪 DRY RUN MODE - No actual changes will be made');
}

// Check for required environment variables
const prodDbUrl = process.env.PROD_DATABASE_URL;
const devDbUrl = process.env.DATABASE_URL;

if (!prodDbUrl) {
  console.error('❌ Error: PROD_DATABASE_URL environment variable is required');
  console.log('\nTo set up production database connection:');
  console.log('1. Add PROD_DATABASE_URL to your secrets in Replit');
  console.log('2. Use the same format as your current DATABASE_URL but pointing to production');
  process.exit(1);
}

if (!devDbUrl) {
  console.error('❌ Error: DATABASE_URL environment variable is required');
  process.exit(1);
}

// Initialize database connections
const prodPool = new Pool({ connectionString: prodDbUrl });
const devPool = new Pool({ connectionString: devDbUrl });

const prodDb = drizzle({ client: prodPool, schema });
const devDb = drizzle({ client: devPool, schema });

// Define tables to copy (in dependency order)
const tablesToCopy = [
  'users',
  'locations', 
  'woo_store_connections',
  'orders',
  'woo_orders',
  'file_uploads',
  'notes',
  'user_locations',
  'user_permissions',
  'recaptcha_settings',
  'logo_settings',
  'footer_settings',
  'webhook_settings',
  'webhook_logs'
];

async function copyTable(tableName) {
  console.log(`\n📊 Processing table: ${tableName}`);
  
  try {
    // Get row count from production
    const prodCountResult = await prodDb.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`);
    const prodCount = parseInt(prodCountResult.rows[0].count);
    
    console.log(`   Production rows: ${prodCount}`);
    
    if (prodCount === 0) {
      console.log(`   ⏭️  Skipping empty table`);
      return;
    }
    
    // Get row count from development
    const devCountResult = await devDb.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`);
    const devCount = parseInt(devCountResult.rows[0].count);
    
    console.log(`   Development rows: ${devCount}`);
    
    if (!isDryRun) {
      // Clear development table
      console.log(`   🗑️  Clearing development table...`);
      await devDb.execute(sql`DELETE FROM ${sql.identifier(tableName)}`);
      
      // Copy data from production
      console.log(`   📥 Copying ${prodCount} rows...`);
      
      // Get all data from production
      const prodData = await prodDb.execute(sql`SELECT * FROM ${sql.identifier(tableName)}`);
      
      if (prodData.rows.length > 0) {
        // Get column names
        const columns = Object.keys(prodData.rows[0]);
        const columnIdentifiers = columns.map(col => sql.identifier(col));
        
        // Insert data in batches of 100
        const batchSize = 100;
        for (let i = 0; i < prodData.rows.length; i += batchSize) {
          const batch = prodData.rows.slice(i, i + batchSize);
          
          const values = batch.map(row => 
            sql`(${sql.join(columns.map(col => sql`${row[col]}`), sql`, `)})`
          );
          
          await devDb.execute(sql`
            INSERT INTO ${sql.identifier(tableName)} 
            (${sql.join(columnIdentifiers, sql`, `)}) 
            VALUES ${sql.join(values, sql`, `)}
          `);
          
          console.log(`   ✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(prodData.rows.length/batchSize)}`);
        }
      }
      
      // Verify final count
      const finalCountResult = await devDb.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`);
      const finalCount = parseInt(finalCountResult.rows[0].count);
      
      console.log(`   ✅ Copy complete: ${finalCount} rows in development`);
    } else {
      console.log(`   🧪 Would copy ${prodCount} rows (dry run)`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error copying table ${tableName}:`, error.message);
  }
}

async function resetSequences() {
  if (isDryRun) {
    console.log('\n🧪 Would reset database sequences (dry run)');
    return;
  }
  
  console.log('\n🔄 Resetting database sequences...');
  
  const sequences = [
    'users_id_seq',
    'locations_id_seq',
    'orders_id_seq',
    'woo_orders_id_seq',
    'file_uploads_id_seq',
    'notes_id_seq',
    'user_permissions_id_seq',
    'recaptcha_settings_id_seq',
    'logo_settings_id_seq',
    'footer_settings_id_seq',
    'webhook_settings_id_seq',
    'webhook_logs_id_seq'
  ];
  
  for (const sequence of sequences) {
    try {
      await devDb.execute(sql`SELECT setval('${sql.identifier(sequence)}', (SELECT COALESCE(MAX(id), 1) FROM ${sql.identifier(sequence.replace('_id_seq', ''))}))`);
      console.log(`   ✅ Reset sequence: ${sequence}`);
    } catch (error) {
      console.log(`   ⚠️  Could not reset sequence ${sequence}: ${error.message}`);
    }
  }
}

async function main() {
  try {
    console.log(`\n🔗 Connecting to databases...`);
    console.log(`   Production: ${prodDbUrl.substring(0, 30)}...`);
    console.log(`   Development: ${devDbUrl.substring(0, 30)}...`);
    
    // Test connections
    await prodDb.execute(sql`SELECT 1`);
    await devDb.execute(sql`SELECT 1`);
    console.log('   ✅ Database connections successful');
    
    const tablesToProcess = specificTables || tablesToCopy;
    
    console.log(`\n📋 Tables to process: ${tablesToProcess.join(', ')}`);
    
    if (!isDryRun) {
      console.log('\n⚠️  WARNING: This will DELETE all data in development database!');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Copy each table
    for (const table of tablesToProcess) {
      await copyTable(table);
    }
    
    // Reset sequences
    await resetSequences();
    
    console.log('\n🎉 Database copy completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Close connections
    await prodPool.end();
    await devPool.end();
  }
}

// Run the script
main().catch(console.error);