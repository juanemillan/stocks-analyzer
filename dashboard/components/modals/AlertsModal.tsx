"use client";
import { useState } from "react";
import { t } from "@/app/i18n";
import type { Lang } from "@/app/types";
import type { AlertRule, AlertType } from "@/hooks/useAlerts";

interface AlertsModalProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number | null;
  rules: AlertRule[];
  onUpsert: (symbol: string, type: AlertType, threshold: number) => Promise<void>;
  onRemove: (ruleId: string) => Promise<void>;
  lang: Lang;
}

const TYPE_LABELS: Record<AlertType, { en: string; es: string; icon: string }> = {
  stop_loss:   { en: "Stop-loss (P&L %)",      es: "Stop-loss (P&L %)",       icon: "🔴" },
  take_profit: { en: "Take-profit (P&L %)",     es: "Ganancia objetivo (P&L %)", icon: "💰" },
  price_above: { en: "Price target (above)",    es: "Precio objetivo (sube)",  icon: "📈" },
  price_below: { en: "Price alert (below)",     es: "Alerta de precio (baja)", icon: "📉" },
};

const PLACEHOLDER: Record<AlertType, string> = {
  stop_loss:   "-20   (fires when P&L ≤ −20%)",
  take_profit: "50    (fires when P&L ≥ +50%)",
  price_above: "250   (fires when price ≥ $250)",
  price_below: "150   (fires when price ≤ $150)",
};

export function AlertsModal({
  open,
  onClose,
  symbol,
  currentPrice,
  rules,
  onUpsert,
  onRemove,
  lang,
}: AlertsModalProps) {
  const [selectedType, setSelectedType] = useState<AlertType>("stop_loss");
  const [thresholdStr, setThresholdStr] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSave() {
    const val = parseFloat(thresholdStr);
    if (isNaN(val)) { setError(lang === "es" ? "Ingresa un número válido." : "Enter a valid number."); return; }
    setSaving(true);
    setError(null);
    try {
      await onUpsert(symbol, selectedType, val);
      setThresholdStr("");
    } catch {
      setError(lang === "es" ? "Error al guardar." : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-backdropIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-neutral-700">
          <div>
            <h2 className="font-semibold text-base">
              {lang === "es" ? "Alertas" : "Alerts"} · {symbol}
            </h2>
            {currentPrice != null && (
              <p className="text-xs text-gray-500 mt-0.5">
                {lang === "es" ? "Precio actual" : "Current price"}: ${currentPrice.toFixed(2)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              {lang === "es" ? "Tipo de alerta" : "Alert type"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TYPE_LABELS) as AlertType[]).map((type) => {
                const lbl = TYPE_LABELS[type];
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      selectedType === type
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {lbl.icon} {lang === "es" ? lbl.es : lbl.en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Threshold input */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              {selectedType === "stop_loss" || selectedType === "take_profit"
                ? (lang === "es" ? "Umbral (%" : "Threshold (%)")
                : (lang === "es" ? "Precio ($)" : "Price ($)")}
            </label>
            <input
              type="number"
              value={thresholdStr}
              onChange={(e) => setThresholdStr(e.target.value)}
              placeholder={PLACEHOLDER[selectedType]}
              className="w-full border dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !thresholdStr}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? (lang === "es" ? "Guardando…" : "Saving…") : (lang === "es" ? "Guardar alerta" : "Save alert")}
          </button>
        </div>

        {/* Existing rules */}
        {rules.length > 0 && (
          <div className="px-5 pb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {lang === "es" ? "Alertas activas" : "Active alerts"}
            </p>
            <ul className="space-y-1.5">
              {rules.map((r) => {
                const lbl = TYPE_LABELS[r.type as AlertType];
                const isPercent = r.type === "stop_loss" || r.type === "take_profit";
                return (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span>{lbl?.icon}</span>
                      <span className="font-medium">{isPercent ? `${r.threshold > 0 ? "+" : ""}${r.threshold}%` : `$${r.threshold}`}</span>
                      <span className="text-gray-400 text-xs">{lang === "es" ? lbl?.es : lbl?.en}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {r.triggered_at && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {lang === "es" ? "Disparada" : "Fired"}
                        </span>
                      )}
                      <button
                        onClick={() => onRemove(r.id)}
                        className="text-gray-400 hover:text-red-500 text-xs transition-colors"
                        title={lang === "es" ? "Eliminar" : "Delete"}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
