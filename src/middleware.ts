import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function redirectTo(url: string, req: NextRequest, res: NextResponse) {
  const redirectUrl = new URL(url, req.url);
  const redirect = NextResponse.redirect(redirectUrl);
  // Copy refreshed session cookies from `res` to the redirect response
  res.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value);
  });
  return redirect;
}

function jsonError(message: string, status: number, res: NextResponse) {
  const response = NextResponse.json({ error: message }, { status });
  res.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });
  return response;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Detect country from subdomain: de.servemytable.ca → DE, everything else → CA
  const host = req.headers.get("host") ?? "";
  const country = host.startsWith("de.") ? "DE" : "CA";

  // Create a response object that Supabase SSR can write refreshed cookies into.
  // We MUST return this `res` (or a response derived from it) so the browser
  // receives the updated session cookie — never return a bare NextResponse.next().
  let res = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(req.headers.entries()),
        "x-country": country,
      }),
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — this writes updated cookies if the JWT was refreshed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.user_metadata?.role as string | undefined;
  const isActive = user?.user_metadata?.isActive as boolean | undefined;
  const trialEndsAt = user?.user_metadata?.trialEndsAt as string | undefined;
  const isAuthenticated = !!user && isActive !== false;

  // Trial expiry check (for restaurant roles)
  const trialExpired =
    !!trialEndsAt && new Date(trialEndsAt) < new Date() &&
    (role === "restaurant_owner" || role === "restaurant_manager");

  // ── /auth/* ──────────────────────────────────────────────────────────────
  if (pathname.startsWith("/auth/")) {
    // Allow pending + trial-expired pages for authenticated users
    if (pathname === "/auth/pending") return res;
    if (pathname === "/auth/trial-expired") return res;
    if (pathname === "/auth/forgot-password") return res;
    if (pathname === "/auth/reset-password") return res;

    // Redirect already-authenticated users to their dashboard
    if (isAuthenticated && !trialExpired) {
      if (role === "super_admin") return redirectTo("/super-admin", req, res);
      if (role === "restaurant_owner" || role === "restaurant_manager")
        return redirectTo("/admin", req, res);
    }
    return res;
  }

  // ── / (root) ─────────────────────────────────────────────────────────────
  if (pathname === "/") {
    if (!isAuthenticated) return res;
    if (trialExpired) return redirectTo("/auth/trial-expired", req, res);
    if (role === "super_admin") return redirectTo("/super-admin", req, res);
    if (role === "restaurant_owner" || role === "restaurant_manager")
      return redirectTo("/admin", req, res);
    return res;
  }

  // ── /super-admin/* ───────────────────────────────────────────────────────
  if (pathname.startsWith("/super-admin")) {
    if (!isAuthenticated) return redirectTo("/auth/login", req, res);
    if (role !== "super_admin") return redirectTo("/auth/login", req, res);
    return res;
  }

  // ── /api/super-admin/* ───────────────────────────────────────────────────
  if (pathname.startsWith("/api/super-admin")) {
    if (!isAuthenticated) return jsonError("Unauthorized", 401, res);
    if (role !== "super_admin") return jsonError("Forbidden", 403, res);
    return res;
  }

  // ── /admin/* ─────────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) return redirectTo("/auth/login", req, res);
    if (role !== "restaurant_owner" && role !== "restaurant_manager")
      return redirectTo("/auth/login", req, res);
    if (!user.user_metadata?.restaurantId)
      return redirectTo("/auth/pending", req, res);
    if (trialExpired) return redirectTo("/auth/trial-expired", req, res);
    return res;
  }

  // ── /api/* (restaurant-scoped) ───────────────────────────────────────────
  const restaurantApiPrefixes = [
    "/api/categories",
    "/api/tables",
    "/api/waiters",
    "/api/qr",
    "/api/reviews",
    "/api/promotions",
    "/api/pos",
    "/api/restaurant",
  ];

  if (restaurantApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (!isAuthenticated) return jsonError("Unauthorized", 401, res);
    if (role !== "restaurant_owner" && role !== "restaurant_manager")
      return jsonError("Forbidden", 403, res);
    if (!user.user_metadata?.restaurantId)
      return jsonError("No restaurant", 403, res);
    if (trialExpired) return jsonError("Trial expired", 403, res);
    return res;
  }

  // ── /table/* — Customer app (public, no auth required) ───────────────────
  if (pathname.startsWith("/table")) return res;

  // ── /kitchen/* — No-login kitchen display (token-gated in the route) ─────
  if (pathname.startsWith("/kitchen")) return res;

  // ── /api/chat/*, /api/games/*, /api/kitchen/*, /api/demo/* — public ──────
  if (pathname.startsWith("/api/chat")) return res;
  if (pathname.startsWith("/api/games")) return res;
  if (pathname.startsWith("/api/kitchen")) return res;
  if (pathname.startsWith("/api/demo")) return res;

  return res;
}

// ---------------------------------------------------------------------------
// Matcher
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav)$).*)",
  ],
};
