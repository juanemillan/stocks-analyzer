"use client";
import { useState } from "react";
import type { AiInsight } from "@/app/actions";
import type { Lang } from "@/app/types";

interface Props {
  insight: AiInsight;
  lang: Lang;
  onAskFollowUp?: (text: string) => void;
}

/* Markdown-lite: **bold**, bullet lists (- ) and newlines */
function renderContent(text: string) {
  return text.split("\n").map((line, i) => {
    const bullet = line.startsWith("- ") || line.startsWith("• ");
    const content = bullet ? line.slice(2) : line;
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={j}>{part.slice(2, -2)}</strong>
        : part
    );
    if (bullet) {
      return (
        <li key={i} className="flex gap-2 leading-relaxed">
          <span className="mt-1 text-emerald-500 flex-none">•</span>
          <span>{parts}</span>
        </li>
      );
    }
    return (
      <p key={i} className={`leading-relaxed ${!line.trim() ? "h-2" : ""}`}>
        {parts}
      </p>
    );
  });
}

export function InsightCard({ insight, lang, onAskFollowUp }: Props) {
  const [expanded, setExpanded] = useState(true);

  const dateStr = new Date(insight.date + "T12:00:00Z").toLocaleDateString(
    lang === "es" ? "es-ES" : "en-US",
    { weekday: "long", month: "long", day: "numeric" }
  );

  const FOLLOW_UPS =
    lang === "es"
      ? ["¿Cuál es el mejor activo hoy?", "Analizá mi portfolio", "¿Qué son los Turnarounds?"]
      : ["What's the top asset today?", "Analyze my portfolio", "What are Turnarounds?"];

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-neutral-900 overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {/* Sparkle icon */}
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-none shadow-sm">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Bullia AI
            </span>
            <span className="ml-2 text-[10px] text-gray-400 capitalize">{dateStr}</span>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 20 20" fill="currentColor" aria-hidden
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <ul className="space-y-1">{renderContent(insight.content)}</ul>
          </div>

          {/* Follow-up suggestion pills */}
          {onAskFollowUp && (
            <div className="mt-3 flex flex-wrap gap-2">
              {FOLLOW_UPS.map((q) => (
                <button
                  key={q}
                  onClick={() => onAskFollowUp(q)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
