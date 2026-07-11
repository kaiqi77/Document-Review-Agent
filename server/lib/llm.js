export async function callChatModel({ messages, temperature = 0.1, maxTokens = 1200, apiConfig = {} }) {
  const apiKey = apiConfig.apiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = (apiConfig.baseUrl || process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = apiConfig.model || process.env.LLM_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return {
      usedModel: "local-rule-fallback",
      content: "",
      skipped: true,
      reason: "LLM_API_KEY is not configured.",
    };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return {
    usedModel: model,
    content: payload.choices?.[0]?.message?.content || "",
    skipped: false,
  };
}

export function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
