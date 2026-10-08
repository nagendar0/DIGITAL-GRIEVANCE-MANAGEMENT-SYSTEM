/**
 * Pure mathematical implementation of the Haversine formula for spherical distance.
 * Resolves distance between two GPS coordinates (lat, lon) in meters.
 * Earth mean radius: 6,371,000 meters.
 */

export const GPS_VERIFICATION_DISCLAIMER =
  "GPS coordinates serve as verification evidence and do not constitute absolute proof against device spoofing.";

export const ALLOWED_RADIUS_METERS = 100; // Strict tolerance requirement (100 meters)

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface HaversineResult {
  distanceMeters: number;
  isWithinRadius: boolean;
  allowedRadiusMeters: number;
  result: "MATCH" | "MISMATCH";
  disclaimer: string;
}

/**
 * Calculates great-circle distance between two points on Earth using Haversine formula.
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates,
  allowedRadius: number = ALLOWED_RADIUS_METERS
): HaversineResult {
  const R = 6371000; // Earth radius in meters

  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;

  const deltaLatRad = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLonRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceMeters = Math.round(R * c * 10) / 10; // Round to 1 decimal place
  const isWithinRadius = distanceMeters <= allowedRadius;

  return {
    distanceMeters,
    isWithinRadius,
    allowedRadiusMeters: allowedRadius,
    result: isWithinRadius ? "MATCH" : "MISMATCH",
    disclaimer: GPS_VERIFICATION_DISCLAIMER,
  };
}
