import { AlertTriangle, X, Eye, Clock } from "lucide-react";

interface Props {
  onClose: () => void;
  onViewDetails: () => void;
}

export function RiskAlertPopup({ onClose, onViewDetails }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl"
        style={{ background: "var(--card)", border: "1px solid rgba(232,64,64,0.3)" }}
      >
        {/* Header stripe */}
        <div
          className="flex items-center gap-3 px-6 py-4 rounded-t-xl"
          style={{ background: "rgba(232,64,64,0.1)", borderBottom: "1px solid rgba(232,64,64,0.2)" }}
        >
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: "rgba(232,64,64,0.2)", border: "1px solid rgba(232,64,64,0.4)" }}
          >
            <AlertTriangle size={18} style={{ color: "#E84040" }} />
          </div>
          <div className="flex-1">
            <div style={{ color: "#E84040", fontWeight: 600, fontSize: 15 }}>Non-compliant Content Detected</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 12, marginTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>RISK-ALERT · 2 items require attention</div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70 transition-opacity" style={{ color: "var(--muted-foreground)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-3">
          <p style={{ color: "var(--card-foreground)", fontSize: 14, lineHeight: 1.6 }}>
            Please check and revise the risky content. The following documents contain potential compliance violations that need immediate review.
          </p>

          <div className="flex flex-col gap-2 mt-1">
            {[
              { id: "RPT-2024-003", name: "Supply_Chain_Agreement_v2.pdf", risk: "High Risk", clause: "Article 7 — Force Majeure clause deviates from standard" },
              { id: "RPT-2024-007", name: "Partnership_MOU_Draft.docx", risk: "Normal Risk", clause: "Section 4.2 — Liability cap below regulatory minimum" },
            ].map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
              >
                <div
                  className="mt-0.5 px-1.5 py-0.5 rounded text-nowrap"
                  style={{
                    background: item.risk === "High Risk" ? "rgba(232,64,64,0.15)" : "rgba(245,158,11,0.15)",
                    color: item.risk === "High Risk" ? "#E84040" : "#F59E0B",
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    border: `1px solid ${item.risk === "High Risk" ? "rgba(232,64,64,0.3)" : "rgba(245,158,11,0.3)"}`,
                  }}
                >
                  {item.risk}
                </div>
                <div className="min-w-0">
                  <div style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, marginTop: 2 }}>{item.clause}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ background: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: 13, border: "1px solid var(--border)" }}
          >
            <Clock size={13} />
            Later
          </button>
          <button
            onClick={onViewDetails}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all hover:opacity-90"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13 }}
          >
            <Eye size={13} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
