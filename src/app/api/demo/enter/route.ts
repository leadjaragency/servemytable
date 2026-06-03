export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// GET /api/demo/enter
// Public, no-login entry point to the demo restaurant's admin dashboard.
// Signs the browser in as the demo owner (server-side) and redirects to /admin.
// Only works while a restaurant is flagged isPublicDemo.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const demo = await prisma.restaurant.findFirst({
    where: { isPublicDemo: true },
    select: { id: true, status: true },
  });
  if (!demo || demo.status !== "active") {
    return NextResponse.json(
      { error: "No active demo restaurant is configured." },
      { status: 404 }
    );
  }

  // These are the intentionally-public demo-restaurant credentials. The same
  // values already live in scripts/create-demo-owner.ts; env vars override them.
  const email = process.env.DEMO_OWNER_EMAIL ?? "owner@saffronpalace.com";
  const password = process.env.DEMO_OWNER_PASSWORD ?? "saffron2024";

  // Bind Supabase auth cookies to the redirect response so the session
  // is attached when the browser lands on /admin.
  const redirectResponse = NextResponse.redirect(new URL("/admin", req.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("[demo/enter] sign-in failed:", error.message);
    return NextResponse.json(
      { error: "Demo sign-in failed. Please try again." },
      { status: 500 }
    );
  }

  return redirectResponse;
}
