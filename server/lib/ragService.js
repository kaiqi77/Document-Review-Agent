import { buildContext, retrieve } from "./retriever.js";
import { callChatModel, parseJsonObject } from "./llm.js";

export async function reviewWithRag({ taskId, fileName, fileType, pages, submitTime, content, apiConfig, reviewConfig }) {
  const query = `${fileName}\n${content || ""}`;
  const citations = await retrieve(query, { topK: 6 });
  const context = buildContext(citations);
  const config = normalizeReviewConfig(reviewConfig);
  const ruleMatches = config.ruleEngineEnabled ? buildRuleMatches({ fileName, content, citations }) : [];
  const anomalyAlerts = config.anomalyEngineEnabled ? buildAnomalyAlerts({ fileName, content, citations }) : [];
  const fallback = buildRuleBasedReview({ taskId, fileName, fileType, pages, submitTime, content, citations, ruleMatches, anomalyAlerts, config });

  if (citations.length === 0) {
    return { ...fallback, model: "local-rule-fallback", llmStatus: "no_relevant_context" };
  }

  const llm = await callChatModel({
    messages: [
      {
        role: "system",
        content: "You are a cosmetics regulatory compliance review assistant. Judge only based on the provided regulation excerpts. Output JSON only, without Markdown. Required fields: summary:string, risks:array. Each risk must contain: level(High Risk|Normal Risk|Compliant), clause, content, suggestion, citations(array of chunk ids). Write all user-facing text in English.",
      },
      {
        role: "user",
        content: `Regulatory evidence:\n${context}\n\nMaterial to review:\nFile name: ${fileName}\nContent: ${content || "No body text was provided; infer only from the file name and demo input."}\n\nAssess whether the material has risks related to registration or filing, labeling claims, ingredient safety, manufacturing and operation, advertising, efficacy claims, children cosmetics, or other requirements under the Cosmetics Supervision and Administration Regulation.`,
      },
    ],
    apiConfig,
  });

  if (llm.skipped) return { ...fallback, model: llm.usedModel, llmStatus: llm.reason };

  const parsed = parseJsonObject(llm.content);
  if (!parsed || !Array.isArray(parsed.risks)) {
    return { ...fallback, model: llm.usedModel, llmStatus: "invalid_llm_json" };
  }

  const risks = parsed.risks.map((risk, index) => normalizeRisk(risk, index, citations)).filter(Boolean);
  const highRisk = risks.filter((risk) => risk.level === "High Risk").length;
  const normalRisk = risks.filter((risk) => risk.level === "Normal Risk").length;
  const reviewEngines = buildEngineSummary({ ruleMatches, anomalyAlerts, citations, risks });
  const confidence = calculateConfidence({ citations, risks, ruleMatches, anomalyAlerts, llmStatus: "ok" });
  const routing = routeByConfidence(confidence, config, highRisk + normalRisk, anomalyAlerts.length);

  return {
    id: taskId,
    fileName,
    fileType,
    pages,
    submitTime,
    reviewTime: formatDateTime(new Date()),
    totalRisk: highRisk + normalRisk,
    highRisk,
    normalRisk,
    compliant: Math.max(3, citations.length + 4 - highRisk - normalRisk),
    summary: parsed.summary || fallback.summary,
    risks,
    citations,
    ruleMatches,
    anomalyAlerts,
    reviewEngines,
    confidence,
    confidenceBand: routing.band,
    routeAction: routing.action,
    badcaseCandidate: routing.badcaseCandidate,
    badcaseReason: routing.badcaseReason,
    model: llm.usedModel,
    llmStatus: "ok",
  };
}

