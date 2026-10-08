"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateHaversineDistance, ALLOWED_RADIUS_METERS, GPS_VERIFICATION_DISCLAIMER } from "@/lib/geo/haversine";
import { verifyEvidenceWithGemini } from "@/lib/ai/gemini-verifier";

export async function acceptJob(grievanceId: string) {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== "WORKER" || !user.workerId) {
    return { error: "Unauthorized: Field technician credentials required." };
  }

  const adminClient = createAdminClient();

  const { data: grievance, error: gError } = await adminClient
    .from("grievances")
    .select("id, assigned_worker_id, assigned_org_id, status, public_id, title, citizen_id")
    .eq("id", grievanceId)
    .single();

  if (gError || !grievance) {
    return { error: "Grievance not found." };
  }

  const { data: worker } = await adminClient
    .from("workers")
    .select("id, user_id, organization_id, current_active_jobs")
    .eq("id", user.workerId)
    .single();

  const isDirectlyAssigned = grievance.assigned_worker_id === user.workerId;
  const isDeptPoolJob = Boolean(
    worker?.organization_id &&
    grievance.assigned_org_id === worker.organization_id &&
    (!grievance.assigned_worker_id || grievance.assigned_worker_id === user.workerId)
  );

  if (!isDirectlyAssigned && !isDeptPoolJob) {
    return { error: "You are not assigned to this grievance." };
  }

  const previousStatus = grievance.status;

  // 1. Assign worker and transition to IN_PROGRESS immediately
  await adminClient
    .from("grievances")
    .update({
      assigned_worker_id: user.workerId,
      status: "IN_PROGRESS",
      updated_at: new Date().toISOString(),
    })
    .eq("id", grievanceId);

  // 2. Upsert worker_assignments row to ACCEPTED
  const { data: existingAssignment } = await adminClient
    .from("worker_assignments")
    .select("id")
    .eq("grievance_id", grievanceId)
    .eq("worker_id", user.workerId)
    .maybeSingle();

  if (existingAssignment) {
    await adminClient
      .from("worker_assignments")
      .update({
        status: "ACCEPTED",
        responded_at: new Date().toISOString(),
      })
      .eq("id", existingAssignment.id);
  } else {
    await adminClient
      .from("worker_assignments")
      .insert({
        grievance_id: grievanceId,
        worker_id: user.workerId,
        assigned_by: user.id,
        status: "ACCEPTED",
        responded_at: new Date().toISOString(),
      });
  }

  // 3. Increment worker active jobs
  if (worker) {
    await adminClient
      .from("workers")
      .update({ current_active_jobs: (worker.current_active_jobs || 0) + 1 })
      .eq("id", user.workerId);
  }

  // 4. Status history entry
  await adminClient.from("grievance_status_history").insert({
    grievance_id: grievanceId,
    from_status: previousStatus,
    to_status: "IN_PROGRESS",
    changed_by: user.id,
    notes: "Field technician accepted the dispatch order. Repair work is actively in progress on-site.",
  });

  // 5. Audit log entry
  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "WORKER_JOB_ACCEPTED",
    resource_type: "grievances",
    resource_id: grievanceId,
    details: { worker_id: user.workerId },
  });

  // 6. Notify Citizen that request is accepted and in progress
  await adminClient.from("notifications").insert({
    recipient_id: grievance.citizen_id,
    title: "Request Accepted — Work in Progress",
    message: `A field technician has accepted your request "${grievance.title}" (${grievance.public_id}) and repair work is now actively in progress on-site.`,
  });

  revalidatePath("/worker");
  revalidatePath(`/worker/jobs/${grievanceId}`);
  revalidatePath(`/citizen/grievances/${grievanceId}`);
  revalidatePath(`/org/grievances/${grievanceId}`);
  revalidatePath("/org");
  revalidatePath("/citizen");
  return { success: true };
}

