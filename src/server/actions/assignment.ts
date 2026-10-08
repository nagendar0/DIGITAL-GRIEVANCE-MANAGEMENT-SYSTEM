"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

interface AssignWorkerInput {
  grievanceId: string;
  workerId: string;
  notes?: string;
}

export async function assignWorkerToGrievance(input: AssignWorkerInput) {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== "ORG_MEMBER" || !user.organizationId) {
    return { error: "Unauthorized: Only active organization staff can assign field technicians." };
  }

  const adminClient = createAdminClient();

  // 1. Verify organization is VERIFIED
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .select("status, name")
    .eq("id", user.organizationId)
    .single();

  if (orgError || !org || org.status !== "VERIFIED") {
    return { error: "Your organization must be approved by Platform Admin before dispatching jobs." };
  }

  // 2. Fetch grievance and verify state
  const { data: grievance, error: grievanceError } = await adminClient
    .from("grievances")
    .select("id, public_id, status, assigned_org_id, citizen_id, title")
    .eq("id", input.grievanceId)
    .single();

  if (grievanceError || !grievance) {
    return { error: "Grievance not found." };
  }

  // Allowed statuses to assign a worker: PENDING or REWORK_REQUIRED (or re-assigning ASSIGNED)
  const allowedStatuses = ["PENDING", "REWORK_REQUIRED", "ASSIGNED"];
  if (!allowedStatuses.includes(grievance.status)) {
    return { 
      error: `Cannot assign worker. Current grievance status is ${grievance.status}, which is not ready for dispatch.` 
    };
  }

  // If already claimed by another org, block
  if (grievance.assigned_org_id && grievance.assigned_org_id !== user.organizationId) {
    return { error: "This grievance is already claimed by another operational organization." };
  }

  // 3. Verify worker exists, is active, and belongs to caller's org
  const { data: worker, error: workerError } = await adminClient
    .from("workers")
    .select("id, user_id, is_active, current_active_jobs, organization_id")
    .eq("id", input.workerId)
    .single();

  if (workerError || !worker) {
    return { error: "Worker not found in platform directory." };
  }

  if (worker.organization_id !== user.organizationId) {
    return { error: "Technician does not belong to your organization." };
  }

  if (!worker.is_active) {
    return { error: "Cannot assign job to an inactive technician." };
  }

  // 4. Update Grievance status to ASSIGNED
  const previousStatus = grievance.status;
  const { error: updateError } = await adminClient
    .from("grievances")
    .update({
      status: "ASSIGNED",
      assigned_org_id: user.organizationId,
      assigned_worker_id: worker.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", grievance.id);

  if (updateError) {
    return { error: updateError.message || "Failed to update grievance assignment." };
  }

  // 5. Insert into worker_assignments
  await adminClient.from("worker_assignments").insert({
    grievance_id: grievance.id,
    worker_id: worker.id,
    assigned_by: user.id,
    status: "ASSIGNED",
  });

  // 6. Record status history
  await adminClient.from("grievance_status_history").insert({
    grievance_id: grievance.id,
    from_status: previousStatus,
    to_status: "ASSIGNED",
    changed_by: user.id,
    notes: input.notes || "Assigned to field technician for resolution.",
  });

  // 7. Increment active jobs count
  await adminClient
    .from("workers")
    .update({ current_active_jobs: (worker.current_active_jobs || 0) + 1 })
    .eq("id", worker.id);

  // 8. Audit log
  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "GRIEVANCE_ASSIGNED",
    resource_type: "grievances",
    resource_id: grievance.id,
    details: {
      public_id: grievance.public_id,
      worker_id: worker.id,
      org_id: user.organizationId,
    },
  });

  // 9. Dispatch notifications
  // To Worker
  await adminClient.from("notifications").insert({
    recipient_id: worker.user_id,
    title: "New Job Assigned",
    message: `You have been assigned to investigate and repair "${grievance.title}" (${grievance.public_id}).`,
  });

  // To Citizen
  await adminClient.from("notifications").insert({
    recipient_id: grievance.citizen_id,
    title: "Technician Dispatched",
    message: `Great news! ${org.name} has assigned a certified field technician to your report (${grievance.public_id}).`,
  });

  revalidatePath(`/org/grievances/${grievance.id}`);
  revalidatePath("/org");
  revalidatePath("/worker");
  revalidatePath(`/worker/jobs/${grievance.id}`);
  revalidatePath("/citizen");
  revalidatePath(`/citizen/grievances/${grievance.id}`);
  return { success: true };
}
