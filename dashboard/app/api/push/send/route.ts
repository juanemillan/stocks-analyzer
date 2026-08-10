import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const vapidSubject = process.env.VAPID_SUBJECT;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "push_not_configured" }, { status: 503 });
  }

  // Set VAPID details here (not at module level) so env vars are available at runtime
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.slice(0, 120) : "Bullia Test";
  const message = body.body ?? "Push notifications are working! 🎉";

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "No subscriptions found for your account. Enable notifications first." }, { status: 404 });
  }

  const payload = JSON.stringify({ title, body: message, url: "/" });
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ sent, failed, total: subs.length });
}
