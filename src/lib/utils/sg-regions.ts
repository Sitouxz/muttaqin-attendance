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

// --------------- Postal Districts ---------------

export interface SGDistrict {
  district: number;
  name: string;
}

/** Maps postal sector (first 2 digits) → district number + name. Source: SingPost */
const SECTOR_TO_DISTRICT: Record<number, SGDistrict> = {
  1: { district: 1, name: "Raffles Place, Cecil, Marina, People's Park" },
  2: { district: 1, name: "Raffles Place, Cecil, Marina, People's Park" },
  3: { district: 1, name: "Raffles Place, Cecil, Marina, People's Park" },
  4: { district: 1, name: "Raffles Place, Cecil, Marina, People's Park" },
  5: { district: 1, name: "Raffles Place, Cecil, Marina, People's Park" },
  6: { district: 1, name: "Raffles Place, Cecil, Marina, People's Park" },
  7: { district: 2, name: "Anson, Tanjong Pagar" },
  8: { district: 2, name: "Anson, Tanjong Pagar" },
  14: { district: 3, name: "Queenstown, Tiong Bahru" },
  15: { district: 3, name: "Queenstown, Tiong Bahru" },
  16: { district: 3, name: "Queenstown, Tiong Bahru" },
  9: { district: 4, name: "Telok Blangah, Harbourfront" },
  10: { district: 4, name: "Telok Blangah, Harbourfront" },
  11: { district: 5, name: "Pasir Panjang, Hong Leong Garden, Clementi New Town" },
  12: { district: 5, name: "Pasir Panjang, Hong Leong Garden, Clementi New Town" },
  13: { district: 5, name: "Pasir Panjang, Hong Leong Garden, Clementi New Town" },
  17: { district: 6, name: "High Street, Beach Road (part)" },
  18: { district: 7, name: "Middle Road, Golden Mile" },
  19: { district: 7, name: "Middle Road, Golden Mile" },
  20: { district: 8, name: "Little India" },
  21: { district: 8, name: "Little India" },
  22: { district: 9, name: "Orchard, Cairnhill, River Valley" },
  23: { district: 9, name: "Orchard, Cairnhill, River Valley" },
  24: { district: 10, name: "Ardmore, Bukit Timah, Holland Road, Tanglin" },
  25: { district: 10, name: "Ardmore, Bukit Timah, Holland Road, Tanglin" },
  26: { district: 10, name: "Ardmore, Bukit Timah, Holland Road, Tanglin" },
  27: { district: 10, name: "Ardmore, Bukit Timah, Holland Road, Tanglin" },
  28: { district: 11, name: "Watten Estate, Novena, Thomson" },
  29: { district: 11, name: "Watten Estate, Novena, Thomson" },
  30: { district: 11, name: "Watten Estate, Novena, Thomson" },
  31: { district: 12, name: "Balestier, Toa Payoh, Serangoon" },
  32: { district: 12, name: "Balestier, Toa Payoh, Serangoon" },
  33: { district: 12, name: "Balestier, Toa Payoh, Serangoon" },
  34: { district: 13, name: "Macpherson, Braddell" },
  35: { district: 13, name: "Macpherson, Braddell" },
  36: { district: 13, name: "Macpherson, Braddell" },
  37: { district: 13, name: "Macpherson, Braddell" },
  38: { district: 14, name: "Geylang, Eunos" },
  39: { district: 14, name: "Geylang, Eunos" },
  40: { district: 14, name: "Geylang, Eunos" },
  41: { district: 14, name: "Geylang, Eunos" },
  42: { district: 15, name: "Katong, Joo Chiat, Amber Road" },
  43: { district: 15, name: "Katong, Joo Chiat, Amber Road" },
  44: { district: 15, name: "Katong, Joo Chiat, Amber Road" },
  45: { district: 15, name: "Katong, Joo Chiat, Amber Road" },
  46: { district: 16, name: "Bedok, Upper East Coast, Eastwood, Kew Drive" },
  47: { district: 16, name: "Bedok, Upper East Coast, Eastwood, Kew Drive" },
  48: { district: 16, name: "Bedok, Upper East Coast, Eastwood, Kew Drive" },
  49: { district: 17, name: "Loyang, Changi" },
  50: { district: 17, name: "Loyang, Changi" },
  81: { district: 17, name: "Loyang, Changi" },
  51: { district: 18, name: "Tampines, Pasir Ris" },
  52: { district: 18, name: "Tampines, Pasir Ris" },
  53: { district: 19, name: "Serangoon Garden, Hougang, Punggol" },
  54: { district: 19, name: "Serangoon Garden, Hougang, Punggol" },
  55: { district: 19, name: "Serangoon Garden, Hougang, Punggol" },
  82: { district: 19, name: "Serangoon Garden, Hougang, Punggol" },
  56: { district: 20, name: "Bishan, Ang Mo Kio" },
  57: { district: 20, name: "Bishan, Ang Mo Kio" },
  58: { district: 21, name: "Upper Bukit Timah, Clementi Park, Ulu Pandan" },
  59: { district: 21, name: "Upper Bukit Timah, Clementi Park, Ulu Pandan" },
  60: { district: 22, name: "Jurong" },
  61: { district: 22, name: "Jurong" },
  62: { district: 22, name: "Jurong" },
  63: { district: 22, name: "Jurong" },
  64: { district: 22, name: "Jurong" },
  65: { district: 23, name: "Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang" },
  66: { district: 23, name: "Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang" },
  67: { district: 23, name: "Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang" },
  68: { district: 23, name: "Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang" },
  69: { district: 24, name: "Lim Chu Kang, Tengah" },
  70: { district: 24, name: "Lim Chu Kang, Tengah" },
  71: { district: 24, name: "Lim Chu Kang, Tengah" },
  72: { district: 25, name: "Kranji, Woodgrove" },
  73: { district: 25, name: "Kranji, Woodgrove" },
  77: { district: 26, name: "Upper Thomson, Springleaf" },
  78: { district: 26, name: "Upper Thomson, Springleaf" },
  75: { district: 27, name: "Yishun, Sembawang" },
  76: { district: 27, name: "Yishun, Sembawang" },
  79: { district: 28, name: "Seletar" },
  80: { district: 28, name: "Seletar" },
};

/**
 * Get the Singapore postal district from a postal code string.
 * Returns null if the postal code is invalid or unmappable.
 */
export function getDistrictFromPostalCode(postalCode: string): SGDistrict | null {
  const cleaned = postalCode.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return null;

  const sector = parseInt(cleaned.substring(0, 2), 10);
  return SECTOR_TO_DISTRICT[sector] ?? null;
}
