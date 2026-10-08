"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markNotificationAsRead(notificationId: string) {
  const user = await getCurrentUserWithRole();
  if (!user) {
    return { error: "Unauthenticated." };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("recipient_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsAsRead() {
  const user = await getCurrentUserWithRole();
  if (!user) {
    return { error: "Unauthenticated." };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/notifications");
  return { success: true };
}
