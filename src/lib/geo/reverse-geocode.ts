/**
 * High-Precision Reverse Geocoding Utility
 * Resolves GPS coordinates (latitude, longitude) into human-readable locations,
 * street names, and landmark details using OpenStreetMap Nominatim with
 * robust fallback to BigDataCloud.
 */

export interface ReverseGeocodeResult {
  success: boolean;
  displayName: string;
  streetAndLandmark: string;
  formattedAddress: string;
  locality?: string;
  city?: string;
  state?: string;
  postcode?: string;
}

export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  // Validate coordinates
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    return {
      success: false,
      displayName: "Invalid coordinates",
      streetAndLandmark: "",
      formattedAddress: "",
    };
  }

  // 1. Primary: OpenStreetMap Nominatim API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "ResolveAI/1.0 (Digital Grievance Management System)",
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;

        // Extract key components
        const landmark =
          addr.amenity ||
          addr.building ||
          addr.landmark ||
          addr.shop ||
          addr.office ||
          addr.tourism ||
          addr.leisure ||
          "";
        const road =
          addr.road ||
          addr.street ||
          addr.pedestrian ||
          addr.footway ||
          addr.path ||
          "";
        const area =
          addr.neighbourhood ||
          addr.suburb ||
          addr.quarter ||
          addr.residential ||
          addr.city_district ||
          "";
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.county ||
          "";
        const state = addr.state || "";
        const postcode = addr.postcode || "";

        // Deduplicate components preserving order
        const streetTokens = [landmark, road, area, city].filter(Boolean);
        const uniqueTokens = Array.from(new Set(streetTokens));
        const streetAndLandmark =
          uniqueTokens.length > 0
            ? uniqueTokens.join(", ")
            : data.display_name?.split(",").slice(0, 3).join(",").trim() || "";

        // Concise human-friendly location for badge/display
        const displayTokens = Array.from(
          new Set([landmark || road, area, city, state].filter(Boolean))
        );
        const displayName =
          displayTokens.length > 0 ? displayTokens.join(", ") : streetAndLandmark;

        return {
          success: true,
          displayName: displayName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          streetAndLandmark: streetAndLandmark || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          formattedAddress: data.display_name || "",
          locality: area,
          city,
          state,
          postcode,
        };
      }
    }
  } catch (err) {
    console.warn("Nominatim reverse geocode attempt failed, trying fallback:", err);
  }

  // 2. Secondary: BigDataCloud Reverse Geocode Client API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await fetch(bdcUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const locality = data.locality || data.city || "";
      const city = data.city || data.principalSubdivision || "";
      const state = data.principalSubdivision || "";
      const country = data.countryName || "";

      const parts = Array.from(new Set([locality, city, state].filter(Boolean)));
      const displayName = parts.join(", ") || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      return {
        success: true,
        displayName,
        streetAndLandmark: displayName,
        formattedAddress: [locality, city, state, country].filter(Boolean).join(", "),
        locality,
        city,
        state,
      };
    }
  } catch (err) {
    console.warn("BigDataCloud reverse geocode attempt failed:", err);
  }

  // 3. Fallback: Formatted coordinates representation
  return {
    success: false,
    displayName: `Current Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
    streetAndLandmark: `Location near ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
    formattedAddress: `${lat}, ${lng}`,
  };
}