export async function declineJob(grievanceId: string, reason?: string) {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== "WORKER" || !user.workerId) {
    return { error: "Unauthorized: Field technician credentials required." };
  }

  const adminClient = createAdminClient();

  const { data: grievance, error: gError } = await adminClient
    .from("grievances")
    .select("id, assigned_worker_id, assigned_org_id, status, public_id, title, citizen_id")
    .eq("id", grievanceId)
    .single();

  if (gError || !grievance) {
    return { error: "Grievance not found." };
  }

  const { data: worker } = await adminClient
    .from("workers")
    .select("id, organization_id, current_active_jobs")
    .eq("id", user.workerId)
    .single();

  const isDirectlyAssigned = grievance.assigned_worker_id === user.workerId;
  const isDeptPoolJob = Boolean(
    worker?.organization_id &&
    grievance.assigned_org_id === worker.organization_id &&
    (!grievance.assigned_worker_id || grievance.assigned_worker_id === user.workerId)
  );

  if (!isDirectlyAssigned && !isDeptPoolJob) {
    return { error: "You are not assigned to this grievance." };
  }

  const previousStatus = grievance.status;

  // 1. Update assignment row to DECLINED if exists
  await adminClient
    .from("worker_assignments")
    .update({
      status: "DECLINED",
      responded_at: new Date().toISOString(),
    })
    .eq("grievance_id", grievanceId)
    .eq("worker_id", user.workerId);

  // 2. Revert grievance status to PENDING and unassign worker if directly assigned
  if (isDirectlyAssigned) {
    await adminClient
      .from("grievances")
      .update({
        status: "PENDING",
        assigned_worker_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", grievanceId);

    // 3. Decrement worker active jobs
    if (worker) {
      await adminClient
        .from("workers")
        .update({ current_active_jobs: Math.max(0, (worker.current_active_jobs || 1) - 1) })
        .eq("id", user.workerId);
    }
  }

  // 4. Status history
  await adminClient.from("grievance_status_history").insert({
    grievance_id: grievanceId,
    from_status: previousStatus,
    to_status: isDirectlyAssigned ? "PENDING" : previousStatus,
    changed_by: user.id,
    notes: `Technician declined assignment: ${reason || "Unavailable for immediate dispatch"}. Re-queued for other technicians.`,
  });

  // 5. Audit log
  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "WORKER_JOB_DECLINED",
    resource_type: "grievances",
    resource_id: grievanceId,
    details: { worker_id: user.workerId, reason },
  });

  revalidatePath("/worker");
  revalidatePath(`/worker/jobs/${grievanceId}`);
  revalidatePath(`/citizen/grievances/${grievanceId}`);
  revalidatePath(`/org/grievances/${grievanceId}`);
  revalidatePath("/org");
  revalidatePath("/citizen");
  return { success: true };
}

export async function startWork(grievanceId: string) {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== "WORKER" || !user.workerId) {
    return { error: "Unauthorized: Field technician credentials required." };
  }

  const adminClient = createAdminClient();

  const { data: grievance, error: gError } = await adminClient
    .from("grievances")
    .select("id, assigned_worker_id, status, citizen_id, public_id, title")
    .eq("id", grievanceId)
    .single();

  if (gError || !grievance) {
    return { error: "Grievance not found." };
  }

  if (grievance.assigned_worker_id !== user.workerId) {
    return { error: "Forbidden: You are not the assigned technician for this grievance." };
  }

  // State machine check: can only start work from ASSIGNED or REWORK_REQUIRED
  if (grievance.status !== "ASSIGNED" && grievance.status !== "REWORK_REQUIRED") {
    return { error: `Cannot start work from current state: ${grievance.status}` };
  }

  const previousStatus = grievance.status;

  // 1. Update grievance status to IN_PROGRESS
  const { error: updateError } = await adminClient
    .from("grievances")
    .update({
      status: "IN_PROGRESS",
      updated_at: new Date().toISOString(),
    })
    .eq("id", grievanceId);

  if (updateError) {
    return { error: updateError.message || "Failed to update state." };
  }

  // 2. Insert status history
  await adminClient.from("grievance_status_history").insert({
    grievance_id: grievanceId,
    from_status: previousStatus,
    to_status: "IN_PROGRESS",
    changed_by: user.id,
    notes: "Field technician arrived on site and commenced repair operations.",
  });

  // 3. Audit log
  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "WORKER_STARTED_WORK",
    resource_type: "grievances",
    resource_id: grievanceId,
    details: { worker_id: user.workerId },
  });

  // 4. Notify citizen
  await adminClient.from("notifications").insert({
    recipient_id: grievance.citizen_id,
    title: "Technician On-Site",
    message: `Repair work has officially started on your report "${grievance.title}" (${grievance.public_id}).`,
  });

  revalidatePath("/worker");
  revalidatePath(`/worker/jobs/${grievanceId}`);
  revalidatePath(`/citizen/grievances/${grievanceId}`);
  return { success: true };
}

