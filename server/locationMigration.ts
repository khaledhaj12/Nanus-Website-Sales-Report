import { storage } from "./storage";
import { normalizeLocationName } from "./locationUtils";
import { execute, sql } from "drizzle-orm";
import { db } from "./db";

interface LocationConsolidation {
  canonicalLocation: any;
  duplicateLocations: any[];
  orderCount: number;
}

export async function analyzeLocationDuplicates(): Promise<LocationConsolidation[]> {
  console.log("=== ANALYZING LOCATION DUPLICATES ===");
  
  const allLocations = await storage.getAllLocations();
  console.log(`Found ${allLocations.length} total locations`);
  
  // Group locations by normalized name
  const locationGroups = new Map<string, any[]>();
  
  for (const location of allLocations) {
    const normalizedName = normalizeLocationName(location.name);
    if (!locationGroups.has(normalizedName)) {
      locationGroups.set(normalizedName, []);
    }
    locationGroups.get(normalizedName)!.push(location);
  }
  
  const consolidations: LocationConsolidation[] = [];
  
  for (const [normalizedName, locations] of locationGroups.entries()) {
    if (locations.length > 1) {
      // Found duplicates - need consolidation
      console.log(`\nDuplicate group for "${normalizedName}":`);
      
      // Choose canonical location (prefer the one with standard naming or most orders)
      let canonicalLocation = locations[0];
      let maxOrders = 0;
      
      for (const location of locations) {
        // Count orders for this location
        const orderCountResult = await db.execute(
          sql.raw(`SELECT COUNT(*) as count FROM woo_orders WHERE location_id = ${location.id}`)
        );
        const orderCount = parseInt(orderCountResult.rows[0].count);
        
        console.log(`  - "${location.name}" (ID: ${location.id}) - ${orderCount} orders`);
        
        // Prefer locations with exact normalized names, then by order count
        if (location.name === normalizedName || orderCount > maxOrders) {
          canonicalLocation = location;
          maxOrders = orderCount;
        }
      }
      
      const duplicateLocations = locations.filter(loc => loc.id !== canonicalLocation.id);
      
      console.log(`  → Canonical: "${canonicalLocation.name}" (ID: ${canonicalLocation.id})`);
      console.log(`  → ${duplicateLocations.length} duplicates to merge`);
      
      consolidations.push({
        canonicalLocation,
        duplicateLocations,
        orderCount: maxOrders
      });
    }
  }
  
  console.log(`\nFound ${consolidations.length} location groups requiring consolidation`);
  return consolidations;
}

export async function consolidateLocationDuplicates(dryRun: boolean = true): Promise<void> {
  console.log(`=== ${dryRun ? 'DRY RUN: ' : ''}CONSOLIDATING LOCATION DUPLICATES ===`);
  
  const consolidations = await analyzeLocationDuplicates();
  
  if (consolidations.length === 0) {
    console.log("No duplicates found - no action needed");
    return;
  }
  
  let totalOrdersMoved = 0;
  let totalLocationsRemoved = 0;
  
  for (const consolidation of consolidations) {
    const { canonicalLocation, duplicateLocations } = consolidation;
    
    console.log(`\nProcessing: "${canonicalLocation.name}"`);
    
    for (const duplicateLocation of duplicateLocations) {
      // Count orders to be moved
      const orderCountResult = await db.execute(
        sql.raw(`SELECT COUNT(*) as count FROM woo_orders WHERE location_id = ${duplicateLocation.id}`)
      );
      const orderCount = parseInt(orderCountResult.rows[0].count);
      
      console.log(`  Moving ${orderCount} orders from "${duplicateLocation.name}" (ID: ${duplicateLocation.id})`);
      
      if (!dryRun) {
        // Move orders from duplicate location to canonical location
        await db.execute(
          sql.raw(`UPDATE woo_orders SET location_id = ${canonicalLocation.id} WHERE location_id = ${duplicateLocation.id}`)
        );
        
        // Move user location access from duplicate to canonical location
        await db.execute(
          sql.raw(`UPDATE user_location_access SET location_id = ${canonicalLocation.id} WHERE location_id = ${duplicateLocation.id}`)
        );
        
        // Delete the duplicate location
        await db.execute(
          sql.raw(`DELETE FROM locations WHERE id = ${duplicateLocation.id}`)
        );
        
        console.log(`  ✅ Moved ${orderCount} orders and removed duplicate location`);
      } else {
        console.log(`  [DRY RUN] Would move ${orderCount} orders and remove duplicate location`);
      }
      
      totalOrdersMoved += orderCount;
      totalLocationsRemoved++;
    }
  }
  
  console.log(`\n=== CONSOLIDATION SUMMARY ===`);
  console.log(`${dryRun ? '[DRY RUN] Would move' : 'Moved'} ${totalOrdersMoved} orders`);
  console.log(`${dryRun ? '[DRY RUN] Would remove' : 'Removed'} ${totalLocationsRemoved} duplicate locations`);
  console.log(`${dryRun ? '[DRY RUN] Would keep' : 'Kept'} ${consolidations.length} canonical locations`);
  
  if (dryRun) {
    console.log("\nTo execute the consolidation, call with dryRun = false");
  } else {
    console.log("\n✅ Location consolidation completed successfully!");
  }
}

// Function to verify the consolidation results
export async function verifyConsolidation(): Promise<void> {
  console.log("=== VERIFYING CONSOLIDATION RESULTS ===");
  
  const allLocations = await storage.getAllLocations();
  const locationGroups = new Map<string, any[]>();
  
  for (const location of allLocations) {
    const normalizedName = normalizeLocationName(location.name);
    if (!locationGroups.has(normalizedName)) {
      locationGroups.set(normalizedName, []);
    }
    locationGroups.get(normalizedName)!.push(location);
  }
  
  let duplicatesFound = 0;
  for (const [normalizedName, locations] of locationGroups.entries()) {
    if (locations.length > 1) {
      duplicatesFound++;
      console.log(`❌ Still has duplicates: "${normalizedName}" - ${locations.length} locations`);
    }
  }
  
  if (duplicatesFound === 0) {
    console.log("✅ No duplicates found - consolidation was successful!");
    
    // Show final location list
    console.log("\nFinal location list:");
    for (const location of allLocations) {
      const orderCountResult = await db.execute(
        sql.raw(`SELECT COUNT(*) as count FROM woo_orders WHERE location_id = ${location.id}`)
      );
      const orderCount = parseInt(orderCountResult.rows[0].count);
      console.log(`  - "${location.name}" (ID: ${location.id}) - ${orderCount} orders`);
    }
  } else {
    console.log(`❌ Found ${duplicatesFound} duplicate groups - consolidation may need to be repeated`);
  }
}