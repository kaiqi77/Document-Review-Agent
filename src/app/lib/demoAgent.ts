import { getLLMConfig, getReviewEngineConfig } from "./ragClient";

export type ReviewStatus = "Processing" | "Completed" | "Risk Detected";
export type RiskLevel = "High Risk" | "Normal Risk" | "Compliant";

export interface ReviewTask {
  id: string;
  fileName: string;
  submitTime: string;
  status: ReviewStatus;
  fileType: string;
  pages: number;
  reviewer: string;
  createdAt?: number;
  confidence?: number;
  confidenceBand?: "High" | "Medium" | "Low";
  badcaseCandidate?: boolean;
  interactionRounds?: number;
  userModifiedOutput?: boolean;
}

export interface RiskItem {
  id: string;
  level: RiskLevel;
  clause: string;
  content: string;
  suggestion: string;
  citations?: string[];
}

export interface ReviewEngineSummary {
  id: string;
  name: string;
  status: string;
  hitCount: number;
  summary: string;
}

export interface RuleMatch {
  id: string;
  name: string;
  severity: RiskLevel;
  evidence: string;
  citations?: string[];
}

export interface AnomalyAlert {
  id: string;
  type: string;
  severity: "Low" | "Medium" | "High";
  reason: string;
  citations?: string[];
}

export interface ReviewResult {
  id: string;
  fileName: string;
  fileType: string;
  pages: number;
  submitTime: string;
  reviewTime: string;
  totalRisk: number;
  highRisk: number;
  normalRisk: number;
  compliant: number;
  risks: RiskItem[];
  summary?: string;
  citations?: { id: string; article: string; title: string; text: string; score?: number }[];
  ruleMatches?: RuleMatch[];
  anomalyAlerts?: AnomalyAlert[];
  reviewEngines?: ReviewEngineSummary[];
  confidence?: number;
  confidenceBand?: "High" | "Medium" | "Low";
  routeAction?: string;
  badcaseCandidate?: boolean;
  badcaseReason?: string;
  interactionRounds?: number;
  userModifiedOutput?: boolean;
  model?: string;
  llmStatus?: string;
}

export interface ReviewMetrics {
  taskCompletionRate: number;
  completedTasks: number;
  totalTasks: number;
  averageInteractionRounds: number;
  userCorrectionRate: number;
  correctedOutputs: number;
  reviewedOutputs: number;
}

export interface ReviewInputFile {
  name: string;
  type: string;
}

const TASKS_KEY = "pal.demo.tasks";
const RESULTS_KEY = "pal.demo.results";
const REVIEW_DURATION_MS = 6000;

export const baseTasks: ReviewTask[] = [
  { id: "RPT-2024-009", fileName: "Employment_Contract_Template.pdf", submitTime: "2026-06-10 14:32", status: "Completed", fileType: "PDF", pages: 12, reviewer: "AI Agent" },
  { id: "RPT-2024-008", fileName: "Vendor_NDA_FY2024.docx", submitTime: "2026-06-10 14:14", status: "Completed", fileType: "DOCX", pages: 8, reviewer: "AI Agent" },
  { id: "RPT-2024-007", fileName: "Partnership_MOU_Draft.docx", submitTime: "2026-06-10 13:47", status: "Risk Detected", fileType: "DOCX", pages: 22, reviewer: "AI Agent" },
  { id: "RPT-2024-006", fileName: "IP_Transfer_Agreement.pdf", submitTime: "2026-06-10 12:55", status: "Completed", fileType: "PDF", pages: 35, reviewer: "AI Agent" },
  { id: "RPT-2024-005", fileName: "Distribution_Policy_v3.txt", submitTime: "2026-06-10 12:10", status: "Processing", fileType: "TXT", pages: 5, reviewer: "AI Agent", createdAt: Date.now() },
  { id: "RPT-2024-004", fileName: "Board_Resolution_June.pdf", submitTime: "2026-06-10 11:30", status: "Completed", fileType: "PDF", pages: 4, reviewer: "AI Agent" },
  { id: "RPT-2024-003", fileName: "Supply_Chain_Agreement_v2.pdf", submitTime: "2026-06-10 10:12", status: "Risk Detected", fileType: "PDF", pages: 48, reviewer: "AI Agent" },
  { id: "RPT-2024-002", fileName: "Non_Disclosure_Agreement.docx", submitTime: "2026-06-09 17:44", status: "Completed", fileType: "DOCX", pages: 6, reviewer: "AI Agent" },
  { id: "RPT-2024-001", fileName: "Framework_Agreement_Q2.pdf", submitTime: "2026-06-09 15:20", status: "Completed", fileType: "PDF", pages: 19, reviewer: "AI Agent" },
];

