import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { aiTools } from "@/lib/ai/tools";
import { getSystemPrompt } from "@/lib/ai/system-prompt";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserPlan } from "@/lib/queries";
import { PLAN_LIMITS } from "@/lib/constants";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function getAiConfig() {
  try {
    const sb = createAdminClient();
    const { data } = await sb
      .from("ai_config")
      .select("model_id, temperature, system_prompt")
      .limit(1)
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { plan } = await getUserPlan();
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
  if (!limits.aiInsights) {
    return new Response(
      JSON.stringify({ error: "AI Insights requires the Growth plan or higher." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const [{ messages }, config] = await Promise.all([
    req.json(),
    getAiConfig(),
  ]);

  const modelId = config?.model_id || "google/gemini-2.5-flash";
  const systemPrompt = config?.system_prompt || getSystemPrompt();
  const temperature = config?.temperature ?? 0.7;

  const result = streamText({
    model: openrouter.chat(modelId),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: aiTools,
    stopWhen: stepCountIs(8),
    temperature,
  });

  return result.toUIMessageStreamResponse();
}
