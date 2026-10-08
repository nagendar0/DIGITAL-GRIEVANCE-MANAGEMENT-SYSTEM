/**
 * Domain & Category Mapping for Specialized Operational Organizations.
 * Ensures organizations only receive and process grievances relevant to their municipal jurisdiction.
 */

export interface OrgDomainDefinition {
  label: string;
  departmentName: string;
  categories: string[];
  keywords: string[];
  badgeColor: string;
}

export const ORG_DOMAIN_MAPPING: Record<string, OrgDomainDefinition> = {
  ELECTRICITY_BOARD: {
    label: "Street Lighting & Electricity",
    departmentName: "Electricity & Public Lighting Board",
    categories: [
      "Public Lighting & Electricity",
      "Streetlights & Fallen Wires",
      "Street Lighting & Electrical",
      "ELECTRICAL",
      "LIGHTING",
      "STREET_LIGHTS",
      "STREETLIGHTS",
      "ELECTRICITY",
      "POWER",
    ],
    keywords: [
      "electric",
      "light",
      "lamp",
      "power",
      "wire",
      "pole",
      "transformer",
      "blackout",
      "streetlight",
      "street light",
      "bulb",
      "current",
      "cable",
      "voltage",
      "feeder",
      "short circuit",
    ],
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
  },

  WATER_BOARD: {
    label: "Water Supply & Drainage",
    departmentName: "Water Supply & Sewerage Board",
    categories: [
      "Water Supply & Leakage",
      "Drainage & Sewerage",
      "WATER_SUPPLY",
      "DRAINAGE",
      "SEWERAGE",
    ],
    keywords: [
      "water",
      "pipe",
      "pipeline",
      "leak",
      "sewer",
      "drain",
      "manhole",
      "gutter",
      "overflow",
      "contamination",
      "tap",
      "drinking",
      "sewage",
      "burst pipe",
      "valve",
    ],
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-300",
  },

  PUBLIC_WORKS: {
    label: "Roads & Civil Infrastructure",
    departmentName: "Public Works Department (PWD)",
    categories: [
      "Roads & Pavement",
      "Roads, Potholes & Footpaths",
      "ROADS",
      "INFRASTRUCTURE",
    ],
    keywords: [
      "road",
      "pothole",
      "pavement",
      "footpath",
      "asphalt",
      "tar",
      "divider",
      "flyover",
      "bridge",
      "crater",
      "tarmac",
      "sidewalk",
      "craters",
      "uneven",
    ],
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
  },

  SANITATION: {
    label: "Garbage & Public Sanitation",
    departmentName: "Sanitation & Waste Management Authority",
    categories: [
      "Garbage & Solid Waste",
      "Public Health & Sanitation",
      "SANITATION",
      "GARBAGE",
      "WASTE",
    ],
    keywords: [
      "garbage",
      "waste",
      "trash",
      "debris",
      "dump",
      "smell",
      "sanitation",
      "stagnant",
      "cleaning",
      "litter",
      "dustbin",
      "dead animal",
      "hygiene",
      "foul smell",
    ],
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },

  TRANSPORT_AUTHORITY: {
    label: "Traffic & Transport Infrastructure",
    departmentName: "Traffic & Transportation Directorate",
    categories: [
      "Traffic & Signals",
      "TRAFFIC",
      "TRANSPORT",
    ],
    keywords: [
      "traffic",
      "signal",
      "bus",
      "sign",
      "junction",
      "zebra",
      "speed breaker",
      "parking",
      "traffic light",
      "road sign",
    ],
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
  },

  MUNICIPALITY: {
    label: "General Municipal Affairs",
    departmentName: "Municipal Corporation Complex",
    categories: [
      "Roads & Pavement",
      "Public Lighting & Electricity",
      "Water Supply & Leakage",
      "Drainage & Sewerage",
      "Garbage & Solid Waste",
      "Public Health & Sanitation",
      "Traffic & Signals",
      "Other Civic Utility",
    ],
    keywords: [],
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
  },

  OTHER: {
    label: "Specialized Civic Services",
    departmentName: "Special Operations Authority",
    categories: [],
    keywords: [],
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
  },
};

/**
 * Checks whether a given grievance matches the domain/specialization of an organization.
 */
export function isGrievanceInOrgDomain(
  grievance: {
    category?: string | null;
    title?: string | null;
    description?: string | null;
    assigned_org_id?: string | null;
  },
  org: {
    id: string;
    type: string;
  }
): boolean {
  // If explicitly assigned to this organization, always display
  if (grievance.assigned_org_id === org.id) {
    return true;
  }

  // Broad municipal authority covers all intake
  if (org.type === "MUNICIPALITY" || org.type === "OTHER") {
    return true;
  }

  const domain = ORG_DOMAIN_MAPPING[org.type];
  if (!domain) {
    return true;
  }

  const grievanceCategory = (grievance.category || "").trim().toLowerCase();
  const grievanceTitle = (grievance.title || "").toLowerCase();
  const grievanceDesc = (grievance.description || "").toLowerCase();

  // 1. Check exact category match
  const matchesCategory = domain.categories.some(
    (cat) => cat.toLowerCase() === grievanceCategory || grievanceCategory.includes(cat.toLowerCase())
  );
  if (matchesCategory) {
    return true;
  }

  // 2. Check keyword matches in category, title, or description
  const combinedText = `${grievanceCategory} ${grievanceTitle} ${grievanceDesc}`;
  return domain.keywords.some((keyword) => combinedText.includes(keyword.toLowerCase()));
}