export const baseResults: Record<string, ReviewResult> = {
  "RPT-2024-003": {
    id: "RPT-2024-003",
    fileName: "Supply_Chain_Agreement_v2.pdf",
    fileType: "PDF",
    pages: 48,
    submitTime: "2026-06-10 10:12",
    reviewTime: "2026-06-10 10:44",
    totalRisk: 5,
    highRisk: 2,
    normalRisk: 3,
    compliant: 18,
    interactionRounds: 2,
    userModifiedOutput: false,
    risks: [
      {
        id: "RISK-001",
        level: "High Risk",
        clause: "Article 7 — Force Majeure",
        content: "The Force Majeure clause does not include 'regulatory changes' as a qualifying event, deviating from standard enterprise contract templates and potentially exposing the company to unmitigated liability.",
        suggestion: "Add 'changes in applicable law or regulation' as a force majeure trigger event. Align with UNIDROIT Principles Article 7.1.7.",
      },
      {
        id: "RISK-002",
        level: "High Risk",
        clause: "Article 12 — Indemnification",
        content: "The indemnification scope is uncapped and extends to indirect damages, which is inconsistent with company policy requiring a 2× contract value liability cap.",
        suggestion: "Insert liability cap provision: 'In no event shall either party's aggregate liability exceed two (2) times the total fees paid in the preceding 12 months.'",
      },
      {
        id: "RISK-003",
        level: "Normal Risk",
        clause: "Section 5.3 — Data Privacy",
        content: "The data processing addendum references GDPR Article 28 but lacks specific clauses for sub-processor notification timelines (currently left as TBD).",
        suggestion: "Specify a 5-business-day advance notice period for sub-processor changes, consistent with your DPA template v3.2.",
      },
      {
        id: "RISK-004",
        level: "Normal Risk",
        clause: "Section 9.1 — Payment Terms",
        content: "Net-60 payment terms conflict with the company's standard Net-30 policy. Extended terms may impact cash flow and require treasury approval.",
        suggestion: "Negotiate to Net-30 terms. If accepted by supplier, obtain CFO approval for Net-60 exception.",
      },
      {
        id: "RISK-005",
        level: "Normal Risk",
        clause: "Annex B — SLA Metrics",
        content: "Uptime SLA is specified at 99.0% with no credit mechanism for breaches below 95%, which is below the company's 99.5% minimum standard.",
        suggestion: "Require 99.5% uptime SLA and add a tiered credit schedule: <99.5%: 10% credit; <99%: 25% credit; <95%: right to terminate.",
      },
    ],
  },
  "RPT-2024-007": {
    id: "RPT-2024-007",
    fileName: "Partnership_MOU_Draft.docx",
    fileType: "DOCX",
    pages: 22,
    submitTime: "2026-06-10 13:47",
    reviewTime: "2026-06-10 14:07",
    totalRisk: 2,
    highRisk: 0,
    normalRisk: 2,
    compliant: 11,
    interactionRounds: 3,
    userModifiedOutput: true,
    risks: [
      {
        id: "RISK-001",
        level: "Normal Risk",
        clause: "Section 4.2 — Liability Cap",
        content: "Liability cap is set at USD 50,000 which is below the regulatory minimum of USD 100,000 for partnership agreements in this jurisdiction.",
        suggestion: "Revise liability cap to USD 100,000 minimum to meet regulatory requirements.",
      },
      {
        id: "RISK-002",
        level: "Normal Risk",
        clause: "Section 6.1 — Termination Notice",
        content: "15-day termination notice period is insufficient for operational wind-down; standard is 30 days.",
        suggestion: "Extend termination notice period to 30 days minimum.",
      },
    ],
  },
};