export async function submitEvidence(formData: FormData) {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== "WORKER" || !user.workerId) {
    return { error: "Unauthorized: Field technician credentials required." };
  }

  const grievanceId = formData.get("grievanceId") as string;
  const description = formData.get("description") as string;
  const latStr = formData.get("latitude") as string;
  const lonStr = formData.get("longitude") as string;
  const imageFile = formData.get("afterImage") as File;

  if (!grievanceId || !description || !latStr || !lonStr || !imageFile) {
    return { error: "All fields are required: description, live GPS lock, and after-repair photograph." };
  }

  if (imageFile.size > 100 * 1024 * 1024) {
    return { error: "Photo evidence file size must not exceed 100MB." };
  }

  if (description.trim().length < 10) {
    return { error: "Please provide detailed repair notes (minimum 10 characters)." };
  }

  const workerLat = parseFloat(latStr);
  const workerLon = parseFloat(lonStr);

  if (isNaN(workerLat) || isNaN(workerLon)) {
    return { error: "Invalid GPS coordinates received from browser location service." };
  }

  const adminClient = createAdminClient();

  // 1. Fetch grievance
  const { data: grievance, error: gError } = await adminClient
    .from("grievances")
    .select("id, public_id, status, assigned_worker_id, assigned_org_id, citizen_id, latitude, longitude, title, description")
    .eq("id", grievanceId)
    .single();

  if (gError || !grievance) {
    return { error: "Grievance not found." };
  }

  if (grievance.assigned_worker_id !== user.workerId) {
    return { error: "Forbidden: You are not the assigned technician for this grievance." };
  }

  // Must be IN_PROGRESS, REWORK_REQUIRED, or AWAITING_VERIFICATION (for retrying or resubmitting corrected evidence)
  if (
    grievance.status !== "IN_PROGRESS" &&
    grievance.status !== "REWORK_REQUIRED" &&
    grievance.status !== "AWAITING_VERIFICATION"
  ) {
    return { error: `Evidence cannot be submitted when grievance is ${grievance.status}. Please start work first.` };
  }

  // 2. Upload "After" Image to private bucket "completion-evidence"
  const fileExt = imageFile.name?.split(".").pop() || "jpg";
  const fileName = `${grievance.id}/${Date.now()}_after.${fileExt}`;
  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await adminClient.storage
    .from("completion-evidence")
    .upload(fileName, buffer, {
      contentType: imageFile.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    return { error: `Failed to upload completion image: ${uploadError.message}` };
  }

  // 3. Calculate Haversine GPS Distance & tolerance verification
  const haversine = calculateHaversineDistance(
    { latitude: grievance.latitude, longitude: grievance.longitude },
    { latitude: workerLat, longitude: workerLon },
    ALLOWED_RADIUS_METERS
  );

  // 4. Insert Completion Evidence record
  const { data: evidence, error: evError } = await adminClient
    .from("completion_evidence")
    .insert({
      grievance_id: grievance.id,
      worker_id: user.workerId,
      after_image_url: fileName,
      latitude: workerLat,
      longitude: workerLon,
      description: description.trim(),
    })
    .select("id")
    .single();

  if (evError || !evidence) {
    return { error: evError?.message || "Failed to record resolution evidence." };
  }

  // 5. Insert GPS Verification record
  await adminClient.from("gps_verifications").insert({
    evidence_id: evidence.id,
    grievance_id: grievance.id,
    distance_meters: haversine.distanceMeters,
    allowed_radius_meters: haversine.allowedRadiusMeters,
    result: haversine.result,
    disclaimer: haversine.disclaimer,
  });

  // 6. Record in grievance_images (for unified tracking)
  await adminClient.from("grievance_images").insert({
    grievance_id: grievance.id,
    storage_path: fileName,
    is_before: false,
  });

  // 7. Transition Grievance State: IN_PROGRESS -> AWAITING_VERIFICATION
  const previousStatus = grievance.status;
  await adminClient
    .from("grievances")
    .update({
      status: "AWAITING_VERIFICATION",
      updated_at: new Date().toISOString(),
    })
    .eq("id", grievance.id);

  // 8. Insert Status History
  await adminClient.from("grievance_status_history").insert({
    grievance_id: grievance.id,
    from_status: previousStatus,
    to_status: "AWAITING_VERIFICATION",
    changed_by: user.id,
    notes: previousStatus === "AWAITING_VERIFICATION"
      ? `Updated resolution evidence resubmitted by technician. GPS distance: ${haversine.distanceMeters}m (${haversine.result}). Ready for organization verification.`
      : `Repair completed by technician. GPS distance: ${haversine.distanceMeters}m (${haversine.result}). Ready for organization verification.`,
  });

  // 9. Decrement worker active jobs count (only when transitioning from IN_PROGRESS or REWORK_REQUIRED)
  if (previousStatus !== "AWAITING_VERIFICATION") {
    const { data: currentWorker } = await adminClient
      .from("workers")
      .select("current_active_jobs")
      .eq("id", user.workerId)
      .single();

    if (currentWorker) {
      const nextCount = Math.max(0, (currentWorker.current_active_jobs || 1) - 1);
      await adminClient
        .from("workers")
        .update({ current_active_jobs: nextCount })
        .eq("id", user.workerId);
    }
  }

  // 10. Audit Log
  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "EVIDENCE_SUBMITTED",
    resource_type: "grievances",
    resource_id: grievance.id,
    details: {
      evidence_id: evidence.id,
      distance_meters: haversine.distanceMeters,
      gps_result: haversine.result,
    },
  });

  // 11. Trigger Gemini Evidence Verification with Before & After images
  const { data: beforeImgRecord } = await adminClient
    .from("grievance_images")
    .select("storage_path")
    .eq("grievance_id", grievance.id)
    .eq("is_before", true)
    .limit(1)
    .maybeSingle();

  try {
    await verifyEvidenceWithGemini({
      evidenceId: evidence.id,
      grievanceId: grievance.id,
      title: grievance.title,
      description: grievance.description,
      workerNotes: description.trim(),
      distanceMeters: haversine.distanceMeters,
      beforeImagePath: beforeImgRecord?.storage_path || null,
      afterImagePath: fileName,
    });
  } catch (err) {
    console.error("Gemini evidence verification error:", err);
  }

  // 12. Dispatch Notifications
  // To Organization Members
  if (grievance.assigned_org_id) {
    const { data: orgMembers } = await adminClient
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", grievance.assigned_org_id);

    if (orgMembers) {
      for (const m of orgMembers) {
        await adminClient.from("notifications").insert({
          recipient_id: m.user_id,
          title: "Resolution Review Ready",
          message: `Technician submitted repair evidence for ${grievance.public_id}. Final inspection and approval required.`,
        });
      }
    }
  }

  // To Citizen
  await adminClient.from("notifications").insert({
    recipient_id: grievance.citizen_id,
    title: "Repairs Completed",
    message: `The field technician has submitted proof of repair for "${grievance.title}" (${grievance.public_id}). Pending final departmental inspection.`,
  });

  // Fetch the AI verification outcome that was just generated
  const { data: aiVerificationResult } = await adminClient
    .from("ai_evidence_verifications")
    .select("result, confidence, visual_improvement, reason, consistency_notes")
    .eq("evidence_id", evidence.id)
    .maybeSingle();

  revalidatePath("/worker");
  revalidatePath(`/worker/jobs/${grievance.id}`);
  revalidatePath(`/org/grievances/${grievance.id}`);
  revalidatePath("/org");
  revalidatePath(`/citizen/grievances/${grievance.id}`);

  return { 
    success: true, 
    grievanceId: grievance.id,
    aiResult: aiVerificationResult || null,
  };
}
