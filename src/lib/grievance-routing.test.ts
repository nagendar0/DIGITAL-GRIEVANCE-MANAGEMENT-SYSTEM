import { describe, it, expect } from "vitest";
import { isGrievanceInOrgDomain, ORG_DOMAIN_MAPPING } from "./org/domain-mapping";

describe("Grievance Routing & Domain Mapping", () => {
  const sanitationOrg = {
    id: "eea0aca5-0036-4bc3-bb6a-a190a58828e1",
    type: "SANITATION",
  };

  const electricityOrg = {
    id: "c6c11d34-131d-4729-8156-356124f02f85",
    type: "ELECTRICITY_BOARD",
  };

  const waterOrg = {
    id: "c9ff7344-1b16-4731-b7cc-ab21188d9b50",
    type: "WATER_BOARD",
  };

  it("correctly identifies garbage grievances in Sanitation domain by category", () => {
    const grievance = {
      category: "Garbage & Solid Waste",
      title: "Overflowing dumpster on main road",
      description: "Trash spilling onto sidewalk",
      assigned_org_id: sanitationOrg.id,
    };
    expect(isGrievanceInOrgDomain(grievance, sanitationOrg)).toBe(true);
    expect(isGrievanceInOrgDomain(grievance, electricityOrg)).toBe(false);
  });

  it("correctly identifies public health & sanitation grievances", () => {
    const grievance = {
      category: "Public Health & Sanitation",
      title: "Stagnant gutter water with foul odor",
      description: "Severe hygiene issue",
      assigned_org_id: null,
    };
    expect(isGrievanceInOrgDomain(grievance, sanitationOrg)).toBe(true);
  });

  it("always matches when assigned_org_id equals organization ID", () => {
    const grievance = {
      category: "Other Civic Utility",
      title: "Special issue",
      description: "Direct dispatch",
      assigned_org_id: sanitationOrg.id,
    };
    expect(isGrievanceInOrgDomain(grievance, sanitationOrg)).toBe(true);
  });

  it("allows workers to filter action-required dispatch orders from department pool", () => {
    const workerId = "633735ba-1bd2-4223-b5ee-50f60ed6b582";
    const grievances = [
      {
        id: "1",
        assigned_worker_id: workerId,
        assigned_org_id: sanitationOrg.id,
        status: "ASSIGNED",
      },
      {
        id: "2",
        assigned_worker_id: null,
        assigned_org_id: sanitationOrg.id,
        status: "PENDING",
      },
      {
        id: "3",
        assigned_worker_id: "other-worker",
        assigned_org_id: sanitationOrg.id,
        status: "ASSIGNED",
      },
      {
        id: "4",
        assigned_worker_id: workerId,
        assigned_org_id: sanitationOrg.id,
        status: "IN_PROGRESS",
      },
    ];

    const actionRequired = grievances.filter((g) => {
      if (g.assigned_worker_id === workerId) {
        return ["ASSIGNED", "REWORK_REQUIRED"].includes(g.status);
      }
      if (g.assigned_org_id === sanitationOrg.id && !g.assigned_worker_id) {
        return ["PENDING", "ASSIGNED"].includes(g.status);
      }
      return false;
    });

    expect(actionRequired.map((g) => g.id)).toEqual(["1", "2"]);
  });
});
