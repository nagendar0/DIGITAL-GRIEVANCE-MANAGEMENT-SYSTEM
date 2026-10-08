"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

interface CreateWorkerInput {
  organizationId: string;
  fullName: string;
  email: string;
  phone: string;
  skills: string[];
}

export async function createWorker(input: CreateWorkerInput) {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== "ORG_MEMBER" || user.organizationId !== input.organizationId) {
    return { error: "Unauthorized: Only authorized organization members can onboard technicians." };
  }

  const adminClient = createAdminClient();

  // Verify that the organization itself is VERIFIED
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .select("status, name")
    .eq("id", input.organizationId)
    .single();

  if (orgError || !org || org.status !== "VERIFIED") {
    return { error: "Organization must be fully verified by Platform Admin before onboarding workers." };
  }

  const cleanEmail = input.email.trim().toLowerCase();

  // 1. Check if auth user already exists for this email, or create auth user
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  let workerAuthId: string | null = null;
  const foundUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

  if (foundUser) {
    workerAuthId = foundUser.id;
  } else {
    // Generate secure temporary credentials
    const tempPassword = `Tech_${Math.random().toString(36).slice(-8)}!${Date.now().toString().slice(-4)}`;
    const { data: newUser, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        phone: input.phone,
        role: "WORKER",
      },
    });

    if (createAuthError || !newUser?.user) {
      return { error: createAuthError?.message || "Failed to create authentication credentials for worker." };
    }
    workerAuthId = newUser.user.id;
  }

  // 2. Ensure Profile exists with WORKER role
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: workerAuthId,
      full_name: input.fullName,
      phone: input.phone,
      role: "WORKER",
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    return { error: profileError.message || "Failed to update worker profile." };
  }

  // 3. Ensure Workers table row exists
  const { data: existingWorker } = await adminClient
    .from("workers")
    .select("id")
    .eq("user_id", workerAuthId)
    .single();

  if (existingWorker) {
    return { error: "This user is already registered as an active field technician." };
  }

  const { data: newWorker, error: workerError } = await adminClient
    .from("workers")
    .insert({
      user_id: workerAuthId,
      organization_id: input.organizationId,
      skills: input.skills && input.skills.length > 0 ? input.skills : ["General Maintenance"],
      is_active: true,
      current_active_jobs: 0,
    })
    .select("id")
    .single();

  if (workerError || !newWorker) {
    return { error: workerError?.message || "Failed to register worker in organization directory." };
  }

  // 4. Audit Log
  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "WORKER_ONBOARDED",
    resource_type: "workers",
    resource_id: newWorker.id,
    details: {
      worker_name: input.fullName,
      worker_email: cleanEmail,
      org_id: input.organizationId,
      skills: input.skills,
    },
  });

  revalidatePath("/org/workers");
  revalidatePath("/org");
  return { success: true, workerId: newWorker.id };
}

export async function toggleWorkerStatus(workerId: string, isActive: boolean) {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== "ORG_MEMBER" || !user.organizationId) {
    return { error: "Unauthorized: Organization member authorization required." };
  }

  const adminClient = createAdminClient();

  const { data: worker, error } = await adminClient
    .from("workers")
    .update({ is_active: isActive })
    .eq("id", workerId)
    .eq("organization_id", user.organizationId)
    .select("id, is_active")
    .single();

  if (error || !worker) {
    return { error: error?.message || "Failed to update technician status." };
  }

  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "WORKER_STATUS_TOGGLED",
    resource_type: "workers",
    resource_id: workerId,
    details: { is_active: isActive },
  });

  revalidatePath("/org/workers");
  return { success: true };
}

/**
 * Worker applies to join an organization
 */
