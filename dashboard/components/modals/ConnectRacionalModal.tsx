"use client";

import { useState } from "react";

interface ConnectRacionalModalProps {
  open: boolean;
  syncing: boolean;
  error: string | null;
  onClose: () => void;
  onConnect: (email: string, password: string, replaceSold: boolean) => void;
}

export function ConnectRacionalModal({
  open,
  syncing,
  error,
  onClose,
  onConnect,
}: ConnectRacionalModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [replaceSold, setReplaceSold] = useState(false);

  if (!open) return null;

  function handleClose() {
    if (syncing) return;
    setEmail(""); setPassword(""); setShowPw(false); setReplaceSold(false);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim() && password) onConnect(email.trim(), password, replaceSold);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 animate-backdropIn"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm animate-scaleIn overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Racional header band ──────────────────────────────────────── */}
        <div className="bg-[#18DAAE] px-6 pt-6 pb-5 flex flex-col items-center gap-1">
          {/* Logo — white background pill so it's legible in any theme */}
          <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
            <img
              src="https://app.racional.cl/assets/img/racional-black.svg"
              alt="Racional"
              className="h-6 w-auto"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                const fallback = el.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "block";
              }}
            />
            {/* Fallback text logo */}
            <span className="hidden text-lg font-extrabold tracking-tight text-black">
              racional
            </span>
          </div>
          <p className="text-sm text-black/70 font-medium mt-1 text-center">
            Importa tu portfolio en un click
          </p>
        </div>

        {/* ── Form ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} autoComplete="off" className="px-6 pt-5 pb-2 flex flex-col gap-3">
          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="new-password"
              disabled={syncing}
              required
              className="rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-2.5 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#A0D800] disabled:opacity-50 transition"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">
                Contraseña
              </label>
              <a
                href="https://app.racional.cl/forgot-password"
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={-1}
                className="text-xs text-gray-400 hover:text-[#13ab87] transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={syncing}
                required
                className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-2.5 pr-11 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#A0D800] disabled:opacity-50 transition"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPw ? (
                  // eye-slash
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  // eye
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* Replace sold option */}
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={replaceSold}
              onChange={(e) => setReplaceSold(e.target.checked)}
              disabled={syncing}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-neutral-600 accent-[#18DAAE] disabled:opacity-50 cursor-pointer"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Eliminar activos vendidos
              </span>
              <span className="text-[11px] text-gray-400 dark:text-neutral-500 leading-snug">
                {replaceSold
                  ? "Los activos que ya no están en Racional serán eliminados del portfolio."
                  : "Los activos que ya no están en Racional quedarán marcados como vendidos (en naranja)."}
              </span>
            </div>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={syncing || !email || !password}
            className="w-full mt-1 rounded-xl py-3 font-semibold text-sm text-black bg-[#18DAAE] hover:bg-[#91C700] active:scale-95 disabled:opacity-50 transition-all duration-150"
          >
            {syncing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Sincronizando…
              </span>
            ) : (
              "Conectar e importar"
            )}
          </button>

          <button
            type="button"
            onClick={handleClose}
            disabled={syncing}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors text-center py-1 disabled:opacity-40"
          >
            Cancelar
          </button>
        </form>

        {/* ── Privacy note ─────────────────────────────────────────────── */}
        <p className="px-6 pb-5 text-[11px] text-gray-400 dark:text-neutral-500 text-center leading-snug">
          🔒 Tus credenciales viajan directamente a tu servidor local y nunca se almacenan ni se envían a terceros.
        </p>
      </div>
    </div>
  );
}
