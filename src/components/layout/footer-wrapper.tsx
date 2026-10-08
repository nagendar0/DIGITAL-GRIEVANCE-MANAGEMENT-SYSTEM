"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";

interface FooterWrapperProps {
  isLoggedIn?: boolean;
}

/**
 * Conditionally renders the marketing footer.
 * The marketing footer is ONLY displayed on the public landing page (/) for non-logged-in visitors.
 * It is completely hidden on:
 * - Login, Register, and Organization Onboarding pages (/login, /register, etc.)
 * - All authenticated workspaces (/citizen, /org, /worker, /admin, /notifications)
 * - Any page when the user is logged in
 */
export function FooterWrapper({ isLoggedIn = false }: FooterWrapperProps) {
  const pathname = usePathname();

  // The marketing footer should strictly only show on the landing page for unauthenticated visitors
  const isLandingPage = pathname === "/";

  if (!isLandingPage || isLoggedIn) {
    return null;
  }

  return <Footer />;
}

