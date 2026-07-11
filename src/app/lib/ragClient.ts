export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ReviewEngineConfig {
  highConfidence: number;
  mediumConfidence: number;
  ruleEngineEnabled: boolean;
  anomalyEngineEnabled: boolean;
  badcaseCollectionEnabled: boolean;
}

export interface BadcaseInput {
  taskId: string;
  fileName: string;
  label: string;
  originalSnippet?: string;
  systemResult?: string;
  confidence?: number;
  matchedRuleOrAnomaly?: string;
  reviewerCorrection?: string;
  rootCause?: string;
}

export interface RagChunk {
  id: string;
  article: string;
  title: string;
  text: string;
  score?: number;
  matchedTerms?: string[];
  termCount?: number;
}

export interface RagHealth {
  ok: boolean;
  document?: {
    title: string;
    source: string;
    sourceFile: string;
    builtAt: string;
    chunkCount: number;
  };
  sampleChunks?: RagChunk[];
}

const CONFIG_KEY = "pal.rag.llmConfig";
const REVIEW_CONFIG_KEY = "pal.rag.reviewEngineConfig";

export const defaultLLMConfig: LLMConfig = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

export const defaultReviewEngineConfig: ReviewEngineConfig = {
  highConfidence: 0.8,
  mediumConfidence: 0.5,
  ruleEngineEnabled: true,
  anomalyEngineEnabled: true,
  badcaseCollectionEnabled: true,
};

export function getLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...defaultLLMConfig, ...JSON.parse(raw) } : defaultLLMConfig;
  } catch {
    return defaultLLMConfig;
  }
}

export function saveLLMConfig(config: LLMConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function getReviewEngineConfig(): ReviewEngineConfig {
  try {
    const raw = localStorage.getItem(REVIEW_CONFIG_KEY);
    return raw ? { ...defaultReviewEngineConfig, ...JSON.parse(raw) } : defaultReviewEngineConfig;
  } catch {
    return defaultReviewEngineConfig;
  }
}

export function saveReviewEngineConfig(config: ReviewEngineConfig) {
  localStorage.setItem(REVIEW_CONFIG_KEY, JSON.stringify(config));
}

export function maskApiKey(apiKey: string) {
  if (!apiKey) return "Not configured";
  if (apiKey.length <= 10) return "••••••";
  return `${apiKey.slice(0, 5)}••••••${apiKey.slice(-4)}`;
}

export async function fetchRagHealth(): Promise<RagHealth> {
  const response = await fetch("/api/rag/health");
  if (!response.ok) throw new Error(`RAG health failed: ${response.status}`);
  return response.json();
}

export async function searchRag(query: string, topK = 5): Promise<RagChunk[]> {
  const response = await fetch("/api/rag/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, topK }),
  });
  if (!response.ok) throw new Error(`RAG search failed: ${response.status}`);
  const payload = await response.json();
  return payload.chunks || [];
}

export async function reindexRag(): Promise<RagHealth> {
  const response = await fetch("/api/rag/reindex", { method: "POST" });
  if (!response.ok) throw new Error(`RAG reindex failed: ${response.status}`);
  return response.json();
}

export async function submitBadcase(input: BadcaseInput): Promise<void> {
  const response = await fetch("/api/rag/badcases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Badcase submit failed: ${response.status}`);
}
