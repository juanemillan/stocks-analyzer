"use client";
import { useState, useCallback } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type ChatContext = {
  portfolioSummary: string;
  rankingTop: string;
};

/* ─── Mock response library ─────────────────────────────────────────────── */
const MOCK: Array<[RegExp, (lang: string) => string]> = [
  [
    /por qu[eé].*(watch|vigilancia)|(watch|vigilancia).*por qu[eé]/i,
    (l) =>
      l === "es"
        ? "Un activo entra en **Vigilancia** cuando su score compuesto está entre 0.5 y 0.7. Eso significa señales mixtas: puede tener buen momentum de corto plazo pero tendencia técnica neutral, o buena liquidez sin ruptura alcista confirmada. No es suficiente para Alta Convicción, pero tampoco para descartar. Seguilo de cerca.\n\n⚠️ *Esta información es orientativa y no constituye asesoramiento financiero.*"
        : "An asset lands in **Watch** when its composite score is between 0.5 and 0.7 — mixed signals. It may have decent short-term momentum but neutral technical trend, or good liquidity without a confirmed breakout. Not enough for High Conviction, but not worth discarding. Keep monitoring it.\n\n⚠️ *Informational only. Not financial advice.*",
  ],
  [
    /adma/i,
    (l) =>
      l === "es"
        ? "**ADMA Biologics (ADMA)** aparece en Vigilancia con score ~0.52. Tiene momentum positivo en 1 mes, pero su tendencia técnica (medias móviles) es neutral — SMA20 apenas por encima de SMA50. La liquidez es media. Para saltar a Alta Convicción necesitaría una ruptura más clara con volumen confirmando.\n\n⚠️ *Información orientativa. No es asesoramiento financiero.*"
        : "**ADMA Biologics (ADMA)** appears in Watch with score ~0.52. It has positive 1-month momentum but neutral technical trend — SMA20 barely above SMA50. Liquidity is moderate. Moving to High Conviction would need a clearer volume-confirmed breakout.\n\n⚠️ *Informational only. Not financial advice.*",
  ],
  [
    /\bscore\b|puntuaci[oó]n/i,
    (l) =>
      l === "es"
        ? "El **score** es un número entre 0 y 1 que combina tres factores:\n• **Momentum** – velocidad de subida del precio (1w, 1m, 3m)\n• **Liquidez** – volumen de operaciones promedio\n• **Tendencia técnica** – cruces de medias móviles (SMA20/50/200)\n\n≥ 0.7 → Alta Convicción · 0.5–0.7 → Vigilancia · < 0.5 → Descartar\n\n⚠️ *El score es cuantitativo y puede cometer errores. No es asesoramiento financiero.*"
        : "The **score** is a number between 0 and 1 combining three factors:\n• **Momentum** – price rise speed (1w, 1m, 3m)\n• **Liquidity** – average trading volume\n• **Technical trend** – moving average crossovers (SMA20/50/200)\n\n≥ 0.7 → High Conviction · 0.5–0.7 → Watch · < 0.5 → Discard\n\n⚠️ *The score is quantitative and may be wrong. Not financial advice.*",
  ],
  [
    /portfolio|portafolio|posici[oó]n|p&l|ganancia|p[eé]rdida/i,
    (l) =>
      l === "es"
        ? "Puedo analizar tu portfolio — decime qué activo querés revisar. Tengo en cuenta tus posiciones y P&L actuales.\n\nAlgunos indicadores que mostramos:\n• 💰 P&L ≥ 20% y técnicamente sobrecomprado (RSI > 70 o precio > 15% sobre SMA-20) → posible momento de tomar ganancia\n• 👁️ P&L ≤ −20% → revisá tu tesis de inversión\n• ⚡ Movimiento ≥ ±10% en 7 días → actividad inusual reciente\n\n⚠️ *Orientativo. No es asesoramiento financiero.*"
        : "I can analyze your portfolio — just tell me which asset you'd like to review. I have access to your positions and current P&L.\n\nSome indicators we show:\n• 💰 P&L ≥ 20% and technically overbought (RSI > 70 or >15% above SMA-20) → possible profit-taking signal\n• 👁️ P&L ≤ −20% → review your investment thesis\n• ⚡ ≥ ±10% move in 7 days → recent unusual activity\n\n⚠️ *Informational only. Not financial advice.*",
  ],
  [
    /rsi|sobrecomprado|overbought/i,
    (l) =>
      l === "es"
        ? "El **RSI de 14 períodos** mide sobrecompra (RSI > 70) o sobreventa (RSI < 30). En el portfolio, cuando RSI > 70 **y** tu P&L es ≥ 20%, aparece el ícono 💰 como señal de posible toma de ganancias. Ojo: el RSI puede mantenerse alto durante tendencias fuertes — no es una señal de venta automática.\n\n⚠️ *Orientativo. No es asesoramiento financiero.*"
        : "**14-period RSI** measures overbought (> 70) or oversold (< 30) conditions. In the portfolio, when RSI > 70 **and** your P&L is ≥ 20%, the 💰 icon appears as a potential profit-taking signal. Note: RSI can stay elevated during strong trends — it's not an automatic sell signal.\n\n⚠️ *Informational only. Not financial advice.*",
  ],
  [
    /correlaci[oó]n|diversificaci[oó]n/i,
    (l) =>
      l === "es"
        ? "La **correlación** mide qué tan sincronizados se mueven dos activos (de −1 a +1). Correlación alta (> 0.7) entre posiciones significa que suben y bajan casi al mismo tiempo — menos diversificación real. Idealmente querés posiciones con correlaciones bajas entre sí. Podés ver los clusters en el panel de Correlación dentro de tu Portfolio.\n\n⚠️ *Orientativo.*"
        : "**Correlation** measures how in-sync two assets move (-1 to +1). High correlation (> 0.7) between positions means they move almost together — less real diversification. Ideally you want low correlation across your holdings. Check the Correlation panel in your Portfolio tab.\n\n⚠️ *Informational only.*",
  ],
  [
    /momentum/i,
    (l) =>
      l === "es"
        ? "El **momentum** mide el retorno del precio en distintas ventanas temporales: 1 semana, 1 mes, 3 meses, 6 meses y 1 año. Un activo con momentum positivo en múltiples ventanas es señal de tendencia sostenida. Se compara también contra el S&P 500 (RS vs SPY) para filtrar activos que suben solo por el mercado en general.\n\n⚠️ *No es asesoramiento financiero.*"
        : "**Momentum** measures price return over multiple windows: 1 week, 1 month, 3 months, 6 months, and 1 year. Positive momentum across multiple windows signals a sustained trend. It's also compared against the S&P 500 (RS vs SPY) to filter assets rising only because the market is going up.\n\n⚠️ *Not financial advice.*",
  ],
  [
    /turnaround|recuperaci[oó]n|rebote/i,
    (l) =>
      l === "es"
        ? "Los **Turnarounds** son activos que han rebotado desde su mínimo de 52 semanas con volumen inusual. Son apuestas contrarias — mayor riesgo que el Ranking, pero mayor potencial si la recuperación se confirma. Un buen candidato tiene rebote > 20% desde el piso y vol surge > 2×. Usalos como señal de alerta temprana, no como certeza.\n\n⚠️ *No es asesoramiento financiero.*"
        : "**Turnarounds** are assets bouncing from 52-week lows with unusual volume. These are contrarian bets — higher risk than Ranking, but greater upside if recovery confirms. A good candidate has > 20% rebound from the floor and vol surge > 2×. Use as early warning signals, not certainties.\n\n⚠️ *Not financial advice.*",
  ],
  [
    /compounder|cagr|crecimiento compuesto/i,
    (l) =>
      l === "es"
        ? "Los **Compounders** son activos con crecimiento compuesto históricamente sostenido. Se miden por CAGR (retorno anual), % de meses positivos (consistencia) y Max Drawdown (peor caída). Un compounder ideal tiene CAGR > 15%, meses positivos > 60% y drawdown máximo mejor que −30%. Son apuestas de largo plazo.\n\n⚠️ *No es asesoramiento financiero.*"
        : "**Compounders** are assets with historically sustained compound growth, measured by CAGR (annualized return), % positive months (consistency), and Max Drawdown (worst drop). An ideal compounder has CAGR > 15%, positive months > 60%, and max drawdown better than −30%. These are long-term bets.\n\n⚠️ *Not financial advice.*",
  ],
];

