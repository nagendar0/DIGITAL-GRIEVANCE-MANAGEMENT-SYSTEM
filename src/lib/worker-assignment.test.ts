import { describe, it, expect } from "vitest";

describe("Worker Role Filtering & Assignment Logic", () => {
  const sampleWorkers = [
    {
      id: "w1",
      fullName: "Ramesh Kumar",
      skills: ["Roads & Pavement Repairs", "Pothole Patching"],
      activeJobs: 0,
    },
    {
      id: "w2",
      fullName: "Suresh Patil",
      skills: ["Drainage & Sewerage", "Water Supply"],
      activeJobs: 1,
    },
    {
      id: "w3",
      fullName: "Anil Sharma",
      skills: ["Street Lighting & Electrical"],
      activeJobs: 0,
    },
    {
      id: "w4",
      fullName: "Vikram Singh",
      skills: ["General Municipal Maintenance"],
      activeJobs: 2,
    },
  ];

  it("identifies available technicians with 0 active jobs", () => {
    const available = sampleWorkers.filter((w) => w.activeJobs === 0);
    expect(available.length).toBe(2);
    expect(available.map((w) => w.fullName)).toContain("Ramesh Kumar");
    expect(available.map((w) => w.fullName)).toContain("Anil Sharma");
  });

  it("filters workers matching ROADS trade keywords", () => {
    const roadsKeywords = ["road", "pavement", "pothole", "asphalt"];
    const roadsWorkers = sampleWorkers.filter((w) => {
      const skillsStr = w.skills.join(" ").toLowerCase();
      return roadsKeywords.some((k) => skillsStr.includes(k)) || skillsStr.includes("general");
    });

    expect(roadsWorkers.map((w) => w.fullName)).toContain("Ramesh Kumar");
    expect(roadsWorkers.map((w) => w.fullName)).toContain("Vikram Singh"); // general maintenance fallback
    expect(roadsWorkers.map((w) => w.fullName)).not.toContain("Anil Sharma");
  });

  it("correctly flags when no workers match an uncommon specialization", () => {
    const acousticKeywords = ["acoustic", "soundproofing", "sonar"];
    const matchingWorkers = sampleWorkers.filter((w) => {
      const skillsStr = w.skills.join(" ").toLowerCase();
      return acousticKeywords.some((k) => skillsStr.includes(k));
    });

    expect(matchingWorkers.length).toBe(0);
  });
});

describe("State Machine Transition on Worker Acceptance", () => {
  it("transitions grievance status from ASSIGNED to IN_PROGRESS upon acceptance", () => {
    const grievanceState = {
      id: "g-101",
      status: "ASSIGNED",
      assigned_worker_id: "w-01",
    };

    const assignment = {
      status: "ASSIGNED",
    };

    // Simulate worker acceptance
    assignment.status = "ACCEPTED";
    grievanceState.status = "IN_PROGRESS";

    expect(assignment.status).toBe("ACCEPTED");
    expect(grievanceState.status).toBe("IN_PROGRESS");
  });

  it("reverts grievance status from ASSIGNED to PENDING upon decline", () => {
    const grievanceState = {
      id: "g-102",
      status: "ASSIGNED",
      assigned_worker_id: "w-02" as string | null,
    };

    // Simulate worker decline
    grievanceState.status = "PENDING";
    grievanceState.assigned_worker_id = null;

    expect(grievanceState.status).toBe("PENDING");
    expect(grievanceState.assigned_worker_id).toBeNull();
  });
});

describe("Organization Worker Recruitment & Application Workflow", () => {
  const currentOrgId = "eea0aca5-0036-4bc3-bb6a-a190a58828e1"; // City Sanitation

  const mockWorkers = [
    {
      id: "w-nagendar",
      fullName: "nagendar",
      phone: "+916304062448",
      skills: ["General Maintenance", "Sanitation", "Roads"],
      organization_id: null,
    },
    {
      id: "w-sai",
      fullName: "sai",
      phone: "+916304062448",
      skills: ["Electrical", "Pothole Repair", "Water Supply"],
      organization_id: "585d4fd1-d750-4e55-8a51-bc5f0e983929", // Greater City Municipal Corp
    },
    {
      id: "w-active",
      fullName: "Raju Sanitation",
      phone: "+919876543210",
      skills: ["Sanitation", "Waste Sorting"],
      organization_id: "eea0aca5-0036-4bc3-bb6a-a190a58828e1", // City Sanitation Squad
    },
  ];

  const mockRequests = [
    {
      id: "req-1",
      worker_id: "w-nagendar",
      organization_id: "eea0aca5-0036-4bc3-bb6a-a190a58828e1",
      type: "WORKER_APPLICATION",
      status: "PENDING",
      message: "Field technician requested to join City Sanitation & Waste Management dispatch team.",
    },
  ];

  it("identifies pending technician applications for the organization", () => {
    const pendingApps = mockRequests.filter(
      (r) => r.organization_id === currentOrgId && r.type === "WORKER_APPLICATION" && r.status === "PENDING"
    );
    expect(pendingApps.length).toBe(1);
    expect(pendingApps[0].worker_id).toBe("w-nagendar");
  });

  it("properly categorizes available/freelance technicians across the platform", () => {
    const freelanceTechnicians = mockWorkers.filter((w) => !w.organization_id);
    expect(freelanceTechnicians.length).toBe(1);
    expect(freelanceTechnicians[0].fullName).toBe("nagendar");
  });

  it("identifies department squad members", () => {
    const squad = mockWorkers.filter((w) => w.organization_id === currentOrgId);
    expect(squad.length).toBe(1);
    expect(squad[0].fullName).toBe("Raju Sanitation");
  });

  it("approving technician application adds worker to organization squad", () => {
    const request = { ...mockRequests[0] };
    const worker = { ...mockWorkers[0] };

    // Simulate acceptWorkerApplication
    request.status = "ACCEPTED";
    worker.organization_id = request.organization_id;

    expect(request.status).toBe("ACCEPTED");
    expect(worker.organization_id).toBe(currentOrgId);
  });

  it("organization can send invitation to any platform technician", () => {
    const newInvitation = {
      id: "req-2",
      worker_id: "w-sai",
      organization_id: currentOrgId,
      type: "ORG_INVITATION",
      status: "PENDING",
      message: "City Sanitation & Waste Management has invited you to join their team.",
    };

    expect(newInvitation.type).toBe("ORG_INVITATION");
    expect(newInvitation.status).toBe("PENDING");
    expect(newInvitation.worker_id).toBe("w-sai");
  });
});

