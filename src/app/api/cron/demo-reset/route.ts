export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resetDemoData } from "@/lib/demo-seed";

// ---------------------------------------------------------------------------
// GET /api/cron/demo-reset
// Runs daily (scheduled via vercel.json cron).
// Wipes the public demo restaurant's transactional data and re-seeds a fresh
// set of live orders + reviews so the open demo always looks clean and active.
// Protected by CRON_SECRET so only Vercel Cron (or an authorized caller) runs it.
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resetDemoData();
    if (!result) {
      return NextResponse.json(
        { ok: false, message: "No demo restaurant configured." },
        { status: 200 }
      );
    }
    return NextResponse.json({
      ok: true,
      ...result,
      resetAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/demo-reset]", err);
    return NextResponse.json(
      { ok: false, error: "Demo reset failed." },
      { status: 500 }
    );
  }
}
