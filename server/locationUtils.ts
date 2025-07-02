import { storage } from "./storage";

// Location name normalization function
export function normalizeLocationName(locationName: string): string {
  if (!locationName) return locationName;
  
  // Normalize the location name by:
  // 1. Trimming whitespace
  // 2. Removing state abbreviations at the end (", PA", ", DE", ", NJ", etc.)
  // 3. Removing extra spaces
  // 4. Standardizing common variations
  
  let normalized = locationName.trim();
  
  // Remove state abbreviations at the end
  normalized = normalized.replace(/,\s*(PA|DE|NJ|NY|MD|VA|CT|MA|FL|CA|TX|IL|OH|MI|WI|MN|IA|MO|ND|SD|NE|KS|OK|AR|LA|MS|AL|TN|KY|IN|WV|NC|SC|GA|FL|VT|NH|ME|RI|CT|AK|HI|WA|OR|ID|MT|WY|CO|NM|AZ|UT|NV)\s*$/i, '');
  
  // Remove extra whitespace and normalize spacing
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Handle specific location variations
  const locationMappings: { [key: string]: string } = {
    "Drexel University 3301 Market St, Philadelphia": "3301 Market St, Philadelphia",
    "3301 Market St, Philadelphia, PA": "3301 Market St, Philadelphia",
    "414 North Union St, Wilmington, DE": "414 North Union St, Wilmington DE",
    "414 North Union St, Wilmington DE": "414 North Union St, Wilmington DE", // Keep DE for Delaware
    "4407 Chestnut St, Philadelphia, PA": "4407 Chestnut St, Philadelphia"
  };
  
  // Apply specific mappings
  if (locationMappings[normalized]) {
    normalized = locationMappings[normalized];
  }
  
  return normalized;
}

// Fuzzy matching function to detect similar location names
export function findSimilarLocation(targetName: string, existingLocations: any[]): any | null {
  const normalizedTarget = normalizeLocationName(targetName);
  
  for (const location of existingLocations) {
    const normalizedExisting = normalizeLocationName(location.name);
    
    // Exact match after normalization
    if (normalizedTarget === normalizedExisting) {
      return location;
    }
    
    // Check for very similar names (allowing for minor variations)
    const targetWords = normalizedTarget.toLowerCase().split(/\s+/);
    const existingWords = normalizedExisting.toLowerCase().split(/\s+/);
    
    // If they share most significant words, consider them similar
    const commonWords = targetWords.filter(word => 
      existingWords.some(existingWord => existingWord.includes(word) || word.includes(existingWord))
    );
    
    // If 80% or more words match, consider it the same location
    if (commonWords.length >= Math.max(targetWords.length * 0.8, existingWords.length * 0.8)) {
      console.log(`Found similar location: "${targetName}" → "${location.name}"`);
      return location;
    }
  }
  
  return null;
}

// Enhanced location finder that uses normalization and fuzzy matching
export async function findOrCreateLocation(locationName: string): Promise<any> {
  if (!locationName) {
    throw new Error('Location name is required');
  }

  // Normalize the location name
  const normalizedLocationName = normalizeLocationName(locationName);
  console.log(`Location lookup: "${locationName}" → "${normalizedLocationName}"`);
  
  // First try to find by normalized name
  let location = await storage.getLocationByName(normalizedLocationName);
  
  if (!location) {
    // Get all locations to check for similar ones
    const allLocations = await storage.getAllLocations();
    location = findSimilarLocation(normalizedLocationName, allLocations);
    
    if (location) {
      console.log(`Using similar location: "${normalizedLocationName}" → "${location.name}"`);
    } else {
      // Create new location with normalized name
      console.log(`Creating new location: "${normalizedLocationName}"`);
      location = await storage.createLocation({ 
        name: normalizedLocationName,
        code: normalizedLocationName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        isActive: true
      });
    }
  }
  
  return location;
}

// Standard location names used by the system
export const STANDARD_LOCATIONS = {
  DELAWARE: '414 North Union St, Wilmington DE',
  DREXEL: '3301 Market St, Philadelphia', 
  MAIN: '4407 Chestnut St, Philadelphia'
};

// Get standard location name based on store URL
export function getStandardLocationForDomain(storeUrl: string): string {
  if (storeUrl.includes('delaware.nanushotchicken.co')) {
    return STANDARD_LOCATIONS.DELAWARE;
  } else if (storeUrl.includes('drexel.nanushotchicken.co')) {
    return STANDARD_LOCATIONS.DREXEL;
  } else {
    return STANDARD_LOCATIONS.MAIN;
  }
}