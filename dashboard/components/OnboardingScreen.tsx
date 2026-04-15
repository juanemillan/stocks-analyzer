"use client";
import { BulliaLogo } from "@/components/BulliaLogo";
import type { Lang } from "@/app/types";

interface Props {
  lang: Lang;
  onDone: () => void;
}

const STEPS = {
  es: [
    { icon: "📊", title: "Ranking inteligente", desc: "Más de 500 activos ordenados por score compuesto de momentum, liquidez y tendencia técnica." },
    { icon: "⚡", title: "Turnarounds & Compounders", desc: "Detectamos rebotes desde mínimos de 52 semanas y activos con crecimiento compuesto históricamente sostenido." },
    { icon: "💼", title: "Tu cartera en tiempo real", desc: "Añade tus posiciones, conecta Racional y sigue tu P&L actualizado con precios de mercado." },
    { icon: "🔔", title: "Alertas personalizadas", desc: "Configura stop-loss, take-profit o alertas de precio para cualquier activo. Recibirás push notifications." },
  ],
  en: [
    { icon: "📊", title: "Smart ranking", desc: "500+ assets ranked by a composite score of momentum, liquidity, and technical trend." },
    { icon: "⚡", title: "Turnarounds & Compounders", desc: "We detect bounces from 52-week lows and assets with historically sustained compound growth." },
    { icon: "💼", title: "Your portfolio, live", desc: "Add your positions, connect Racional, and track your P&L updated with live market prices." },
    { icon: "🔔", title: "Custom alerts", desc: "Set stop-loss, take-profit, or price alerts for any asset. You'll receive push notifications." },
  ],
};

export function OnboardingScreen({ lang, onDone }: Props) {
  const steps = STEPS[lang];
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 animate-fadeIn">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo + tagline */}
        <div className="flex flex-col items-center gap-3">
          <BulliaLogo className="h-10" />
          <p className="text-sm text-gray-500 text-center">
            {lang === "es" ? "El dashboard que los inversores independientes merecen." : "The dashboard independent investors deserve."}
          </p>
        </div>

        {/* Feature list */}
        <div className="w-full space-y-3">
          {steps.map((s) => (
            <div key={s.title} className="flex items-start gap-3 bg-white dark:bg-neutral-900 border dark:border-neutral-700 rounded-2xl px-4 py-3 shadow-sm">
              <span className="text-xl flex-none mt-0.5">{s.icon}</span>
              <div>
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onDone}
          className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold text-sm transition-all duration-150 shadow-md"
        >
          {lang === "es" ? "Empezar →" : "Get started →"}
        </button>

        <p className="text-[10px] text-gray-400 text-center max-w-xs">
          {lang === "es"
            ? "⚠️ Bullia es una herramienta informativa. No constituye asesoramiento financiero."
            : "⚠️ Bullia is an informational tool. Not financial advice."}
        </p>
      </div>
    </div>
  );
}