export async function applyToOrganization(organizationId: string, message?: string) {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== "WORKER") {
    return { error: "Unauthorized: Field technician credentials required." };
  }

  const adminClient = createAdminClient();

  // Find or create worker record
  let workerId = user.workerId;
  if (!workerId) {
    const { data: w } = await adminClient
      .from("workers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (w) {
      workerId = w.id;
    } else {
      const { data: createdW } = await adminClient
        .from("workers")
        .insert({
          user_id: user.id,
          organization_id: null,
          skills: ["General Maintenance", "Civic Repairs"],
          is_active: true,
          current_active_jobs: 0,
        })
        .select("id")
        .single();
      workerId = createdW?.id || null;
    }
  }

  if (!workerId) {
    return { error: "Could not initialize technician profile." };
  }

  // Check if organization exists and is verified
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .select("id, name, status")
    .eq("id", organizationId)
    .single();

  if (orgError || !org) {
    return { error: "Civic organization not found." };
  }

  // Check for existing pending application
  const { data: existingReq } = await adminClient
    .from("worker_organization_requests")
    .select("id, status")
    .eq("worker_id", workerId)
    .eq("organization_id", organizationId)
    .eq("type", "WORKER_APPLICATION")
    .eq("status", "PENDING")
    .maybeSingle();

  if (existingReq) {
    return { error: "You already have a pending application with this department." };
  }

  const { error: insertError } = await adminClient
    .from("worker_organization_requests")
    .insert({
      worker_id: workerId,
      organization_id: organizationId,
      type: "WORKER_APPLICATION",
      status: "PENDING",
      message: message || "Field technician applied to join official department dispatch roster.",
    });

  if (insertError) {
    return { error: insertError.message || "Failed to submit department application." };
  }

  // Notify organization admins
  const { data: orgMembers } = await adminClient
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId);

  if (orgMembers && orgMembers.length > 0) {
    for (const member of orgMembers) {
      await adminClient.from("notifications").insert({
        recipient_id: member.user_id,
        title: "New Field Technician Application",
        message: `${user.fullName || "A certified technician"} has applied to join ${org.name}. Review and accept in Technicians directory.`,
      });
    }
  }

  revalidatePath("/worker");
  revalidatePath("/org/workers");
  revalidatePath("/org");
  return { success: true };
}

/**
 * Organization admin accepts worker application
 */
