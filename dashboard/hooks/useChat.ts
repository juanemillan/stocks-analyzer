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

      // Detect language from the user input heuristically — prefer prompt language when ambiguous
      function detectLanguage(s: string) {
        // Quick heuristics: presence of inverted question/exclamation, common Spanish words, or accented chars
        const spanishTokens = /\b(que|qué|por qué|por que|hola|gracias|buenos|tardes|mañana|usted|tu|tú)\b/i;
        if (/[¿¡áéíóúñÁÉÍÓÚÑ]/.test(s)) return "es";
        if (spanishTokens.test(s)) return "es";
        return "en";
      }

      const detectedLang = detectLanguage(trimmed);
      const langToSend = detectedLang || lang;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, context: contextStr, lang: langToSend }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 429 || errData?.error === "rate_limit") {
            const rateLimitMsg =
              langToSend === "es"
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
          lang === "es" || (typeof detectedLang !== "undefined" && detectedLang === "es")
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
