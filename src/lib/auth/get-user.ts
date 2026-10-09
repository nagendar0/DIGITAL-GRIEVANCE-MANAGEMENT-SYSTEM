import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserRole } from "@/types/state-machine";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string | null;
  organizationId?: string | null;
  workerId?: string | null;
  isWorker?: boolean;
  isOrgMember?: boolean;
  isCitizen?: boolean;
}

/**
 * Derives current user and verified role from session JWT + database records.
 * Uses admin client to guarantee reliable role resolution regardless of RLS timing.
 */
export async function getCurrentUserWithRole(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const adminClient = createAdminClient();

    // 1. Fetch user's profile record
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, full_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    let organizationId: string | null = null;
    let workerId: string | null = null;

    // 2. Check if user is a registered Field Worker
    const { data: worker } = await adminClient
      .from("workers")
      .select("id, organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (worker) {
      workerId = worker.id;
      organizationId = worker.organization_id;
    }

    // 3. Check if user is an Organization Member / Administrator
    const { data: member } = await adminClient
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (member) {
      organizationId = member.organization_id;
    }

    // 4. Resolve active role: respect explicit profile role if set, else infer
    let role: UserRole = (profile?.role as UserRole) || (user.user_metadata?.role as UserRole);
    if (!role) {
      if (member) {
        role = "ORG_MEMBER";
      } else if (worker) {
        role = "WORKER";
      } else {
        role = "CITIZEN";
      }
    }

    // Platform Admin check from user metadata or profile
    if (profile?.role === "PLATFORM_ADMIN" || user.user_metadata?.role === "PLATFORM_ADMIN") {
      role = "PLATFORM_ADMIN";
    }

    if (!profile) {
      // Upsert profile if missing
      await adminClient.from("profiles").upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || "User",
        phone: user.user_metadata?.phone || null,
        role: role,
        updated_at: new Date().toISOString(),
      });
    }

    return {
      id: user.id,
      email: user.email || "",
      role,
      fullName: profile?.full_name || user.user_metadata?.full_name || "User",
      phone: profile?.phone || user.user_metadata?.phone || null,
      organizationId,
      workerId,
      isWorker: !!worker,
      isOrgMember: !!member,
      isCitizen: true,
    };
  } catch (error) {
    console.error("Error retrieving user with verified role:", error);
    return null;
  }
}

/**
 * Searches for an existing Supabase Auth user by email address (case-insensitive)
 * Supports pagination to ensure no user accounts are missed.
 */
export async function getExistingAuthUserByEmail(email: string) {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) return null;

  try {
    const adminClient = createAdminClient();
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data: userList, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error || !userList?.users || userList.users.length === 0) {
        break;
      }

      const matched = userList.users.find(
        (u) => u.email?.trim().toLowerCase() === cleanEmail
      );
      if (matched) {
        return matched;
      }

      if (userList.users.length < perPage) {
        break;
      }
      page++;
    }

    return null;
  } catch (err) {
    console.error("Error looking up auth user by email:", err);
    return null;
  }
}

