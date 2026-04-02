"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

function SunIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-11 h-6 rounded-full bg-gray-200 dark:bg-neutral-700" />;

  const current = theme === "system" ? systemTheme : theme;
  const isDark = current === "dark";

  const handleToggle = () => {
    const next = isDark ? "light" : "dark";
    const overlayColor = next === "dark" ? "#111827" : "#f8fafc";
    const html = document.documentElement;
    html.style.setProperty("--theme-overlay-color", overlayColor);
    html.classList.add("theme-transitioning");
    setTheme(next);
    setTimeout(() => html.classList.remove("theme-transitioning"), 350);
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
        isDark ? "bg-neutral-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${
          isDark ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
}
