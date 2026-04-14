"use client";
import { useEffect, useState } from "react";

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return view;
}

export type PushState = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "error";

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("unsubscribed");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Check Push API availability (requires iOS 16.4+ as PWA)
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }

    // Register service worker on mount
    navigator.serviceWorker.register("/sw.js").catch((e) =>
      console.error("[sw] registration failed:", e)
    );

    // Sync current subscription state
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setState("subscribed");
      } else if (Notification.permission === "denied") {
        setState("denied");
      }
    });
  }, []);

  const subscribe = async () => {
    if (!("serviceWorker" in navigator) || !("Notification" in window) || !PUBLIC_VAPID_KEY) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // iOS requires an explicit Notification.requestPermission() call
      // triggered synchronously from a user gesture before pushManager.subscribe()
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (res.ok) {
        setState("subscribed");
      } else {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[push] subscribe error:", msg);
      if (Notification.permission === "denied") {
        setState("denied");
      } else {
        setState("error");
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!("serviceWorker" in navigator)) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } finally {
      setLoading(false);
    }
  };

  return { state, loading, errorMsg, subscribe, unsubscribe };
}

