"use client";
import { useRef, useState, useEffect } from "react";
import type { Lang } from "@/app/types";

export function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const esRef = useRef<HTMLButtonElement>(null);
  const enRef = useRef<HTMLButtonElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  useEffect(() => {
    const btn = lang === "es" ? esRef.current : enRef.current;
    if (btn) setPill({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
  }, [lang]);

  return (
    <div className="relative inline-flex rounded-xl overflow-hidden border dark:border-neutral-700 text-sm bg-white dark:bg-neutral-900">
      {pill.ready && (
        <span
          className="absolute top-0 bottom-0 bg-black dark:bg-white rounded-xl transition-all duration-200 ease-in-out pointer-events-none"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      <button
        ref={esRef}
        onClick={() => setLang("es")}
        className={`relative z-10 px-2 py-1 transition-colors duration-150 ${
          lang === "es"
            ? "text-white dark:text-black font-medium"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
        }`}
      >
        ES
      </button>
      <button
        ref={enRef}
        onClick={() => setLang("en")}
        className={`relative z-10 px-2 py-1 transition-colors duration-150 ${
          lang === "en"
            ? "text-white dark:text-black font-medium"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
        }`}
      >
        EN
      </button>
    </div>
  );
}