export async function acceptWorkerApplication(requestId: string) {
  const user = await getCurrentUserWithRole();
  if (!user || (user.role !== "ORG_MEMBER" && user.role !== "PLATFORM_ADMIN")) {
    return { error: "Unauthorized: Department manager credentials required." };
  }

  const adminClient = createAdminClient();

  const { data: request, error: reqError } = await adminClient
    .from("worker_organization_requests")
    .select(`
      id,
      worker_id,
      organization_id,
      status,
      workers (
        id,
        user_id,
        profiles (
          full_name
        )
      ),
      organizations (
        id,
        name
      )
    `)
    .eq("id", requestId)
    .single();

  if (reqError || !request) {
    return { error: "Application request not found." };
  }

  let effectiveOrgId = user.organizationId;
  if (!effectiveOrgId && user.role === "ORG_MEMBER") {
    const { data: member } = await adminClient
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    effectiveOrgId = member?.organization_id || null;
  }

  if (user.role === "ORG_MEMBER" && effectiveOrgId && effectiveOrgId !== request.organization_id) {
    return { error: "Unauthorized: You can only approve applications for your department." };
  }

  // 1. Mark request ACCEPTED
  await adminClient
    .from("worker_organization_requests")
    .update({ status: "ACCEPTED", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  // 2. Update worker's organization_id
  await adminClient
    .from("workers")
    .update({ organization_id: request.organization_id, is_active: true })
    .eq("id", request.worker_id);

  // 3. Notify the worker
  const workerRaw = request.workers as any;
  const workerUserId = workerRaw?.user_id;
  const orgRaw = request.organizations as any;
  const orgName = orgRaw?.name || "the department";

  if (workerUserId) {
    await adminClient.from("notifications").insert({
      recipient_id: workerUserId,
      title: "Application Approved! 🎉",
      message: `Your application to join ${orgName} has been approved! You are now part of their official field operations roster.`,
    });
  }

  revalidatePath("/org/workers");
  revalidatePath("/org");
  revalidatePath("/worker");
  return { success: true };
}

/**
 * Organization admin declines worker application
 */
export async function declineWorkerApplication(requestId: string, reason?: string) {
  const user = await getCurrentUserWithRole();
  if (!user || (user.role !== "ORG_MEMBER" && user.role !== "PLATFORM_ADMIN")) {
    return { error: "Unauthorized: Department manager credentials required." };
  }

  const adminClient = createAdminClient();

  const { data: request } = await adminClient
    .from("worker_organization_requests")
    .select("id, worker_id, organization_id, workers(user_id), organizations(name)")
    .eq("id", requestId)
    .single();

  if (!request) {
    return { error: "Request not found." };
  }

  await adminClient
    .from("worker_organization_requests")
    .update({ status: "DECLINED", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  const workerRaw = request.workers as any;
  const workerUserId = workerRaw?.user_id;
  const orgRaw = request.organizations as any;

  if (workerUserId) {
    await adminClient.from("notifications").insert({
      recipient_id: workerUserId,
      title: "Application Status Update",
      message: `Your application to join ${orgRaw?.name || "the department"} was not accepted at this time: ${reason || "Department roster is currently full."}`,
    });
  }

  revalidatePath("/org/workers");
  revalidatePath("/org");
  revalidatePath("/worker");
  return { success: true };
}

/**
 * Organization sends direct invitation to a technician
 */
export async function inviteWorkerToOrg(workerId: string, orgId?: string) {
  const user = await getCurrentUserWithRole();
  if (!user || (user.role !== "ORG_MEMBER" && user.role !== "PLATFORM_ADMIN")) {
    return { error: "Unauthorized: Department manager credentials required." };
  }

  const adminClient = createAdminClient();
  const targetOrgId = orgId || user.organizationId;

  if (!targetOrgId) {
    return { error: "Missing organization identification." };
  }

  const { data: org } = await adminClient
    .from("organizations")
    .select("name")
    .eq("id", targetOrgId)
    .single();

  const { data: worker } = await adminClient
    .from("workers")
    .select("id, user_id, organization_id")
    .eq("id", workerId)
    .single();

  if (!worker) {
    return { error: "Technician not found." };
  }

  // Check if invitation already pending
  const { data: existingInvite } = await adminClient
    .from("worker_organization_requests")
    .select("id")
    .eq("worker_id", workerId)
    .eq("organization_id", targetOrgId)
    .eq("type", "ORG_INVITATION")
    .eq("status", "PENDING")
    .maybeSingle();

  if (existingInvite) {
    return { error: "An invitation is already pending for this technician." };
  }

  const { error: insertError } = await adminClient
    .from("worker_organization_requests")
    .insert({
      worker_id: workerId,
      organization_id: targetOrgId,
      type: "ORG_INVITATION",
      status: "PENDING",
      message: `${org?.name || "A civic department"} has sent you an invitation to join their field technical team.`,
    });

  if (insertError) {
    return { error: insertError.message || "Failed to issue invitation." };
  }

  // Notify worker
  if (worker.user_id) {
    await adminClient.from("notifications").insert({
      recipient_id: worker.user_id,
      title: "Department Invitation to Join",
      message: `${org?.name || "A municipal department"} has invited you to join their official field operations squad. Review and accept in your portal.`,
    });
  }

  revalidatePath("/org/workers");
  revalidatePath("/org");
  revalidatePath("/worker");
  return { success: true };
}

/**
 * Worker responds to direct organization invitation
 */
export async function respondToOrgInvitation(requestId: string, accept: boolean) {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== "WORKER") {
    return { error: "Unauthorized: Technician credentials required." };
  }

  const adminClient = createAdminClient();

  const { data: request, error: reqError } = await adminClient
    .from("worker_organization_requests")
    .select("id, worker_id, organization_id, status, organizations(name)")
    .eq("id", requestId)
    .single();

  if (reqError || !request) {
    return { error: "Invitation not found." };
  }

  const newStatus = accept ? "ACCEPTED" : "DECLINED";

  await adminClient
    .from("worker_organization_requests")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (accept) {
    await adminClient
      .from("workers")
      .update({ organization_id: request.organization_id, is_active: true })
      .eq("id", request.worker_id);
  }

  const orgRaw = request.organizations as any;
  const orgName = orgRaw?.name || "the department";

  // Notify org admins
  const { data: orgMembers } = await adminClient
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", request.organization_id);

  if (orgMembers) {
    for (const m of orgMembers) {
      await adminClient.from("notifications").insert({
        recipient_id: m.user_id,
        title: accept ? "Technician Accepted Invitation" : "Technician Declined Invitation",
        message: `${user.fullName || "Field technician"} has ${accept ? "accepted" : "declined"} your department's invitation to join ${orgName}.`,
      });
    }
  }

  revalidatePath("/worker");
  revalidatePath("/org/workers");
  revalidatePath("/org");
  return { success: true };
}
