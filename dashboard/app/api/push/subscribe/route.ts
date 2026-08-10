import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const subscription = body?.subscription;
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;
  if (typeof endpoint !== "string" || endpoint.length > 4_096 ||
      typeof keys?.p256dh !== "string" || typeof keys?.auth !== "string" ||
      !keys.p256dh || !keys.auth) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: "user_id,endpoint" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (typeof endpoint !== "string" || !endpoint || endpoint.length > 4_096) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
