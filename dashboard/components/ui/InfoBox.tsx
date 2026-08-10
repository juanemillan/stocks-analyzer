import React from "react";

export function InfoBox({ text, label, children }: { text: string; label: string; children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const contentId = React.useId();
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex items-center gap-1.5 rounded text-xs text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:text-gray-300"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>{label}</span>
        <span
          className={`transition-transform duration-200 inline-block ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div id={contentId} className="mt-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl text-sm text-gray-700 dark:text-gray-300 leading-relaxed animate-fadeIn">
          {text}
          {children}
        </div>
      )}
    </div>
  );
}