function getMockResponse(input: string, lang: string): string {
  for (const [pattern, fn] of MOCK) {
    if (pattern.test(input)) return fn(lang);
  }
  const preview = input.length > 45 ? input.slice(0, 45) + "…" : input;
  return lang === "es"
    ? `Eso es una buena pregunta. Estoy en **modo demo** por ahora — cuando el modelo real esté conectado podré responder sobre "${preview}" con datos actualizados del mercado y tu portfolio específico. 🤖\n\n⚠️ *Esto es una demostración. No es asesoramiento financiero.*`
    : `Good question. I'm in **demo mode** right now — once the real model is connected I'll be able to answer about "${preview}" using live market data and your specific portfolio. 🤖\n\n⚠️ *This is a demo. Not financial advice.*`;
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */
export function useChat(lang: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string, contextStr?: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsOpen(true);
      setIsThinking(true);
      setError(null);

      // Build the payload — last 10 messages + new user message
      const history = [...messages, userMsg].slice(-10).map(({ role, content }) => ({ role, content }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, context: contextStr, lang }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 429 || errData?.error === "rate_limit") {
            const rateLimitMsg =
              lang === "es"
                ? "⚠️ Demasiadas consultas por ahora. Esperá un momento e intentá de nuevo."
                : "⚠️ Too many requests right now. Please wait a moment and try again.";
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: rateLimitMsg }]);
          } else {
            throw new Error(`HTTP ${res.status}`);
          }
          return;
        }

        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: data.content },
        ]);
      } catch (err) {
        console.error("[useChat] sendMessage error:", err);
        const networkMsg =
          lang === "es"
            ? "⚠️ No pude conectarme al asistente. Verificá tu conexión e intentá de nuevo."
            : "⚠️ Couldn't reach the assistant. Check your connection and try again.";
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: networkMsg }]);
        setError(networkMsg);
      } finally {
        setIsThinking(false);
      }
    },
    [lang, isThinking, messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    input,
    setInput,
    isThinking,
    isOpen,
    setIsOpen,
    sendMessage,
    clearMessages,
    error,
  };
}
