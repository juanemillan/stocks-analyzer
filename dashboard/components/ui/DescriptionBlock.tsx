import React from "react";
import { t } from "@/app/i18n";
import type { Lang } from "@/app/types";

export function DescriptionBlock({ text, lang }: { text: string; lang: Lang }) {
  const [expanded, setExpanded] = React.useState(false);
  const MAX = 280;
  const short = text.length > MAX ? text.slice(0, MAX) + "\u2026" : text;
  return (
    <div className="text-xs text-gray-700">
      <div className="whitespace-pre-line">{expanded ? text : short}</div>
      {text.length > MAX && (
        <button
          className="mt-1 text-xs text-blue-600 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t("seeLess", lang) : t("seeMore", lang)}
        </button>
      )}
    </div>
  );
}
