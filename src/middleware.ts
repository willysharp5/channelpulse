import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/auth/callback",
  "/landing",
  "/demo",
  "/account/recover-deletion",
  "/api/account/cancel-deletion",
  "/api/webhooks",
  "/api/gdpr",
  "/api/stripe/webhook",
  "/api/sync/cron",
  "/api/import/cron",
  "/api/cron/import-jobs-retention",
  "/api/email/weekly-digest",
  "/verify-email",
];

/** Domains that serve only the public marketing site. */
const MARKETING_HOSTNAMES = [
  "channelpulse.us",
  "www.channelpulse.us",
];

/** Marketing-only pages (accessible on any domain). */
const MARKETING_ROUTES = ["/landing", "/about", "/privacy", "/terms"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";
  const isMarketingDomain = MARKETING_HOSTNAMES.includes(hostname);

  // ── Marketing domain (channelpulse.us) ──────────────────────────────────
  // Serve the landing page for every path; only marketing routes are allowed.
  if (isMarketingDomain) {
    // Root → serve landing page
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/landing", request.url));
    }
    // Known marketing routes → pass through
    if (MARKETING_ROUTES.some((r) => pathname.startsWith(r))) {
      return NextResponse.next();
    }
    // Anything else on the marketing domain → redirect to landing
    return NextResponse.redirect(new URL("https://channelpulse.us", request.url));
  }

  // ── App domain (app.channelpulse.us) ────────────────────────────────────
  // Root on app domain: redirect straight to landing if not logged in,
  // otherwise serve the dashboard.
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return await updateSession(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname === "/") {
    if (!user) {
      return NextResponse.redirect(new URL("https://channelpulse.us", request.url));
    }
    return response;
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const isOAuth = user.app_metadata?.provider !== "email";
  if (!isOAuth && !user.email_confirmed_at && pathname !== "/verify-email") {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  if (pathname.startsWith("/admin")) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      console.error("[admin-guard] SUPABASE_SERVICE_ROLE_KEY is not set");
      return NextResponse.redirect(new URL("/", request.url));
    }
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
