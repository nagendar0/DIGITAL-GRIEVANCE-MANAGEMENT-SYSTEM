"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function approveResolution(grievanceId: string, notes?: string) {
  const user = await getCurrentUserWithRole();
  if (!user || (user.role !== "ORG_MEMBER" && user.role !== "PLATFORM_ADMIN")) {
    return { error: "Unauthorized: Departmental authorization required to verify resolutions." };
  }

  const adminClient = createAdminClient();

  // 1. Fetch grievance
  const { data: grievance, error: gError } = await adminClient
    .from("grievances")
    .select("id, public_id, status, assigned_org_id, citizen_id, assigned_worker_id, title")
    .eq("id", grievanceId)
    .single();

  if (gError || !grievance) {
    return { error: "Grievance not found." };
  }

  if (user.role === "ORG_MEMBER" && grievance.assigned_org_id !== user.organizationId) {
    return { error: "Forbidden: You can only approve resolutions for your own organization." };
  }

  // Strict state machine validation: ONLY AWAITING_VERIFICATION can transition to CLOSED
  if (grievance.status !== "AWAITING_VERIFICATION") {
    return { 
      error: `Invalid state transition. Grievance status is currently "${grievance.status}". Only "AWAITING_VERIFICATION" can be approved.` 
    };
  }

  // 2. Fetch completion evidence & after image
  const { data: evidence } = await adminClient
    .from("completion_evidence")
    .select("id, after_image_url")
    .eq("grievance_id", grievance.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .single();

  if (!evidence) {
    return { error: "Missing completion evidence. Cannot verify without photographic and GPS proof." };
  }

  // 3. Copy after image to public-resolved bucket for public transparency
  try {
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("completion-evidence")
      .download(evidence.after_image_url);

    if (!downloadError && fileData) {
      const publicPath = `resolved/${grievance.public_id}_after.jpg`;
      const arrayBuffer = await fileData.arrayBuffer();
      await adminClient.storage
        .from("public-resolved")
        .upload(publicPath, Buffer.from(arrayBuffer), {
          contentType: "image/jpeg",
          upsert: true,
        });
    }
  } catch (err) {
    console.warn("Could not mirror image to public-resolved bucket:", err);
  }

  // 4. Update grievance to CLOSED
  const now = new Date().toISOString();
  const { error: updateError } = await adminClient
    .from("grievances")
    .update({
      status: "CLOSED",
      closed_at: now,
      closed_by: user.id,
      closure_notes: notes || "Formally inspected and approved by department reviewer.",
      updated_at: now,
    })
    .eq("id", grievance.id);

  if (updateError) {
    return { error: updateError.message || "Failed to update grievance status." };
  }

  // 5. Insert Resolution Review record
  await adminClient.from("resolution_reviews").insert({
    grievance_id: grievance.id,
    reviewer_id: user.id,
    decision: "APPROVED",
    reason: notes || "Restoration confirmed by department inspector.",
  });

  // 6. Record Status History: AWAITING_VERIFICATION -> CLOSED
  await adminClient.from("grievance_status_history").insert({
    grievance_id: grievance.id,
    from_status: "AWAITING_VERIFICATION",
    to_status: "CLOSED",
    changed_by: user.id,
    notes: "Resolution approved. Grievance closed with permanent public ledger proof.",
  });

  // 7. Audit Log
  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "RESOLUTION_APPROVED",
    resource_type: "grievances",
    resource_id: grievance.id,
    details: {
      public_id: grievance.public_id,
      evidence_id: evidence.id,
      approved_by: user.fullName,
    },
  });

  // 8. Dispatch Notifications
  // To Citizen
  await adminClient.from("notifications").insert({
    recipient_id: grievance.citizen_id,
    title: "Grievance Verified & Closed",
    message: `Your report "${grievance.title}" (${grievance.public_id}) has been successfully resolved and formally verified by the department. Thank you for making your community better!`,
  });

  // To Worker
  if (grievance.assigned_worker_id) {
    const { data: worker } = await adminClient
      .from("workers")
      .select("user_id")
      .eq("id", grievance.assigned_worker_id)
      .single();

    if (worker) {
      await adminClient.from("notifications").insert({
        recipient_id: worker.user_id,
        title: "Work Approved",
        message: `Your repair for ${grievance.public_id} was officially inspected and approved by departmental review. Job closed.`,
      });
    }
  }

  revalidatePath(`/org/grievances/${grievance.id}`);
  revalidatePath(`/org/reviews/${grievance.id}`);
  revalidatePath("/org");
  revalidatePath("/citizen");
  revalidatePath(`/citizen/grievances/${grievance.id}`);
  revalidatePath("/public");

  return { success: true };
}

export async function requestRework(grievanceId: string, reason: string) {
  const user = await getCurrentUserWithRole();
  if (!user || (user.role !== "ORG_MEMBER" && user.role !== "PLATFORM_ADMIN")) {
    return { error: "Unauthorized: Departmental authorization required." };
  }

  if (!reason || reason.trim().length < 15) {
    return { error: "Please provide detailed inspection notes explaining why rework is required (minimum 15 characters)." };
  }

  const adminClient = createAdminClient();

  const { data: grievance, error: gError } = await adminClient
    .from("grievances")
    .select("id, public_id, status, assigned_org_id, assigned_worker_id, title")
    .eq("id", grievanceId)
    .single();

  if (gError || !grievance) {
    return { error: "Grievance not found." };
  }

  if (user.role === "ORG_MEMBER" && grievance.assigned_org_id !== user.organizationId) {
    return { error: "Forbidden: You can only review grievances for your own department." };
  }

  if (grievance.status !== "AWAITING_VERIFICATION") {
    return { error: `Cannot request rework on a grievance with status "${grievance.status}".` };
  }

  const cleanReason = reason.trim();

  // 1. Update grievance status to REWORK_REQUIRED
  await adminClient
    .from("grievances")
    .update({
      status: "REWORK_REQUIRED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", grievance.id);

  // 2. Insert Resolution Review record with REWORK_REQUIRED
  await adminClient.from("resolution_reviews").insert({
    grievance_id: grievance.id,
    reviewer_id: user.id,
    decision: "REWORK_REQUIRED",
    reason: cleanReason,
  });

  // 3. Status history
  await adminClient.from("grievance_status_history").insert({
    grievance_id: grievance.id,
    from_status: "AWAITING_VERIFICATION",
    to_status: "REWORK_REQUIRED",
    changed_by: user.id,
    notes: `Rework requested: ${cleanReason}`,
  });

  // 4. Audit log
  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "RESOLUTION_REWORK_REQUESTED",
    resource_type: "grievances",
    resource_id: grievance.id,
    details: { reason: cleanReason },
  });

  // 5. Notify worker
  if (grievance.assigned_worker_id) {
    const { data: worker } = await adminClient
      .from("workers")
      .select("user_id")
      .eq("id", grievance.assigned_worker_id)
      .single();

    if (worker) {
      await adminClient.from("notifications").insert({
        recipient_id: worker.user_id,
        title: "Rework Required",
        message: `Your submitted evidence for ${grievance.public_id} requires rework: "${cleanReason}". Please re-inspect and adjust.`,
      });
    }
  }

  revalidatePath(`/org/grievances/${grievance.id}`);
  revalidatePath(`/org/reviews/${grievance.id}`);
  revalidatePath("/org");
  revalidatePath(`/worker/jobs/${grievance.id}`);
  revalidatePath("/worker");

  return { success: true };
}
