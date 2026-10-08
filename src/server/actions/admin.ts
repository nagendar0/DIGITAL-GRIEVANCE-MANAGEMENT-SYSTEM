"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function verifyOrganization(orgId: string) {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return { error: "Unauthorized: Platform Admin credentials required." };
  }

  const adminClient = createAdminClient();

  // 1. Update organization status to VERIFIED
  const { data: org, error } = await adminClient
    .from("organizations")
    .update({
      status: "VERIFIED",
      verified_at: new Date().toISOString(),
      verified_by: user.id,
      rejection_reason: null,
    })
    .eq("id", orgId)
    .select("id, name, official_email")
    .single();

  if (error || !org) {
    return { error: error?.message || "Failed to verify organization." };
  }

  // 2. Audit log
  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "ORGANIZATION_VERIFIED",
    resource_type: "organizations",
    resource_id: orgId,
    details: { org_name: org.name, approved_by: user.fullName },
  });

  // 3. Notify organization members
  const { data: members } = await adminClient
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId);

  if (members) {
    for (const member of members) {
      await adminClient.from("notifications").insert({
        recipient_id: member.user_id,
        title: "Organization Verified",
        message: `Congratulations! ${org.name} has been officially approved by Platform Administration. You now have full operational dispatch permissions.`,
      });
    }
  }

  revalidatePath("/admin/organizations");
  revalidatePath("/admin");
  revalidatePath("/org");
  return { success: true };
}

export async function rejectOrganization(orgId: string, reason: string) {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return { error: "Unauthorized: Platform Admin credentials required." };
  }

  if (!reason || reason.trim().length < 10) {
    return { error: "Please provide a detailed rejection reason (minimum 10 characters)." };
  }

  const adminClient = createAdminClient();

  const { data: org, error } = await adminClient
    .from("organizations")
    .update({
      status: "REJECTED",
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId)
    .select("id, name")
    .single();

  if (error || !org) {
    return { error: error?.message || "Failed to reject organization." };
  }

  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "ORGANIZATION_REJECTED",
    resource_type: "organizations",
    resource_id: orgId,
    details: { org_name: org.name, rejection_reason: reason },
  });

  revalidatePath("/admin/organizations");
  revalidatePath("/admin");
  return { success: true };
}