export function getTasks(): ReviewTask[] {
  const customTasks = readJson<ReviewTask[]>(TASKS_KEY, []);
  return refreshProcessingTasks([...customTasks, ...baseTasks]);
}

export function getResult(id: string): ReviewResult | undefined {
  const customResults = readJson<Record<string, ReviewResult>>(RESULTS_KEY, {});
  return customResults[id] || baseResults[id] || buildDefaultResult(id);
}

export function getReviewMetrics(): ReviewMetrics {
  const tasks = getTasks();
  const completedTasks = tasks.filter((task) => task.status !== "Processing");
  const completedResults = completedTasks.map((task) => getResult(task.id)).filter(Boolean) as ReviewResult[];
  const reviewedOutputs = completedResults.length;
  const correctedOutputs = completedResults.filter((result) => result.userModifiedOutput).length;
  const interactionTotal = completedResults.reduce((sum, result) => sum + (result.interactionRounds ?? estimateInteractionRounds(result)), 0);

  return {
    taskCompletionRate: tasks.length ? completedTasks.length / tasks.length : 0,
    completedTasks: completedTasks.length,
    totalTasks: tasks.length,
    averageInteractionRounds: reviewedOutputs ? Number((interactionTotal / reviewedOutputs).toFixed(1)) : 0,
    userCorrectionRate: reviewedOutputs ? correctedOutputs / reviewedOutputs : 0,
    correctedOutputs,
    reviewedOutputs,
  };
}

export function createReviewTask(files: ReviewInputFile[], emailText: string): ReviewTask {
  const existingCustomTasks = readJson<ReviewTask[]>(TASKS_KEY, []);
  const allExisting = [...existingCustomTasks, ...baseTasks];
  const nextNumber = Math.max(...allExisting.map((task) => Number(task.id.split("-").at(-1)) || 0)) + 1;
  const primaryFile = files[0];
  const task: ReviewTask = {
    id: `RPT-2024-${String(nextNumber).padStart(3, "0")}`,
    fileName: primaryFile?.name || emailSubject(emailText) || "Imported_Email_Review.eml",
    submitTime: formatDateTime(new Date()),
    status: "Processing",
    fileType: (primaryFile?.type || "EML").toUpperCase(),
    pages: estimatePages(files, emailText),
    reviewer: "Demo Agent",
    createdAt: Date.now(),
  };

  const result = buildGeneratedResult(task, files, emailText);
  writeJson(TASKS_KEY, [task, ...existingCustomTasks]);
  writeJson(RESULTS_KEY, { ...readJson<Record<string, ReviewResult>>(RESULTS_KEY, {}), [task.id]: result });
  void enrichTaskWithRag(task, files, emailText);
  return task;
}

export function clearDemoTasks() {
  localStorage.removeItem(TASKS_KEY);
  localStorage.removeItem(RESULTS_KEY);
}

export function markResultAsUserCorrected(id: string) {
  const result = getResult(id);
  if (!result) return;
  const nextResult = { ...result, userModifiedOutput: true };
  writeJson(RESULTS_KEY, { ...readJson<Record<string, ReviewResult>>(RESULTS_KEY, {}), [id]: nextResult });
  updateTaskReviewMetadata(id, nextResult);
}

function refreshProcessingTasks(tasks: ReviewTask[]) {
  let changed = false;
  const next = tasks.map((task) => {
    if (task.status !== "Processing" || !task.createdAt) return task;
    if (Date.now() - task.createdAt < REVIEW_DURATION_MS) return task;
    const result = getResult(task.id);
    changed = true;
    return {
      ...task,
      status: result && result.totalRisk > 0 ? "Risk Detected" as const : "Completed" as const,
      confidence: result?.confidence,
      confidenceBand: result?.confidenceBand,
      badcaseCandidate: result?.badcaseCandidate,
      interactionRounds: result?.interactionRounds,
      userModifiedOutput: result?.userModifiedOutput,
    };
  });

  if (changed) {
    const customIds = new Set(readJson<ReviewTask[]>(TASKS_KEY, []).map((task) => task.id));
    writeJson(TASKS_KEY, next.filter((task) => customIds.has(task.id)));
  }

  return next;
}

