import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Download, AlertTriangle, CheckCircle, Shield, FileText, Calendar, Hash, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { getResult, markResultAsUserCorrected, type ReviewResult } from "../lib/demoAgent";
import { getReviewEngineConfig, submitBadcase } from "../lib/ragClient";

const mockResults: Record<string, ReviewResult> = {
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

const defaultResult: ReviewResult = {
  id: "RPT-2024-009",
  fileName: "Employment_Contract_Template.pdf",
  fileType: "PDF",
  pages: 12,
  submitTime: "2026-06-10 14:32",
  reviewTime: "2026-06-10 14:42",
  totalRisk: 0,
  highRisk: 0,
  normalRisk: 0,
  compliant: 14,
  risks: [],
};

export function ResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const result = (id && getResult(id)) || (id && mockResults[id]) || { ...defaultResult, id: id || "RPT-2024-009" };
  const [expanded, setExpanded] = useState<string | null>("RISK-001");
  const [badcaseStatus, setBadcaseStatus] = useState("");
  const reviewConfig = getReviewEngineConfig();

  const riskColor = (level: string) => {
    if (level === "High Risk") return { color: "#E84040", bg: "rgba(232,64,64,0.1)", border: "rgba(232,64,64,0.25)" };
    if (level === "Normal Risk") return { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" };
    return { color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" };
  };

  const confidence = typeof result.confidence === "number" ? result.confidence : undefined;
  const confidenceColor = !confidence ? "var(--muted-foreground)" : confidence >= reviewConfig.highConfidence ? "#10B981" : confidence >= reviewConfig.mediumConfidence ? "#F59E0B" : "#E84040";
  const handleCollectBadcase = async () => {
    try {
      await submitBadcase({
        taskId: result.id,
        fileName: result.fileName,
        label: result.badcaseCandidate ? "needs_escalation" : "accepted_for_monitoring",
        originalSnippet: result.summary || result.fileName,
        systemResult: `${result.summary || "No summary"}\nRisks: ${result.risks.map((risk) => `${risk.id} ${risk.level} ${risk.clause}`).join("; ")}`,
        confidence: result.confidence,
        matchedRuleOrAnomaly: [
          ...(result.ruleMatches || []).map((item) => `${item.id}: ${item.evidence}`),
          ...(result.anomalyAlerts || []).map((item) => `${item.id}: ${item.reason}`),
        ].join("\n"),
        reviewerCorrection: "Collected from result detail page for manual review.",
        rootCause: result.badcaseReason || "Manual reviewer requested badcase tracking.",
      });
      markResultAsUserCorrected(result.id);
      setBadcaseStatus("Badcase collected");
    } catch {
      setBadcaseStatus("Badcase submit failed");
    }
  };

  return (
    <div className="px-8 py-7 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/tasks")}
        className="flex items-center gap-1.5 mb-6 hover:opacity-70 transition-opacity"
        style={{ color: "var(--muted-foreground)", fontSize: 13 }}
      >
        <ArrowLeft size={14} />
        Back to Task List
      </button>

      <div className="mb-6">
        <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>REVIEW RESULT DETAIL</div>
        <div className="flex items-start justify-between">
          <h1 style={{ color: "var(--foreground)", fontSize: 22, fontWeight: 600 }}>{result.fileName}</h1>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:opacity-90"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13 }}
          >
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>

      {/* File info */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Task ID", value: result.id, icon: Hash },
          { label: "File Type", value: result.fileType, icon: FileText },
          { label: "Submit Time", value: result.submitTime, icon: Calendar },
          { label: "Pages", value: `${result.pages} pages`, icon: Layers },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <Icon size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 11 }}>{label}</div>
              <div style={{ color: "var(--foreground)", fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {(result.reviewEngines?.length || confidence !== undefined) && (
        <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} style={{ color: confidenceColor }} />
              <span style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 500 }}>Dual Engine & Confidence Routing</span>
            </div>
            {confidence !== undefined && (
              <span className="px-2 py-0.5 rounded" style={{ background: `${confidenceColor}20`, color: confidenceColor, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                {result.confidenceBand || "Confidence"}: {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
          <div className="p-5 grid grid-cols-3 gap-3">
            {(result.reviewEngines || []).map((engine) => (
              <div key={engine.id} className="p-4 rounded-lg" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500 }}>{engine.name}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{engine.status.toUpperCase()} · {engine.hitCount} hit(s)</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>{engine.summary}</div>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5 flex items-center justify-between gap-4">
            <div style={{ color: "var(--muted-foreground)", fontSize: 12.5, lineHeight: 1.6 }}>
              {result.routeAction || "Results are routed by confidence thresholds configured in System Settings."}
              {result.badcaseReason ? <span style={{ color: "#F59E0B" }}> {result.badcaseReason}</span> : null}
            </div>
            {reviewConfig.badcaseCollectionEnabled && (
              <button
                onClick={handleCollectBadcase}
                className="px-3 py-2 rounded-lg shrink-0 transition-all hover:opacity-85"
                style={{ background: result.badcaseCandidate ? "rgba(245,158,11,0.16)" : "var(--secondary)", color: result.badcaseCandidate ? "#F59E0B" : "var(--secondary-foreground)", border: "1px solid var(--border)", fontSize: 12 }}
              >
                {badcaseStatus || (result.badcaseCandidate ? "Collect Badcase" : "Mark as Badcase")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Compliance check summary */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <Shield size={15} style={{ color: "var(--primary)" }} />
            <span style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 500 }}>Compliance Check Result</span>
          </div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
            Reviewed: {result.reviewTime}
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x" style={{ borderColor: "var(--border)" }}>
          {[
            { label: "Total Risk Items", value: result.totalRisk, color: result.totalRisk === 0 ? "#10B981" : "#E84040" },
            { label: "High Risk", value: result.highRisk, color: "#E84040" },
            { label: "Normal Risk", value: result.normalRisk, color: "#F59E0B" },
            { label: "Compliant Items", value: result.compliant, color: "#10B981" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center py-5 gap-1">
              <div style={{ color, fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {(result.summary || result.model || result.citations?.length) && (
        <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <Shield size={15} style={{ color: "var(--primary)" }} />
            <span style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 500 }}>RAG Evidence</span>
            {result.model && (
              <span className="ml-auto px-2 py-0.5 rounded" style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }}>
                {result.model} · {result.llmStatus || "ready"}
              </span>
            )}
          </div>
          <div className="px-6 py-4">
            {result.summary && <p style={{ color: "var(--foreground)", fontSize: 13.5, lineHeight: 1.7, marginBottom: result.citations?.length ? 14 : 0 }}>{result.summary}</p>}
            {result.citations?.length ? (
              <div className="flex flex-col gap-2">
                {result.citations.slice(0, 3).map((citation) => (
                  <div key={citation.id} className="p-3 rounded-lg" style={{ background: "rgba(59,123,255,0.06)", border: "1px solid rgba(59,123,255,0.16)" }}>
                    <div style={{ color: "#7EB8FF", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginBottom: 5 }}>{citation.id} · {citation.article}</div>
                    <div style={{ color: "#A8C8F0", fontSize: 12.5, lineHeight: 1.6 }}>{citation.text.slice(0, 260)}{citation.text.length > 260 ? "…" : ""}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Risk details */}
      <div className="mb-4 flex items-center gap-2">
        <span style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 500 }}>Risk Details</span>
        {result.totalRisk > 0 && (
          <span
            className="px-2 py-0.5 rounded"
            style={{ background: "rgba(232,64,64,0.12)", color: "#E84040", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
          >
            Total detected risk items: {result.totalRisk}
          </span>
        )}
      </div>

      {result.risks.length === 0 ? (
        <div
          className="flex flex-col items-center py-12 rounded-xl gap-3"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <CheckCircle size={32} style={{ color: "#10B981" }} />
          <div style={{ color: "var(--foreground)", fontSize: 15, fontWeight: 500 }}>All checks passed</div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>No compliance issues detected in this document.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {result.risks.map((risk) => {
            const cfg = riskColor(risk.level);
            const isOpen = expanded === risk.id;
            return (
              <div
                key={risk.id}
                className="rounded-xl overflow-hidden"
                style={{ background: "var(--card)", border: `1px solid ${isOpen ? cfg.border : "var(--border)"}` }}
              >
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
                  onClick={() => setExpanded(isOpen ? null : risk.id)}
                  style={{ background: isOpen ? cfg.bg : "transparent" }}
                >
                  <span
                    className="px-2 py-0.5 rounded shrink-0"
                    style={{ background: cfg.bg, color: cfg.color, fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", border: `1px solid ${cfg.border}` }}
                  >
                    {risk.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div style={{ color: "var(--foreground)", fontSize: 13.5, fontWeight: 500 }}>{risk.clause}</div>
                    <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{risk.id}</div>
                  </div>
                  {isOpen ? <ChevronUp size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 flex flex-col gap-4 border-t" style={{ borderColor: cfg.border }}>
                    <div className="pt-4">
                      <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono', monospace" }}>Issue Description</div>
                      <p style={{ color: "var(--foreground)", fontSize: 13.5, lineHeight: 1.7 }}>{risk.content}</p>
                    </div>
                    <div
                      className="p-4 rounded-lg"
                      style={{ background: "rgba(59,123,255,0.06)", border: "1px solid rgba(59,123,255,0.2)" }}
                    >
                      <div style={{ color: "#7EB8FF", fontSize: 11.5, fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono', monospace" }}>AI Suggestion</div>
                      <p style={{ color: "#A8C8F0", fontSize: 13, lineHeight: 1.7 }}>{risk.suggestion}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
