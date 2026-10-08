import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Protect internal routes if unauthenticated
  const protectedRoutes = ["/citizen", "/org", "/worker", "/admin"];
  const isProtected = protectedRoutes.some((route) => path.startsWith(route));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  }

  // If already authenticated and visiting auth pages, redirect to appropriate role dashboard
  // unless user explicitly passed role/switch params to log into another category
  const authRoutes = ["/login", "/register"];
  if (user && authRoutes.includes(path)) {
    const hasExplicitRole =
      request.nextUrl.searchParams.has("role") ||
      request.nextUrl.searchParams.has("switch") ||
      request.nextUrl.searchParams.has("category");

    if (!hasExplicitRole) {
      const userRole = (user.user_metadata?.role as string) || "";
      const explicitRedirect =
        request.nextUrl.searchParams.get("redirect") ||
        request.nextUrl.searchParams.get("next");

    if (userRole === "ORG_MEMBER") {
      if (explicitRedirect && explicitRedirect.startsWith("/org")) {
        return NextResponse.redirect(new URL(explicitRedirect, request.url));
      }
      return NextResponse.redirect(new URL("/org", request.url));
    }
    if (userRole === "WORKER") {
      if (explicitRedirect && explicitRedirect.startsWith("/worker")) {
        return NextResponse.redirect(new URL(explicitRedirect, request.url));
      }
      return NextResponse.redirect(new URL("/worker", request.url));
    }
    if (userRole === "PLATFORM_ADMIN") {
      if (explicitRedirect && explicitRedirect.startsWith("/admin")) {
        return NextResponse.redirect(new URL(explicitRedirect, request.url));
      }
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Default to citizen
    if (explicitRedirect && explicitRedirect.startsWith("/citizen")) {
      return NextResponse.redirect(new URL(explicitRedirect, request.url));
    }
    return NextResponse.redirect(new URL("/citizen", request.url));
  }
}

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
