import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GuideRequest = {
  question?: string;
  context?: unknown;
  includeTransactionDetails?: boolean;
};

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as { output_text?: unknown; output?: unknown };
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  if (!Array.isArray(data.output)) return "";
  const chunks: string[] = [];
  for (const item of data.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.join("\n").trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Guide is installed but the server is not configured with OPENAI_API_KEY yet.", code: "not_configured" },
      { status: 503 }
    );
  }

  let body: GuideRequest;
  try {
    body = (await request.json()) as GuideRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const question = String(body.question ?? "").trim().slice(0, 4000);
  if (!question) return NextResponse.json({ error: "Ask Guide a question first." }, { status: 400 });

  const contextText = JSON.stringify(body.context ?? {}, null, 2).slice(0, 40000);
  const instructions = [
    "You are Guide inside a private app called Two Goals.",
    "The app has two priorities in this order: (1) live eternally with Jesus Christ; (2) live financially independent.",
    "Be concrete, concise, and action-oriented. Explain calculations when asked. Challenge assumptions when the numbers do not support the target.",
    "Do not imply that spiritual practices earn salvation. Do not turn spiritual activity into a score.",
    "For finance, distinguish planning guidance from professional financial, tax, legal, or investment advice.",
    "Use only the structured context supplied by the app. Never claim access to the user's raw Quicken file, bank account, or data not included in the request.",
    "When reviewing Quicken classifications, call out uncertainty, suspicious categories, transfers, missing account types, and anything that could materially distort averages.",
    "End with one clear next action when a next action is appropriate."
  ].join(" ");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        instructions,
        input: `TWO GOALS CONTEXT\n${contextText}\n\nUSER QUESTION\n${question}`,
        max_output_tokens: 1200,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload?.error?.message || "Guide could not complete this request.";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const answer = extractText(payload);
    if (!answer) return NextResponse.json({ error: "Guide returned no text." }, { status: 502 });
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: "Guide could not reach the AI service." }, { status: 502 });
  }
}
