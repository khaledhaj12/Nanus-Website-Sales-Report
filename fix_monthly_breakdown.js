// Simple script to fix the monthly breakdown issue
const fs = require('fs');

// Read the routes file
const routesContent = fs.readFileSync('server/routes.ts', 'utf8');

// Find and replace the problematic sections
const fixed = routesContent.replace(
  /\/\/ If we have specific date filtering, apply it to individual orders too\s*\n\s*if \(capturedStartDate && capturedEndDate\) {\s*\n\s*const startDateTime = `\$\{capturedStartDate\} 00:00:00`;\s*\n\s*const endDateTime = `\$\{capturedEndDate\} 23:59:59`;\s*\n\s*orderWhereClause = `WHERE w\.order_date >= \$1 AND w\.order_date <= \$2`;\s*\n\s*orderParams\.splice\(0, 1, startDateTime, endDateTime\); \/\/ Replace month param with date range\s*\n\s*\}/g,
  '// Orders should be filtered by month only (monthly breakdown shows orders from each specific month)'
);

// Write back
fs.writeFileSync('server/routes.ts', fixed);
console.log('Fixed monthly breakdown logic');