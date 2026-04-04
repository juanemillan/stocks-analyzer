"use client";

import { useState } from "react";

interface RequestAssetModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (symbol: string, reason: string) => Promise<void>;
}

export function RequestAssetModal({ open, onClose, onSubmit }: RequestAssetModalProps) {
  const [symbol, setSymbol] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleClose() {
    if (loading) return;
    setSymbol(""); setReason(""); setDone(false); setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(sym, reason.trim());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud");
    } finally {
      setLoading(false);
    }
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
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b dark:border-neutral-700 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base">Solicitar activo</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              ¿No encuentras un ticker? Pídenos que lo agreguemos.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-sm">¡Solicitud enviada!</p>
              <p className="text-xs text-gray-500">Revisaremos tu pedido y agregaremos el activo pronto.</p>
              <button
                onClick={handleClose}
                className="mt-2 rounded-xl px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Símbolo / Ticker <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="Ej: AAPL, GME.WS, BTC-USD"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60 font-mono tracking-wider"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  ¿Por qué quieres agregarlo? <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Tengo posición en Racional y no aparece en el dashboard"
                  rows={3}
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60 resize-none"
                />
              </div>
              {error && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-neutral-700 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !symbol.trim()}
                  className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Enviando…
                    </>
                  ) : "Enviar solicitud"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
