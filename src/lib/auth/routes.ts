import { UserRole } from "@/types/state-machine";

/**
 * Returns the canonical dashboard route for a given user role.
 * Handles both strict UserRole types and any legacy/aliased strings.
 */
export function getDashboardRoute(role?: UserRole | string | null): string {
  if (role === "ORG_MEMBER" || role === "ORGANIZATION") {
    return "/org";
  }
  if (role === "WORKER") {
    return "/worker";
  }
  if (role === "PLATFORM_ADMIN" || role === "ADMIN") {
    return "/admin";
  }
  return "/citizen";
}
