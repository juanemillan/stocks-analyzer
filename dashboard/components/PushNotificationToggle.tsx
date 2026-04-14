"use client";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function BellIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function PushNotificationToggle() {
  const { state, loading, subscribe, unsubscribe } = usePushNotifications();

  if (state === "unsupported") return null;

  if (state === "denied") {
    return (
      <div className="text-xs text-muted-foreground px-3 py-2">
        Notifications blocked — enable in browser settings
      </div>
    );
  }

  const isSubscribed = state === "subscribed";

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      title={isSubscribed ? "Disable push notifications" : "Enable push notifications"}
      className={[
        "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
        isSubscribed
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
          : "bg-muted text-muted-foreground hover:bg-muted/80",
        loading ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <BellIcon filled={isSubscribed} />
      {loading
        ? "..."
        : isSubscribed
        ? "Notifications on"
        : "Enable notifications"}
    </button>
  );
}
