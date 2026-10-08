import { describe, it, expect } from "vitest";
import { isGrievanceInOrgDomain, ORG_DOMAIN_MAPPING } from "./domain-mapping";

describe("Organization Domain & Category Filtering", () => {
  const electricityBoard = {
    id: "org-electricity-123",
    type: "ELECTRICITY_BOARD",
  };

  const waterBoard = {
    id: "org-water-456",
    type: "WATER_BOARD",
  };

  const pwdRoads = {
    id: "org-pwd-789",
    type: "PUBLIC_WORKS",
  };

  const municipality = {
    id: "org-muni-999",
    type: "MUNICIPALITY",
  };

  describe("ELECTRICITY_BOARD Domain Isolation", () => {
    it("accepts street light issues", () => {
      const grievance = {
        category: "Public Lighting & Electricity",
        title: "Street lights not working on 5th Cross Road",
        description: "All street lights on this lane are dark after sunset",
      };
      expect(isGrievanceInOrgDomain(grievance, electricityBoard)).toBe(true);
    });

    it("accepts electricity and wire hazards", () => {
      const grievance = {
        category: "Streetlights & Fallen Wires",
        title: "High voltage electrical wire snapped and sparked",
        description: "Live power wire hanging near school transformer",
      };
      expect(isGrievanceInOrgDomain(grievance, electricityBoard)).toBe(true);
    });

    it("accepts power blackout complaints matching keywords", () => {
      const grievance = {
        category: "Other Civic Utility",
        title: "Feeder transformer blast causing blackout",
        description: "Transformer caught fire and power is out",
      };
      expect(isGrievanceInOrgDomain(grievance, electricityBoard)).toBe(true);
    });

    it("REJECTS road potholes (must NOT show in Electricity Board)", () => {
      const grievance = {
        category: "Roads & Pavement",
        title: "Dangerous crater pothole on main road",
        description: "Deep pothole causing vehicle accidents",
      };
      expect(isGrievanceInOrgDomain(grievance, electricityBoard)).toBe(false);
    });

    it("REJECTS water leaks and sewage overflows (must NOT show in Electricity Board)", () => {
      const grievance = {
        category: "Water Supply & Leakage",
        title: "Drinking water pipe burst and gutter overflow",
        description: "Fresh water pipe leaking on sidewalk near manhole",
      };
      expect(isGrievanceInOrgDomain(grievance, electricityBoard)).toBe(false);
    });

    it("REJECTS garbage dumps (must NOT show in Electricity Board)", () => {
      const grievance = {
        category: "Garbage & Solid Waste",
        title: "Uncollected trash rotting on street corner",
        description: "Foul smell and open dump pile",
      };
      expect(isGrievanceInOrgDomain(grievance, electricityBoard)).toBe(false);
    });

    it("always accepts any grievance explicitly assigned to this organization", () => {
      const grievance = {
        category: "General Complaint",
        title: "Miscellaneous inquiry",
        description: "Special assignment",
        assigned_org_id: "org-electricity-123",
      };
      expect(isGrievanceInOrgDomain(grievance, electricityBoard)).toBe(true);
    });
  });

  describe("WATER_BOARD Domain Isolation", () => {
    it("accepts water pipe bursts", () => {
      const grievance = {
        category: "Water Supply & Leakage",
        title: "Main pipeline burst",
        description: "Water gushing onto the road",
      };
      expect(isGrievanceInOrgDomain(grievance, waterBoard)).toBe(true);
    });

    it("rejects streetlight issues", () => {
      const grievance = {
        category: "Public Lighting & Electricity",
        title: "Broken street light lamp pole",
        description: "Lamp bulb is burnt out",
      };
      expect(isGrievanceInOrgDomain(grievance, waterBoard)).toBe(false);
    });
  });

  describe("PUBLIC_WORKS Domain Isolation", () => {
    it("accepts road and pothole complaints", () => {
      const grievance = {
        category: "Roads, Potholes & Footpaths",
        title: "Asphalt crater on expressway",
        description: "Tarmac damaged after heavy rains",
      };
      expect(isGrievanceInOrgDomain(grievance, pwdRoads)).toBe(true);
    });

    it("rejects streetlight complaints", () => {
      const grievance = {
        category: "Public Lighting & Electricity",
        title: "Street light dark",
        description: "Bulb damaged",
      };
      expect(isGrievanceInOrgDomain(grievance, pwdRoads)).toBe(false);
    });
  });

  describe("MUNICIPALITY Broad Jurisdiction", () => {
    it("accepts all municipal complaints", () => {
      expect(
        isGrievanceInOrgDomain(
          { category: "Roads & Pavement", title: "Pothole", description: "Pothole" },
          municipality
        )
      ).toBe(true);

      expect(
        isGrievanceInOrgDomain(
          { category: "Public Lighting & Electricity", title: "Light", description: "Lamp" },
          municipality
        )
      ).toBe(true);
    });
  });
});
