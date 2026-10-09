import { describe, it, expect, vi, beforeEach } from "vitest";
import { forwardGeocodeAddress } from "./forward-geocode";

describe("Forward Geocoding Address", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles empty or short input safely", async () => {
    const res = await forwardGeocodeAddress("");
    expect(res).toBeNull();

    const shortRes = await forwardGeocodeAddress("a");
    expect(shortRes).toBeNull();
  });

  it("resolves coordinates from Nominatim search response", async () => {
    const mockNominatimResponse = [
      {
        place_id: 252109499,
        lat: "14.4604765",
        lon: "78.8337775",
        display_name: "Prakash Nagar, Kadapa, YSR Kadapa, Andhra Pradesh, 516004, India",
      },
    ];

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockNominatimResponse,
    } as any);

    const res = await forwardGeocodeAddress("Prakash Nagar, Kadapa");

    expect(res).not.toBeNull();
    expect(res?.lat).toBeCloseTo(14.4604765);
    expect(res?.lng).toBeCloseTo(78.8337775);
    expect(res?.displayName).toContain("Prakash Nagar");
  });

  it("returns null if Nominatim returns empty array", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as any);

    const res = await forwardGeocodeAddress("NonExistentUnknownPlace12345XYZ");
    expect(res).toBeNull();
  });
});
