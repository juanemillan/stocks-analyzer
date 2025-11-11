"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // evita desajustes SSR

  const current = theme === "system" ? systemTheme : theme;

  return (
    <button
      onClick={() => setTheme(current === "dark" ? "light" : "dark")}
      className="px-3 py-1 rounded-xl text-sm border bg-white dark:bg-neutral-800 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700"
      title={`Cambiar a ${current === "dark" ? "claro" : "oscuro"}`}
    >
      {current === "dark" ? "🌞 Claro" : "🌙 Oscuro"}
    </button>
  );
}
