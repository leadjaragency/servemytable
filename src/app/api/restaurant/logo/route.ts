import { NextResponse } from "next/server";
import { getRequiredSession, getRestaurantIdFromSession, getPrismaForSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const BUCKET      = "restaurant-logos";
const MAX_BYTES   = 2 * 1024 * 1024; // 2 MB
const ALLOWED     = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export async function POST(req: Request) {
  try {
    const session = await getRequiredSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurantId = getRestaurantIdFromSession(session);
    const db = getPrismaForSession(session);

    const form = await req.formData();
    const file = form.get("logo") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED.includes(file.type))
      return NextResponse.json({ error: "Only JPG, PNG, WebP, or SVG allowed" }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "File must be under 2 MB" }, { status: 400 });

    const ext    = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
    const path   = `${restaurantId}/logo.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = getSupabaseAdmin();
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });
    if (uploadErr) throw uploadErr;

    // Cache-bust so browsers pick up the new image immediately
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const logoUrl = `${publicUrl}?t=${Date.now()}`;

    await db.restaurant.update({ where: { id: restaurantId }, data: { logoUrl } });

    return NextResponse.json({ logoUrl });
  } catch (err) {
    console.error("[POST /api/restaurant/logo]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getRequiredSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurantId = getRestaurantIdFromSession(session);
    const db = getPrismaForSession(session);

    const supabase = getSupabaseAdmin();
    await supabase.storage
      .from(BUCKET)
      .remove(["jpg", "jpeg", "png", "webp", "svg"].map((e) => `${restaurantId}/logo.${e}`));

    await db.restaurant.update({ where: { id: restaurantId }, data: { logoUrl: null } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/restaurant/logo]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
