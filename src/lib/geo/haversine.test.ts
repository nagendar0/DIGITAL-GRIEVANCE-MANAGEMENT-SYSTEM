import { describe, it, expect } from "vitest";
import { 
  calculateHaversineDistance, 
  GPS_VERIFICATION_DISCLAIMER, 
  ALLOWED_RADIUS_METERS 
} from "./haversine";

describe("Haversine GPS Formula Verification", () => {
  it("calculates 0 meters for identical coordinates", () => {
    const point = { latitude: 12.971598, longitude: 77.594562 };
    const res = calculateHaversineDistance(point, point);

    expect(res.distanceMeters).toBe(0);
    expect(res.isWithinRadius).toBe(true);
    expect(res.result).toBe("MATCH");
    expect(res.allowedRadiusMeters).toBe(100);
    expect(res.disclaimer).toBe(GPS_VERIFICATION_DISCLAIMER);
  });

  it("verifies location within strict 100 meter threshold (~45 meters away)", () => {
    // 0.0004 deg latitude ~ 44.4 meters
    const point1 = { latitude: 12.971598, longitude: 77.594562 };
    const point2 = { latitude: 12.971998, longitude: 77.594562 };

    const res = calculateHaversineDistance(point1, point2);

    expect(res.distanceMeters).toBeGreaterThan(40);
    expect(res.distanceMeters).toBeLessThan(50);
    expect(res.isWithinRadius).toBe(true);
    expect(res.result).toBe("MATCH");
  });

  it("fails verification when technician is beyond 100 meter tolerance (~250 meters away)", () => {
    // 0.0022 deg latitude ~ 244 meters
    const point1 = { latitude: 12.971598, longitude: 77.594562 };
    const point2 = { latitude: 12.973800, longitude: 77.594562 };

    const res = calculateHaversineDistance(point1, point2);

    expect(res.distanceMeters).toBeGreaterThan(100);
    expect(res.isWithinRadius).toBe(false);
    expect(res.result).toBe("MISMATCH");
  });

  it("flags distant cities as massive MISMATCH", () => {
    const bangalore = { latitude: 12.9716, longitude: 77.5946 };
    const mumbai = { latitude: 19.0760, longitude: 72.8777 };

    const res = calculateHaversineDistance(bangalore, mumbai);

    // Bangalore to Mumbai is approximately 840 km (840,000 meters)
    expect(res.distanceMeters).toBeGreaterThan(800000);
    expect(res.isWithinRadius).toBe(false);
    expect(res.result).toBe("MISMATCH");
  });

  it("strictly attaches mandatory non-repudiation disclaimer", () => {
    const p1 = { latitude: 28.6139, longitude: 77.2090 };
    const p2 = { latitude: 28.6140, longitude: 77.2091 };

    const res = calculateHaversineDistance(p1, p2);
    expect(res.disclaimer).toContain("GPS coordinates serve as verification evidence and do not constitute absolute proof");
  });
});
