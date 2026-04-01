"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const RULES = [
  { id: "len",   label: "At least 8 characters",      test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter (A–Z)",  test: (p: string) => /[A-Z]/.test(p) },
  { id: "digit", label: "One number (0–9)",            test: (p: string) => /[0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ruleStatus = RULES.map((r) => ({ ...r, passed: r.test(password) }));
  const allPassed = ruleStatus.every((r) => r.passed);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!allPassed) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">BULLIA</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-black dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <ul className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 space-y-1">
            {ruleStatus.map((r) => (
              <li key={r.id} className={`flex items-center gap-2 text-xs transition-colors duration-200 ${r.passed ? "text-green-600" : "text-gray-400"}`}>
                <span className="w-3 text-center">{r.passed ? "✓" : "○"}</span>
                {r.label}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !allPassed}
            className="mt-1 w-full rounded-xl py-2 bg-black text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity duration-200"
          >
            {loading ? "…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