function buildDefaultResult(id: string): ReviewResult | undefined {
  const task = [...readJson<ReviewTask[]>(TASKS_KEY, []), ...baseTasks].find((item) => item.id === id);
  if (!task) return undefined;

  return {
    id: task.id,
    fileName: task.fileName,
    fileType: task.fileType,
    pages: task.pages,
    submitTime: task.submitTime,
    reviewTime: task.status === "Processing" ? "In progress" : task.submitTime,
    totalRisk: 0,
    highRisk: 0,
    normalRisk: 0,
    compliant: Math.max(6, Math.round(task.pages * 1.2)),
    risks: [],
    interactionRounds: task.interactionRounds ?? estimateInteractionRounds({ id: task.id, totalRisk: 0, badcaseCandidate: task.badcaseCandidate } as ReviewResult),
    userModifiedOutput: task.userModifiedOutput ?? demoUserModifiedOutput(task.id),
  };
}

function buildGeneratedResult(task: ReviewTask, files: ReviewInputFile[], emailText: string): ReviewResult {
  const corpus = `${task.fileName} ${files.map((file) => file.name).join(" ")} ${emailText}`.toLowerCase();
  const risks: RiskItem[] = [];

  if (matchesAny(corpus, ["美白", "祛斑", "防晒", "染发", "烫发", "脱毛", "儿童", "特殊化妆品"])) {
    risks.push({
      id: `RISK-${String(risks.length + 1).padStart(3, "0")}`,
      level: "High Risk",
      clause: "特殊化妆品注册/备案审查",
      content: "材料可能涉及特殊化妆品或儿童化妆品，需要核对注册备案、标签样稿与功效评价资料。",
      suggestion: "提交注册证/备案凭证、功效评价依据、标签样稿，并按《化妆品监督管理条例》复核产品分类和宣称范围。",
    });
  }

  if (matchesAny(corpus, ["功效", "宣称", "广告", "第一", "治疗", "医疗", "药", "原料", "配方", "成分"])) {
    risks.push({
      id: `RISK-${String(risks.length + 1).padStart(3, "0")}`,
      level: "Normal Risk",
      clause: "标签宣称与原料安全审查",
      content: "材料包含功效宣称、广告表达或原料配方线索，需确认是否存在医疗化、绝对化宣称或禁限用原料风险。",
      suggestion: "删除医疗作用和绝对化表达，补充完整成分表、原料安全资料和功效评价依据。",
    });
  }

  if (matchesAny(corpus, ["data", "privacy", "gdpr", "personal", "email"])) {
    risks.push({
      id: `RISK-${String(risks.length + 1).padStart(3, "0")}`,
      level: "Normal Risk",
      clause: "Data Privacy — Processor Notice",
      content: "The imported content references personal or customer data but does not clearly state processor obligations, retention period, or sub-processor notice terms.",
      suggestion: "Add a data processing addendum with retention limits, sub-processor notification, breach notice timeline, and deletion/return obligations.",
    });
  }

  if (matchesAny(corpus, ["partnership", "supply", "vendor", "agreement", "contract", "liability"])) {
    risks.push({
      id: `RISK-${String(risks.length + 1).padStart(3, "0")}`,
      level: "High Risk",
      clause: "Commercial Terms — Liability Cap",
      content: "The contract context may include liability allocation, but the demo agent could not confirm a policy-aligned liability cap from the submitted content.",
      suggestion: "Confirm the liability cap is no greater than 2× annual contract value and excludes only approved carve-outs.",
    });
  }

  if (matchesAny(corpus, ["sla", "uptime", "service", "support"])) {
    risks.push({
      id: `RISK-${String(risks.length + 1).padStart(3, "0")}`,
      level: "Normal Risk",
      clause: "Service Levels — Remedies",
      content: "Service-level language should include measurable uptime targets and service credits for missed commitments.",
      suggestion: "Set minimum uptime to 99.5% and include escalating credits plus termination rights for repeated SLA breaches.",
    });
  }

  const highRisk = risks.filter((risk) => risk.level === "High Risk").length;
  const normalRisk = risks.filter((risk) => risk.level === "Normal Risk").length;

  return {
    id: task.id,
    fileName: task.fileName,
    fileType: task.fileType,
    pages: task.pages,
    submitTime: task.submitTime,
    reviewTime: formatDateTime(new Date(Date.now() + REVIEW_DURATION_MS)),
    totalRisk: risks.length,
    highRisk,
    normalRisk,
    compliant: Math.max(7, Math.round(task.pages * 1.15) - risks.length),
    risks,
    confidence: risks.length ? 0.72 : 0.82,
    confidenceBand: risks.length ? "Medium" : "High",
    routeAction: risks.length ? "Show warning badge and require reviewer confirmation." : "Auto-pass with evidence preview.",
    badcaseCandidate: false,
    interactionRounds: estimateInteractionRounds({ totalRisk: risks.length, badcaseCandidate: false } as ReviewResult),
    userModifiedOutput: risks.length > 0 && demoUserModifiedOutput(task.id),
    reviewEngines: [
      { id: "rule-matching", name: "Rule Matching Engine", status: risks.length ? "hit" : "clear", hitCount: risks.length, summary: risks.length ? `${risks.length} demo rule(s) matched.` : "No explicit demo rule matched." },
      { id: "anomaly-alert", name: "Anomaly Alert Engine", status: "clear", hitCount: 0, summary: "No anomaly alert triggered in the initial demo result." },
    ],
  };
}

