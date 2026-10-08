import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { FooterWrapper } from "@/components/layout/footer-wrapper";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ResolveAI — Verified Digital Grievance Management Platform",
  description:
    "An open, transparent, and accountable civic grievance resolution infrastructure. AI triage, GPS Haversine verification, and human organization resolution.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserWithRole();
  let unreadCount = 0;

  if (user) {
    try {
      const adminClient = createAdminClient();
      const { count } = await adminClient
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
      unreadCount = count || 0;
    } catch {
      unreadCount = 0;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500 selection:text-white transition-colors overflow-x-clip max-w-[100vw]">
        <Navbar
          userRole={user?.role || null}
          userEmail={user?.email || null}
          unreadCount={unreadCount}
        />
        <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-clip">{children}</main>
        <FooterWrapper isLoggedIn={!!user} />
      </body>
    </html>
  );
}
