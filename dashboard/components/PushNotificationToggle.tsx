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
  const { state, loading, errorMsg, testStatus, subscribe, unsubscribe, sendTest } = usePushNotifications();

  if (state === "unsupported") return null;

  if (state === "denied") {
    return (
      <span className="text-xs text-orange-500 dark:text-orange-400">
        Bloqueadas — habilita en configuración del sistema
      </span>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={subscribe}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <BellIcon />
          Reintentar
        </button>
        {errorMsg && (
          <span className="text-xs text-red-500 dark:text-red-400 px-1">{errorMsg}</span>
        )}
      </div>
    );
  }

  const isSubscribed = state === "subscribed";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={loading}
        title={isSubscribed ? "Desactivar notificaciones" : "Activar notificaciones"}
        className={[
          "flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
          isSubscribed
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
          loading ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
      >
        <BellIcon filled={isSubscribed} />
        {loading ? "..." : isSubscribed ? "Notif. activas" : "Activar notificaciones"}
      </button>
      {isSubscribed && (
        <button
          onClick={sendTest}
          disabled={testStatus === "sending"}
          className="min-h-10 rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          {testStatus === "sending" ? "Enviando…" : "Enviar prueba"}
        </button>
      )}
      {testStatus === "sent" && <span className="w-full text-xs text-emerald-700 dark:text-emerald-300">Prueba enviada. Revisa la notificación de este dispositivo.</span>}
      {testStatus === "error" && errorMsg && <span className="w-full text-xs text-red-500">{errorMsg}</span>}
    </div>
  );
}
