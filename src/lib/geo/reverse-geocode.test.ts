import { describe, it, expect, vi, beforeEach } from "vitest";
import { reverseGeocodeCoordinates } from "./reverse-geocode";

describe("Reverse Geocoding Coordinates", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles invalid coordinates safely", async () => {
    const res = await reverseGeocodeCoordinates(NaN, NaN);
    expect(res.success).toBe(false);
    expect(res.displayName).toBe("Invalid coordinates");
  });

  it("resolves structured address from Nominatim", async () => {
    const mockNominatimResponse = {
      display_name: "St. Joseph's Indian High School, 3rd Cross Road, D'Souza Layout, Bengaluru, Karnataka, 560001, India",
      address: {
        amenity: "St. Joseph's Indian High School",
        road: "3rd Cross Road",
        neighbourhood: "D'Souza Layout",
        city: "Bengaluru",
        state: "Karnataka",
        postcode: "560001",
        country: "India",
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockNominatimResponse,
    } as any);

    const res = await reverseGeocodeCoordinates(12.9716, 77.5946);

    expect(res.success).toBe(true);
    expect(res.streetAndLandmark).toContain("St. Joseph's Indian High School");
    expect(res.streetAndLandmark).toContain("3rd Cross Road");
    expect(res.city).toBe("Bengaluru");
    expect(res.state).toBe("Karnataka");
  });

  it("falls back to BigDataCloud if Nominatim request fails", async () => {
    const mockBdcResponse = {
      locality: "Indiranagar",
      city: "Bengaluru",
      principalSubdivision: "Karnataka",
      countryName: "India",
    };

    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Nominatim down"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBdcResponse,
      } as any);

    const res = await reverseGeocodeCoordinates(12.9716, 77.5946);

    expect(res.success).toBe(true);
    expect(res.displayName).toContain("Indiranagar");
    expect(res.city).toBe("Bengaluru");
  });
});
