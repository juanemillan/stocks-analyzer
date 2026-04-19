import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

const MAX_MESSAGES = 10;

// Provider + model pairs tried in order until one succeeds.
// Groq first: free tier, 30 req/min, extremely fast and reliable.
// OpenRouter as fallback: shared free-tier pool, less reliable but broader model choice.
type Provider = { url: string; model: string; headers: (key: string) => Record<string, string> };

function makeProviders(groqKey: string | undefined, orKey: string | undefined): Array<Provider & { key: string }> {
  const providers = [];
  if (groqKey) {
    for (const model of [
      "llama-3.3-70b-versatile",
      "llama3-70b-8192",
      "gemma2-9b-it",
    ]) {
      providers.push({
        url: "https://api.groq.com/openai/v1/chat/completions",
        model,
        key: groqKey,
        headers: (key: string) => ({
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        }),
      });
    }
  }
  if (orKey) {
    for (const model of [
      "meta-llama/llama-3.3-70b-instruct:free",
      "mistralai/mistral-small-3.1-24b-instruct:free",
      "google/gemma-3-12b-it:free",
    ]) {
      providers.push({
        url: "https://openrouter.ai/api/v1/chat/completions",
        model,
        key: orKey,
        headers: (key: string) => ({
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://bullia.app",
          "X-Title": "Bullia AI",
        }),
      });
    }
  }
  return providers;
}

// Load AGENT.md once at module init (file is in the dashboard root)
let systemPrompt: string;
try {
  systemPrompt = readFileSync(path.join(process.cwd(), "AGENT.md"), "utf-8");
} catch {
  systemPrompt =
    "You are Bullia AI, a financial analysis assistant. Always add a disclaimer that your responses are informational only and not financial advice.";
}

async function tryProvider(
  provider: Provider & { key: string },
  messages: object[],
): Promise<{ content: string } | { status: number }> {
  let res: Response;
  try {
    res = await fetch(provider.url, {
      method: "POST",
      headers: provider.headers(provider.key),
      body: JSON.stringify({
        model: provider.model,
        messages,
        max_tokens: 600,
        temperature: 0.4,
      }),
    });
  } catch {
    return { status: 502 };
  }

  if (!res.ok) {
    console.warn(`[chat/route] ${provider.model} → ${res.status}`);
    return { status: res.status };
  }
  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";
  if (!raw) return { status: 502 };
  // Strip <think>...</think> reasoning blocks emitted by some models (e.g. Qwen3)
  const content = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (!content) return { status: 502 };
  return { content };
}

export async function POST(req: NextRequest) {
  const groqKey = process.env.GROQ_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;

  if (!groqKey && !orKey) {
    return NextResponse.json(
      { error: "No AI provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY." },
      { status: 500 }
    );
  }

  let body: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    context?: string;
    lang?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, context, lang = "en" } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required." }, { status: 400 });
  }

  const recentMessages = messages.slice(-MAX_MESSAGES);

  const augmentedMessages = recentMessages.map((msg, i) => {
    if (i === recentMessages.length - 1 && msg.role === "user" && context) {
      return { ...msg, content: `[CONTEXT]\n${context}\n[/CONTEXT]\n\n${msg.content}` };
    }
    return msg;
  });

  const langHint =
    lang === "es"
      ? "\nThe user is writing in Spanish. Respond in Spanish."
      : "\nThe user is writing in English. Respond in English.";

  const orMessages = [
    { role: "system", content: systemPrompt + langHint },
    ...augmentedMessages,
  ];

  // Try each provider/model in the fallback chain (Groq first, OpenRouter second)
  const providers = makeProviders(groqKey, orKey);
  let lastStatus = 502;
  for (const provider of providers) {
    const result = await tryProvider(provider, orMessages);
    if ("content" in result) {
      return NextResponse.json({ content: result.content });
    }
    lastStatus = result.status;
    // Stop on hard auth errors — won't be fixed by switching models
    if (lastStatus === 401 || lastStatus === 403 || lastStatus === 400) break;
  }

  // All models exhausted
  if (lastStatus === 429) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }
  return NextResponse.json(
    { error: `All models unavailable (last status: ${lastStatus}).` },
    { status: 502 }
  );
}