async function enrichTaskWithRag(task: ReviewTask, files: ReviewInputFile[], emailText: string) {
  try {
    const response = await fetch("/api/rag/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: task.id,
        fileName: task.fileName,
        fileType: task.fileType,
        pages: task.pages,
        submitTime: task.submitTime,
        content: [
          emailText,
          files.length > 0 ? `上传文件：${files.map((file) => `${file.name} (${file.type})`).join("；")}` : "",
        ].filter(Boolean).join("\n"),
        apiConfig: getLLMConfig(),
        reviewConfig: getReviewEngineConfig(),
      }),
    });

    if (!response.ok) return;
    const payload = await response.json();
    if (!payload.ok || !payload.result) return;

    const result = enrichResultMetrics(payload.result as ReviewResult, task);
    const currentResults = readJson<Record<string, ReviewResult>>(RESULTS_KEY, {});
    writeJson(RESULTS_KEY, { ...currentResults, [task.id]: result });
    updateTaskReviewMetadata(task.id, result);
  } catch {
    // Keep offline demo result when the local RAG API or LLM endpoint is unavailable.
  }
}

function enrichResultMetrics(result: ReviewResult, task: ReviewTask): ReviewResult {
  return {
    ...result,
    interactionRounds: result.interactionRounds ?? estimateInteractionRounds(result),
    userModifiedOutput: result.userModifiedOutput ?? (result.badcaseCandidate || demoUserModifiedOutput(task.id)),
  };
}

function updateTaskReviewMetadata(taskId: string, result: ReviewResult) {
  const customTasks = readJson<ReviewTask[]>(TASKS_KEY, []);
  const nextTasks = customTasks.map((task) => task.id === taskId ? {
    ...task,
    confidence: result.confidence,
    confidenceBand: result.confidenceBand,
    badcaseCandidate: result.badcaseCandidate,
    interactionRounds: result.interactionRounds,
    userModifiedOutput: result.userModifiedOutput,
  } : task);
  writeJson(TASKS_KEY, nextTasks);
}

function estimateInteractionRounds(result: Pick<ReviewResult, "totalRisk" | "badcaseCandidate">) {
  const riskRounds = Math.min(3, Math.max(0, result.totalRisk || 0));
  const reviewRound = result.badcaseCandidate ? 1 : 0;
  return Math.max(1, 1 + riskRounds + reviewRound);
}

function demoUserModifiedOutput(taskId: string) {
  const number = Number(taskId.split("-").at(-1)) || 0;
  return number % 7 === 0;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function estimatePages(files: ReviewInputFile[], emailText: string) {
  if (files.length === 0) return Math.max(1, Math.ceil(emailText.length / 1800));
  return Math.max(1, files.length * 4 + Math.round(files.reduce((sum, file) => sum + file.name.length, 0) / 18));
}

function emailSubject(emailText: string) {
  const subject = emailText.split("\n").find((line) => line.toLowerCase().startsWith("subject:"));
  if (!subject) return "Imported_Email_Review.eml";
  const value = subject.replace(/^subject:\s*/i, "").trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  return `${value || "Imported_Email"}.eml`;
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function matchesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}
