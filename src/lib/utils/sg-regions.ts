/**
 * Maps Singapore 6-digit postal codes to planning regions.
 * Based on first 2 digits (postal sector) → URA planning regions.
 */

export type SGRegion = "Central" | "East" | "West" | "North" | "North-East";

const SECTOR_TO_REGION: Record<number, SGRegion> = {
  // Central Region
  1: "Central", 2: "Central", 3: "Central", 4: "Central", 5: "Central",
  6: "Central", 7: "Central", 8: "Central", 9: "Central", 10: "Central",
  11: "Central", 12: "Central", 13: "Central", 14: "Central", 15: "Central",
  16: "Central", 17: "Central", 18: "Central", 19: "Central", 20: "Central",
  21: "Central", 22: "Central", 23: "Central", 24: "Central", 25: "Central",
  26: "Central", 27: "Central",
  34: "Central", 35: "Central", 36: "Central", 37: "Central",
  38: "Central", 39: "Central", 40: "Central", 41: "Central",

  // East Region
  42: "East", 43: "East", 44: "East", 45: "East",
  46: "East", 47: "East", 48: "East",
  49: "East", 50: "East", 51: "East", 52: "East",
  81: "East",

  // North-East Region
  28: "North-East",
  31: "North-East", 32: "North-East", 33: "North-East",
  53: "North-East", 54: "North-East", 55: "North-East",
  56: "North-East", 57: "North-East",
  79: "North-East", 80: "North-East", 82: "North-East",

  // West Region
  58: "West", 59: "West",
  60: "West", 61: "West", 62: "West", 63: "West", 64: "West",
  65: "West", 66: "West", 67: "West", 68: "West",
  69: "West", 70: "West", 71: "West",

  // North Region
  29: "North", 30: "North",
  72: "North", 73: "North",
  75: "North", 76: "North", 77: "North", 78: "North",
};

/**
 * Get the Singapore region from a postal code string.
 * Returns null if the postal code is invalid or unmappable.
 */
export function getRegionFromPostalCode(postalCode: string): SGRegion | null {
  const cleaned = postalCode.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return null;

  const sector = parseInt(cleaned.substring(0, 2), 10);
  return SECTOR_TO_REGION[sector] ?? null;
}

/** All 5 SG regions in display order */
export const SG_REGIONS: SGRegion[] = [
  "Central",
  "East",
  "West",
  "North",
  "North-East",
];

/** Region colours for charts */
export const REGION_COLOURS: Record<SGRegion, string> = {
  Central: "#173d35",
  East: "#10B981",
  West: "#3B82F6",
  North: "#735b29",
  "North-East": "#8B5CF6",
};