function buildRuleBasedReview({ taskId, fileName, fileType, pages, submitTime, content, citations, ruleMatches, anomalyAlerts, config }) {
  const text = `${fileName} ${content || ""}`;
  const risks = [];
  const pushRisk = (level, clause, riskContent, suggestion) => {
    risks.push({
      id: `RISK-${String(risks.length + 1).padStart(3, "0")}`,
      level,
      clause,
      content: riskContent,
      suggestion,
      citations: citations.slice(0, 3).map((item) => item.id),
    });
  };

  if (/美白|祛斑|防晒|染发|烫发|脱毛|儿童|特殊化妆品/.test(text)) {
    pushRisk(
      "High Risk",
      "Special cosmetics registration / filing review",
      "The material may involve special cosmetics or children cosmetics. Registration or filing status, label samples, and efficacy claims should be checked against the approved or filed product information.",
      "Provide the registration certificate or filing record, efficacy-evaluation evidence, and label sample. Verify product classification and claims under the Cosmetics Supervision and Administration Regulation.",
    );
  }

  if (/功效|宣称|广告|最|第一|治疗|医疗|药/.test(text)) {
    pushRisk(
      "Normal Risk",
      "Labeling and efficacy-claim review",
      "The material contains efficacy, advertising, or medical-style wording, which may indicate over-claiming, absolute wording, or medical-effect claim risks.",
      "Limit claims to substantiated cosmetics efficacy, remove medical-effect and absolute wording, and retain efficacy-evaluation evidence for inspection.",
    );
  }

  if (/原料|禁用|限用|新原料|配方|成分/.test(text)) {
    pushRisk(
      "Normal Risk",
      "Ingredient safety and formula compliance",
      "The material references ingredients or formula information. It should be checked for prohibited ingredients, restricted ingredients, or new ingredients without required registration or filing.",
      "Provide a complete INCI ingredient list and ingredient safety documentation. Verify prohibited/restricted lists, new-ingredient registration or filing status, and the safety assessment report.",
    );
  }

  const highRisk = risks.filter((risk) => risk.level === "High Risk").length;
  const normalRisk = risks.filter((risk) => risk.level === "Normal Risk").length;
  const reviewEngines = buildEngineSummary({ ruleMatches, anomalyAlerts, citations, risks });
  const confidence = calculateConfidence({ citations, risks, ruleMatches, anomalyAlerts, llmStatus: citations.length ? "fallback" : "no_relevant_context" });
  const routing = routeByConfidence(confidence, config, highRisk + normalRisk, anomalyAlerts.length);

  return {
    id: taskId,
    fileName,
    fileType,
    pages,
    submitTime,
    reviewTime: formatDateTime(new Date()),
    totalRisk: risks.length,
    highRisk,
    normalRisk,
    compliant: Math.max(3, citations.length + 4 - risks.length),
    summary: risks.length > 0 ? "The local RAG rule engine detected potential cosmetics regulatory compliance risks." : "No obvious rule hits were detected. Add product category, label, formula, and registration or filing materials for reviewer confirmation.",
    risks,
    citations,
    ruleMatches,
    anomalyAlerts,
    reviewEngines,
    confidence,
    confidenceBand: routing.band,
    routeAction: routing.action,
    badcaseCandidate: routing.badcaseCandidate,
    badcaseReason: routing.badcaseReason,
  };
}

function buildRuleMatches({ fileName, content, citations }) {
  const text = `${fileName} ${content || ""}`;
  const definitions = [
    {
      id: "RULE-SPECIAL-COSMETICS",
      name: "Special cosmetics / children cosmetics keywords",
      pattern: /美白|祛斑|防晒|染发|烫发|脱毛|儿童|特殊化妆品/,
      severity: "High Risk",
      evidence: "Matched keywords related to special cosmetics, children cosmetics, or high-scrutiny efficacy claims.",
    },
    {
      id: "RULE-CLAIM-MEDICAL",
      name: "Efficacy claims / medical-style wording",
      pattern: /功效|宣称|广告|最|第一|治疗|医疗|药/,
      severity: "Normal Risk",
      evidence: "Matched efficacy, advertising, absolute, or medical-style wording signals.",
    },
    {
      id: "RULE-INGREDIENT-SAFETY",
      name: "Ingredient safety / formula compliance",
      pattern: /原料|禁用|限用|新原料|配方|成分/,
      severity: "Normal Risk",
      evidence: "Matched ingredient, prohibited/restricted substance, new-ingredient, or formula-safety signals.",
    },
  ];

  return definitions
    .filter((definition) => definition.pattern.test(text))
    .map(({ pattern, ...definition }) => ({
      ...definition,
      citations: citations.slice(0, 2).map((item) => item.id),
    }));
}

function buildAnomalyAlerts({ fileName, content, citations }) {
  const text = `${fileName} ${content || ""}`.trim();
  const alerts = [];

  if (text.length < 80) {
    alerts.push({
      id: "ANOMALY-LOW-CONTENT",
      type: "Incomplete Evidence",
      severity: "Medium",
      reason: "The submitted body text is short, so evidence may be insufficient and risks may be missed.",
      citations: citations.slice(0, 1).map((item) => item.id),
    });
  }

  if (/可能|疑似|待确认|不确定|TBD|待补充|未提供/.test(text)) {
    alerts.push({
      id: "ANOMALY-AMBIGUOUS-CONTENT",
      type: "Ambiguous Claim",
      severity: "Medium",
      reason: "The content contains uncertain or placeholder wording and should be confirmed by a human reviewer.",
      citations: citations.slice(0, 1).map((item) => item.id),
    });
  }

  if (citations.length === 0) {
    alerts.push({
      id: "ANOMALY-NO-RAG-EVIDENCE",
      type: "No Knowledge Match",
      severity: "High",
      reason: "No relevant regulation chunks were retrieved, so the result lacks sufficient regulatory grounding.",
      citations: [],
    });
  }

  return alerts;
}

