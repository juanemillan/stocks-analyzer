"use client";
import React, { useState } from "react";
import { t } from "@/app/i18n";
import type { Lang } from "@/app/types";
import ThemeToggle from "@/components/ThemeToggle";
import { LangToggle } from "@/components/LangToggle";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";

interface ProfileTabProps {
  lang: Lang;
  setLang: (v: Lang) => void;
  userEmail: string | null;
  userDisplayName: string | null;
  editName: string;
  setEditName: (v: string) => void;
  editLastName: string;
  setEditLastName: (v: string) => void;
  editAgeRange: string;
  setEditAgeRange: (v: string) => void;
  editExperience: string;
  setEditExperience: (v: string) => void;
  editRiskTolerance: string;
  setEditRiskTolerance: (v: string) => void;
  editSaving: boolean;
  onSave: () => void;
  onSignOut: () => void;
  onShowLegend: () => void;
  onReload: () => void;
  loading?: boolean;
}

const AGE_RANGES   = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const EXPERIENCES  = ["beginner", "intermediate", "advanced", "professional"] as const;
const RISK_LEVELS  = ["conservative", "moderate", "aggressive"] as const;

export function ProfileTab({
  lang, setLang,
  userEmail, userDisplayName,
  editName, setEditName,
  editLastName, setEditLastName,
  editAgeRange, setEditAgeRange,
  editExperience, setEditExperience,
  editRiskTolerance, setEditRiskTolerance,
  editSaving, onSave,
  onSignOut, onShowLegend, onReload, loading,
}: ProfileTabProps) {
  const [section, setSection] = useState<"settings" | "info" | null>(null);

  const initial = (userDisplayName || userEmail || "?").charAt(0).toUpperCase();
  const expLabel = (v: string) => ({ beginner: lang === "es" ? "Principiante" : "Beginner", intermediate: lang === "es" ? "Intermedio" : "Intermediate", advanced: lang === "es" ? "Avanzado" : "Advanced", professional: lang === "es" ? "Profesional" : "Professional" }[v] ?? v);
  const riskLabel = (v: string) => ({ conservative: lang === "es" ? "Conservador" : "Conservative", moderate: lang === "es" ? "Moderado" : "Moderate", aggressive: lang === "es" ? "Agresivo" : "Aggressive" }[v] ?? v);

  return (
    <div className="max-w-sm mx-auto py-6 px-2 animate-fadeIn">

      {/* ── Avatar + name ── */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-20 h-20 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-3xl font-bold select-none shadow-lg">
          {initial}
        </div>
        {userDisplayName && (
          <div className="text-lg font-semibold text-center">{userDisplayName}</div>
        )}
        <div className="text-sm text-gray-500 text-center">{userEmail}</div>
      </div>

      {/* ── Action buttons row ── */}
      <div className="flex gap-3 justify-center mb-6">

        {/* Settings */}
        <button
          onClick={() => setSection(section === "settings" ? null : "settings")}
          className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border transition-all duration-150 ${
            section === "settings"
              ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400"
              : "bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className="text-xs font-medium">{lang === "es" ? "Ajustes" : "Settings"}</span>
        </button>

        {/* Legend / ? */}
        <button
          onClick={onShowLegend}
          className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-all duration-150"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-xs font-medium">{lang === "es" ? "Glosario" : "Glossary"}</span>
        </button>

        {/* Edit / Info */}
        <button
          onClick={() => setSection(section === "info" ? null : "info")}
          className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border transition-all duration-150 ${
            section === "info"
              ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400"
              : "bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-xs font-medium">{lang === "es" ? "Mi info" : "My info"}</span>
        </button>
      </div>

      {/* ── Settings panel ── */}
      {section === "settings" && (
        <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-700 rounded-2xl p-5 mb-4 space-y-4 animate-fadeIn">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            {lang === "es" ? "Preferencias" : "Preferences"}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">{lang === "es" ? "Idioma" : "Language"}</span>
            <LangToggle lang={lang} setLang={setLang} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">{lang === "es" ? "Tema" : "Theme"}</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">{lang === "es" ? "Actualizar datos" : "Refresh data"}</span>
            <button
              onClick={onReload}
              className="w-8 h-8 flex items-center justify-center rounded-lg border dark:border-neutral-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}>
                <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">{lang === "es" ? "Notificaciones" : "Notifications"}</span>
            <PushNotificationToggle />
          </div>
        </div>
      )}

      {/* ── User info / edit panel ── */}
      {section === "info" && (
        <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-700 rounded-2xl p-5 mb-4 animate-fadeIn">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            {lang === "es" ? "Mi información" : "My information"}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">{lang === "es" ? "Nombre" : "First name"}</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">{lang === "es" ? "Apellido" : "Last name"}</label>
                <input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="border dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">{lang === "es" ? "Rango de edad" : "Age range"}</label>
              <select
                value={editAgeRange}
                onChange={(e) => setEditAgeRange(e.target.value)}
                className="border dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">—</option>
                {AGE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">{lang === "es" ? "Experiencia" : "Experience"}</label>
              <select
                value={editExperience}
                onChange={(e) => setEditExperience(e.target.value)}
                className="border dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">—</option>
                {EXPERIENCES.map((e) => <option key={e} value={e}>{expLabel(e)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">{lang === "es" ? "Tolerancia al riesgo" : "Risk tolerance"}</label>
              <select
                value={editRiskTolerance}
                onChange={(e) => setEditRiskTolerance(e.target.value)}
                className="border dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">—</option>
                {RISK_LEVELS.map((r) => <option key={r} value={r}>{riskLabel(r)}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onSave}
                disabled={editSaving}
                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
              >
                {editSaving ? (lang === "es" ? "Guardando…" : "Saving…") : t("editSave", lang)}
              </button>
              <button
                onClick={() => setSection(null)}
                className="flex-1 py-2 rounded-xl border dark:border-neutral-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all duration-150 active:scale-[0.98]"
              >
                {t("editCancel", lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign out ── */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={onSignOut}
          className="text-sm text-red-500 hover:text-red-700 transition-colors duration-150 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95"
        >
          {t("portLogout", lang)}
        </button>
      </div>
    </div>
  );
}
