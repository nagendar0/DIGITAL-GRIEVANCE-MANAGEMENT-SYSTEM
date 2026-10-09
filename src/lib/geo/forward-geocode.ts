/**
 * High-Precision Forward Geocoding Utility
 * Converts human-readable street addresses and landmark descriptions into
 * GPS coordinates (latitude, longitude) using OpenStreetMap Nominatim.
 */

export interface ForwardGeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function forwardGeocodeAddress(
  address: string
): Promise<ForwardGeocodeResult | null> {
  const cleanAddress = (address || "").trim();
  if (!cleanAddress || cleanAddress.length < 3) {
    return null;
  }

  // List of search queries to attempt (from specific to broader)
  const queries = [cleanAddress];
  
  // If the address doesn't contain a city or region indicator, try appending known context if helpful
  if (!cleanAddress.toLowerCase().includes("india") && !cleanAddress.toLowerCase().includes(",")) {
    queries.push(`${cleanAddress}, India`);
  }

  for (const query of queries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1&addressdetails=1`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "ResolveAI/1.0 (Digital Grievance Management System)",
          "Accept-Language": "en",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            return {
              lat,
              lng,
              displayName: data[0].display_name || cleanAddress,
            };
          }
        }
      }
    } catch (err) {
      console.warn(`Forward geocode attempt failed for query "${query}":`, err);
    }
  }

  return null;
}
