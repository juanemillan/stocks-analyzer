"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

// Password rules (signup only)
const RULES = [
  { id: "len",   label: "At least 8 characters",       test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter (A–Z)",   test: (p: string) => /[A-Z]/.test(p) },
  { id: "digit", label: "One number (0–9)",             test: (p: string) => /[0-9]/.test(p) },
];
const STRENGTH = [
  { min: 0, max: 0, label: "",                        color: "" },
  { min: 1, max: 1, label: "Too weak",                color: "bg-red-500" },
  { min: 2, max: 2, label: "Good, but could be better", color: "bg-amber-400" },
  { min: 3, max: 3, label: "Perfection \u2728",           color: "bg-green-500" },
] as const;

function passwordStrength(p: string): 0 | 1 | 2 | 3 {
  if (!p) return 0;
  const passed = RULES.filter((r) => r.test(p)).length;
  return passed as 0 | 1 | 2 | 3;
}
function validateEmail(email: string): string | null {
  // Basic structure: local@domain.tld — no consecutive dots, no leading/trailing dots
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return "Enter a valid email address (e.g. you@example.com)";
  if (email.includes("..")) return "Email must not contain consecutive dots";
  return null;
}

function validatePassword(password: string): string | null {
  for (const rule of RULES) {
    if (!rule.test(password)) return `Password: ${rule.label.toLowerCase()}`;
  }
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Set background image only after mount so we know the real theme
  const bgStyle = mounted
    ? {
        backgroundImage: `url('/images/${
          resolvedTheme === "dark" ? "dark-mode" : "light-mode"
        }.png')`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
        backgroundRepeat: "no-repeat" as const,
      }
    : {};

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Live rule status (only shown during signup)
  const ruleStatus = RULES.map((r) => ({ ...r, passed: r.test(password) }));
  const allRulesPassed = ruleStatus.every((r) => r.passed);
  const strength = passwordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    // Client-side validation
    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }

    if (mode === "signup") {
      const pwdErr = validatePassword(password);
      if (pwdErr) { setError(pwdErr); return; }
    }

    setLoading(true);

    if (mode === "forgot") {
      const emailErr = validateEmail(email);
      if (emailErr) { setError(emailErr); setLoading(false); return; }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setInfo("If that email is registered you'll receive a reset link shortly.");
        setMode("login");
      }
      setLoading(false);
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
      } else {
        setInfo("Check your email to confirm your account, then log in.");
        setMode("login");
      }
    }
    setLoading(false);
  }

  return (
    <div
      className="login-bg min-h-screen flex items-center justify-center p-4"
      style={bgStyle}
    >
      {/* subtle darkening overlay so the card stays readable over any photo */}
      <div className="absolute inset-0 bg-black/10 dark:bg-black/50" aria-hidden />
      <div className="relative w-full max-w-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-xl p-8">
        {/* Logo / title */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">BULLIA</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === "login" ? "Sign in to your account"
             : mode === "signup" ? "Create a new account"
             : "Reset your password"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />

          {/* Password field — hidden in forgot mode */}
          {mode !== "forgot" && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-black dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          )}

          {/* Forgot password link — only in login mode, below password field */}
          {mode === "login" && (
            <div className="text-right -mt-1">
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-700 underline"
                onClick={() => { setError(null); setInfo(null); setMode("forgot"); }}
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Live password rules checklist — only during signup */}
          {mode === "signup" && (
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                password.length > 0 ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                {/* Strength bar */}
                <div className="pt-1 pb-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((seg) => (
                      <div
                        key={seg}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          strength >= seg
                            ? STRENGTH[strength].color
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p
                    className={`text-xs font-medium transition-colors duration-300 ${
                      strength === 1 ? "text-red-500"
                      : strength === 2 ? "text-amber-500"
                      : strength === 3 ? "text-green-600"
                      : "text-transparent"
                    }`}
                  >
                    {STRENGTH[strength].label || "\u00a0"}
                  </p>
                </div>

                <ul className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 space-y-1 mt-0">
                  {ruleStatus.map((r) => (
                    <li
                      key={r.id}
                      className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
                        r.passed ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      <span className="w-3 text-center">{r.passed ? "✓" : "○"}</span>
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "signup" && !allRulesPassed)}
            className="mt-1 w-full rounded-xl py-2 bg-black text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity duration-200"
          >
            {loading ? "…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-5">
          {mode === "forgot" ? (
            <>
              Remember it?{" "}
              <button className="underline hover:text-gray-800" onClick={() => { setError(null); setInfo(null); setMode("login"); }}>Back to sign in</button>
            </>
          ) : mode === "login" ? (
            <>
              No account?{" "}
              <button className="underline hover:text-gray-800" onClick={() => { setError(null); setInfo(null); setMode("signup"); }}>Sign up</button>
            </>
          ) : (
            <>
              Already have one?{" "}
              <button className="underline hover:text-gray-800" onClick={() => { setError(null); setInfo(null); setMode("login"); }}>Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
