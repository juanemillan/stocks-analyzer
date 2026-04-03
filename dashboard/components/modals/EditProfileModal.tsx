"use client";
import { t } from "@/app/i18n";
import type { Lang } from "@/app/types";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  userEmail: string | null;
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
  lang: Lang;
}

export function EditProfileModal({
  open,
  onClose,
  userEmail,
  editName,
  setEditName,
  editLastName,
  setEditLastName,
  editAgeRange,
  setEditAgeRange,
  editExperience,
  setEditExperience,
  editRiskTolerance,
  setEditRiskTolerance,
  editSaving,
  onSave,
  lang,
}: EditProfileModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-backdropIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="font-bold text-base">{t("editProfile", lang)}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-neutral-800 transition-all duration-150">&times;</button>
        </div>
        <div className="px-6 pb-6 flex flex-col gap-3 overflow-y-auto max-h-[70vh]">
          <div className="text-xs text-gray-500 pb-1 border-b">{userEmail}</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder={lang === "es" ? "Nombre" : "First name"}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            />
            <input
              type="text"
              placeholder={lang === "es" ? "Apellido" : "Last name"}
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <select
            value={editAgeRange}
            onChange={(e) => setEditAgeRange(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">{lang === "es" ? "Rango de edad" : "Age range"}</option>
            <option value="18-25">18 – 25</option>
            <option value="26-35">26 – 35</option>
            <option value="36-45">36 – 45</option>
            <option value="46-55">46 – 55</option>
            <option value="55+">55+</option>
          </select>
          <select
            value={editExperience}
            onChange={(e) => setEditExperience(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">{lang === "es" ? "Experiencia inversora" : "Investment experience"}</option>
            <option value="beginner">{lang === "es" ? "Principiante" : "Beginner"}</option>
            <option value="intermediate">{lang === "es" ? "Intermedio" : "Intermediate"}</option>
            <option value="advanced">{lang === "es" ? "Avanzado" : "Advanced"}</option>
          </select>
          <select
            value={editRiskTolerance}
            onChange={(e) => setEditRiskTolerance(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">{lang === "es" ? "Tolerancia al riesgo" : "Risk tolerance"}</option>
            <option value="conservative">{lang === "es" ? "Conservador" : "Conservative"}</option>
            <option value="moderate">{lang === "es" ? "Moderado" : "Moderate"}</option>
            <option value="aggressive">{lang === "es" ? "Agresivo" : "Aggressive"}</option>
          </select>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-xl py-2 border text-sm hover:bg-gray-50 transition-all duration-150 active:scale-[0.98]">
              {t("editCancel", lang)}
            </button>
            <button
              onClick={onSave}
              disabled={editSaving}
              className="flex-1 rounded-xl py-2 bg-black text-white text-sm hover:opacity-90 disabled:opacity-50 transition-opacity duration-150 active:scale-[0.98]"
            >
              {editSaving ? "…" : t("editSave", lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
