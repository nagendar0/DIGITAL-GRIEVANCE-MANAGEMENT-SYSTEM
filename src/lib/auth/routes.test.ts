import { describe, it, expect } from "vitest";
import { getDashboardRoute } from "./routes";

describe("getDashboardRoute routing resolution", () => {
  it("routes CITIZEN to /citizen", () => {
    expect(getDashboardRoute("CITIZEN")).toBe("/citizen");
  });

  it("routes null or undefined role to /citizen default", () => {
    expect(getDashboardRoute(null)).toBe("/citizen");
    expect(getDashboardRoute(undefined)).toBe("/citizen");
    expect(getDashboardRoute("")).toBe("/citizen");
  });

  it("routes ORG_MEMBER and ORGANIZATION to /org", () => {
    expect(getDashboardRoute("ORG_MEMBER")).toBe("/org");
    expect(getDashboardRoute("ORGANIZATION")).toBe("/org");
  });

  it("routes WORKER to /worker", () => {
    expect(getDashboardRoute("WORKER")).toBe("/worker");
  });

  it("routes PLATFORM_ADMIN and ADMIN to /admin", () => {
    expect(getDashboardRoute("PLATFORM_ADMIN")).toBe("/admin");
    expect(getDashboardRoute("ADMIN")).toBe("/admin");
  });
});