function buildEngineSummary({ ruleMatches, anomalyAlerts, citations, risks }) {
  return [
    {
      id: "rule-matching",
      name: "Rule Matching Engine",
      status: ruleMatches.length ? "hit" : "clear",
      hitCount: ruleMatches.length,
      summary: ruleMatches.length ? `${ruleMatches.length} rule(s) matched.` : "No explicit rule matched.",
    },
    {
      id: "anomaly-alert",
      name: "Anomaly Alert Engine",
      status: anomalyAlerts.length ? "alert" : "clear",
      hitCount: anomalyAlerts.length,
      summary: anomalyAlerts.length ? `${anomalyAlerts.length} anomaly alert(s) triggered.` : "No anomaly alert triggered.",
    },
    {
      id: "rag-evidence",
      name: "RAG Evidence Retrieval",
      status: citations.length ? "ready" : "missing",
      hitCount: citations.length,
      summary: citations.length ? `${citations.length} regulation chunk(s) retrieved and ${risks.length} review item(s) generated.` : "No usable regulation chunk was retrieved.",
    },
  ];
}

function calculateConfidence({ citations, risks, ruleMatches, anomalyAlerts, llmStatus }) {
  let score = 0.48;
  if (llmStatus === "ok") score += 0.18;
  if (citations.length > 0) score += Math.min(0.18, citations.length * 0.03);
  if (ruleMatches.length > 0) score += Math.min(0.16, ruleMatches.length * 0.06);
  if (risks.length === 0 && ruleMatches.length === 0 && citations.length > 0) score += 0.06;
  score -= Math.min(0.22, anomalyAlerts.length * 0.08);
  return Math.max(0.05, Math.min(0.99, Number(score.toFixed(2))));
}

function routeByConfidence(confidence, config, riskCount, anomalyCount) {
  if (confidence >= config.highConfidence) {
    return {
      band: "High",
      action: riskCount > 0 ? "Display with evidence; reviewer can approve or reject." : "Auto-pass with evidence preview.",
      badcaseCandidate: false,
      badcaseReason: "",
    };
  }

  if (confidence >= config.mediumConfidence) {
    return {
      band: "Medium",
      action: "Show warning badge and require reviewer confirmation.",
      badcaseCandidate: anomalyCount > 0,
      badcaseReason: anomalyCount > 0 ? "Medium-confidence result with anomaly alerts; recommended for badcase monitoring." : "",
    };
  }

  return {
    band: "Low",
    action: "Manual review required; do not auto-finalize compliance decision.",
    badcaseCandidate: true,
    badcaseReason: "Low-confidence result requires manual review and should enter the badcase pool.",
  };
}

function normalizeReviewConfig(reviewConfig) {
  const high = Number(reviewConfig?.highConfidence);
  const medium = Number(reviewConfig?.mediumConfidence);
  const highConfidence = Number.isFinite(high) ? Math.max(0, Math.min(1, high)) : 0.8;
  const mediumConfidence = Number.isFinite(medium) ? Math.max(0, Math.min(highConfidence - 0.01, medium)) : 0.5;
  return {
    highConfidence,
    mediumConfidence,
    ruleEngineEnabled: reviewConfig?.ruleEngineEnabled !== false,
    anomalyEngineEnabled: reviewConfig?.anomalyEngineEnabled !== false,
  };
}

function normalizeRisk(risk, index, citations) {
  const level = ["High Risk", "Normal Risk", "Compliant"].includes(risk.level) ? risk.level : "Normal Risk";
  return {
    id: `RISK-${String(index + 1).padStart(3, "0")}`,
    level,
    clause: String(risk.clause || "Regulatory review item"),
    content: String(risk.content || "The model did not provide a specific risk description."),
    suggestion: String(risk.suggestion || "Supplement compliance materials and review the item against the cited regulation excerpts."),
    citations: Array.isArray(risk.citations) && risk.citations.length > 0 ? risk.citations : citations.slice(0, 2).map((item) => item.id),
  };
}

function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
