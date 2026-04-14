#!/usr/bin/env python3
"""
send_push.py — Send a push notification to all subscribed devices.

Usage:
    python data_pipeline/send_push.py
    python data_pipeline/send_push.py --title "MSTR 📊" --body "Score upgraded today!"
    python data_pipeline/send_push.py --user <user_id>  # target specific user
"""
import os
import sys
import json
import argparse

os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
VAPID_PRIVATE_KEY = os.environ["VAPID_PRIVATE_KEY"]
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:jmillanstudio@gmail.com")
DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "https://bullia.app")
NEXT_PUBLIC_VAPID_PUBLIC_KEY = os.environ["NEXT_PUBLIC_VAPID_PUBLIC_KEY"]

try:
    from pywebpush import webpush, WebPushException
except ImportError:
    sys.exit("pywebpush not installed. Run: pip install pywebpush")

try:
    from supabase import create_client
except ImportError:
    sys.exit("supabase not installed. Run: pip install supabase")


def send(title: str, body: str, user_id: str | None = None) -> None:
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    query = sb.from_("push_subscriptions").select("user_id, endpoint, p256dh, auth")
    if user_id:
        query = query.eq("user_id", user_id)
    subs = query.execute().data or []

    if not subs:
        print("No subscriptions found" + (f" for user {user_id}" if user_id else "") + ".")
        return

    print(f"Sending '{title}' to {len(subs)} subscription(s)…")
    payload = json.dumps({"title": title, "body": body, "url": DASHBOARD_URL})
    sent = 0
    stale = []

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_SUBJECT},
            )
            sent += 1
            print(f"  ✓ {sub['endpoint'][:60]}…")
        except WebPushException as e:
            status = getattr(e.response, "status_code", None) if e.response else None
            print(f"  ✗ {sub['endpoint'][:60]}… ({status})")
            if status in (404, 410):
                stale.append(sub["endpoint"])
        except Exception as e:
            print(f"  ✗ error: {e}")

    if stale:
        sb.from_("push_subscriptions").delete().in_("endpoint", stale).execute()
        print(f"Removed {len(stale)} stale subscription(s).")

    print(f"\nDone — {sent}/{len(subs)} sent.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Send a Web Push notification")
    parser.add_argument("--title", default="Bullia 🔔", help="Notification title")
    parser.add_argument("--body",  default="Test notification from Bullia!", help="Notification body")
    parser.add_argument("--user",  default=None, help="Target a specific user_id (default: all users)")
    args = parser.parse_args()

    if args.title == "Bullia 🔔" and args.body == "Test notification from Bullia!":
        # Interactive mode when no args given
        print("── Bullia Push Sender ──────────────────")
        args.title = input("Title  [Bullia 🔔]: ").strip() or "Bullia 🔔"
        args.body  = input("Body   [Test notification!]: ").strip() or "Test notification from Bullia!"

    send(args.title, args.body, args.user)


if __name__ == "__main__":
    main()
