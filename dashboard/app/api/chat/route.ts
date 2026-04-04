import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_MESSAGES = 10;

// Fallback chain — tried in order until one succeeds.
// All are free-tier models on OpenRouter with different rate-limit pools.
const FREE_MODELS = [
  "qwen/qwen3.6-plus:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "stepfun/step-3.5-flash:free",
  "arcee-ai/trinity-large-preview:free",
];

// Load AGENT.md once at module init (file is in the dashboard root)
let systemPrompt: string;
try {
  systemPrompt = readFileSync(path.join(process.cwd(), "AGENT.md"), "utf-8");
} catch {
  systemPrompt =
    "You are Bullia AI, a financial analysis assistant. Always add a disclaimer that your responses are informational only and not financial advice.";
}

async function tryModel(
  model: string,
  orMessages: object[],
  apiKey: string
): Promise<{ content: string } | { status: number }> {
  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bullia.app",
        "X-Title": "Bullia AI",
      },
      body: JSON.stringify({
        model,
        messages: orMessages,
        max_tokens: 600,
        temperature: 0.4,
      }),
    });
  } catch {
    return { status: 502 };
  }

  if (!res.ok) {
    console.warn(`[chat/route] model ${model} returned ${res.status}`);
    return { status: res.status };
  }
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) return { status: 502 };
  return { content };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured." },
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

  // Try each model in the fallback chain
  let lastStatus = 502;
  for (const model of FREE_MODELS) {
    const result = await tryModel(model, orMessages, apiKey);
    if ("content" in result) {
      return NextResponse.json({ content: result.content });
    }
    lastStatus = result.status;
    // Stop only on hard auth/request errors (401, 403, 400) — these won't be
    // fixed by switching models. For 404 (model not found), 429 (rate limit),
    // or any 5xx, always try the next model.
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
