import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCompounders, getRanking, getTurnarounds } from "@/app/actions";

async function withTimeout<T>(p: Promise<T>, ms: number) {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`warm-cache timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Best-effort: never fail the page load if DB is slow/unreachable.
  // Caches are shared so results aren't user-specific.
  const tasks = [
    ["ranking", () => getRanking()],
    ["turnarounds", () => getTurnarounds()],
    // Compounders can be heavy; warm it but don't block (shorter timeout).
    ["compounders-1y", () => getCompounders("1Y")],
  ] as const;

  const results = await Promise.all(
    tasks.map(async ([key, run]) => {
      try {
        const ms = key === "compounders-1y" ? 3000 : 8000;
        await withTimeout(Promise.resolve(run()), ms);
        return { key, ok: true as const };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { key, ok: false as const, error: message };
      }
    })
  );

  return NextResponse.json({ ok: true, results });
}

