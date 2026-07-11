import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, RefreshCw, CheckCircle, BookOpen, Search, Tag, Clock, Database } from "lucide-react";
import { fetchRagHealth, reindexRag, searchRag, type RagChunk, type RagHealth } from "../lib/ragClient";

interface KBDoc {
  id: string;
  title: string;
  category: string;
  version: string;
  lastUpdated: string;
  status: "Active" | "Pending Sync" | "Outdated";
  ruleCount: number;
}

const initialDocs: KBDoc[] = [
  { id: "KB-001", title: "GDPR Compliance Checklist v4.1", category: "Data Privacy", version: "4.1", lastUpdated: "2026-06-08", status: "Active", ruleCount: 47 },
  { id: "KB-002", title: "Contract Liability Framework 2024", category: "Contract Law", version: "2.3", lastUpdated: "2026-05-22", status: "Active", ruleCount: 31 },
  { id: "KB-003", title: "Force Majeure Standard Clauses", category: "Contract Law", version: "1.8", lastUpdated: "2026-05-15", status: "Active", ruleCount: 12 },
  { id: "KB-004", title: "Export Control & Sanctions Policy", category: "Regulatory", version: "3.0", lastUpdated: "2026-04-30", status: "Pending Sync", ruleCount: 58 },
  { id: "KB-005", title: "IP Transfer Agreement Guidelines", category: "Intellectual Property", version: "2.1", lastUpdated: "2026-04-12", status: "Active", ruleCount: 24 },
  { id: "KB-006", title: "Employment Contract Standards", category: "HR & Labor", version: "5.0", lastUpdated: "2026-03-18", status: "Active", ruleCount: 39 },
  { id: "KB-007", title: "Anti-Bribery & Corruption Rules", category: "Compliance", version: "1.4", lastUpdated: "2026-02-28", status: "Outdated", ruleCount: 22 },
  { id: "KB-008", title: "SLA & Uptime Standards", category: "Technology", version: "2.0", lastUpdated: "2026-05-05", status: "Active", ruleCount: 15 },
];

const categoryColor = (cat: string) => {
  const map: Record<string, string> = {
    "Data Privacy": "#8B5CF6",
    "Contract Law": "#3B7BFF",
    "Regulatory": "#F59E0B",
    "Intellectual Property": "#10B981",
    "HR & Labor": "#EC4899",
    "Compliance": "#E84040",
    "Technology": "#06B6D4",
  };
  return map[cat] || "#6B7FA0";
};

const statusCfg = {
  "Active": { color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  "Pending Sync": { color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  "Outdated": { color: "#E84040", bg: "rgba(232,64,64,0.1)" },
};

export function KnowledgeBase() {
  const [docs, setDocs] = useState<KBDoc[]>(initialDocs);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string>("All");
  const [ragHealth, setRagHealth] = useState<RagHealth | null>(null);
  const [ragChunks, setRagChunks] = useState<RagChunk[]>([]);
  const [ragQuery, setRagQuery] = useState("儿童化妆品 功效宣称 注册备案");
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState("");

  useEffect(() => {
    void loadRagHealth();
  }, []);

  const categories = ["All", ...Array.from(new Set(docs.map((d) => d.category)))];

  const filtered = docs.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === "All" || d.category === selectedCat;
    return matchSearch && matchCat;
  });

  const handleSync = (id: string) => {
    setSyncing(id);
    setTimeout(() => {
      setDocs((prev) => prev.map((d) => d.id === id ? { ...d, status: "Active" as const, lastUpdated: "2026-06-10" } : d));
      setSyncing(null);
    }, 1500);
  };

  const handleDelete = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const loadRagHealth = async () => {
    try {
      setRagError("");
      const health = await fetchRagHealth();
      setRagHealth(health);
      setRagChunks(health.sampleChunks || []);
    } catch (error) {
      setRagError(error instanceof Error ? error.message : "RAG API unavailable");
    }
  };

  const handleRagSearch = async () => {
    try {
      setRagLoading(true);
      setRagError("");
      setRagChunks(await searchRag(ragQuery, 5));
    } catch (error) {
      setRagError(error instanceof Error ? error.message : "RAG search failed");
    } finally {
      setRagLoading(false);
    }
  };

  const handleRagReindex = async () => {
    try {
      setRagLoading(true);
      setRagError("");
      const health = await reindexRag();
      setRagHealth(health);
      setRagChunks(health.sampleChunks || []);
    } catch (error) {
      setRagError(error instanceof Error ? error.message : "RAG reindex failed");
    } finally {
      setRagLoading(false);
    }
  };

  const totalRules = docs.reduce((s, d) => s + d.ruleCount, 0);
  const activeCount = docs.filter((d) => d.status === "Active").length;

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">
      <div className="mb-6">
        <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>KNOWLEDGE BASE</div>
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ color: "var(--foreground)", fontSize: 22, fontWeight: 600 }}>Compliance Knowledge Base Management</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>Rules will be vectorized and activated automatically after update.</p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13 }}
          >
            <Plus size={14} />
            Add Document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Documents", value: docs.length, icon: BookOpen, color: "#3B7BFF" },
          { label: "Active Rules", value: totalRules, icon: CheckCircle, color: "#10B981" },
          { label: "Active Documents", value: activeCount, icon: Tag, color: "#8B5CF6" },
          { label: "Pending Sync", value: docs.filter(d => d.status === "Pending Sync").length, icon: Clock, color: "#F59E0B" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <div style={{ color: "var(--foreground)", fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 max-w-xs"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <Search size={13} style={{ color: "var(--muted-foreground)" }} />
          <input
            className="outline-none bg-transparent flex-1"
            style={{ color: "var(--foreground)", fontSize: 13 }}
            placeholder="Search knowledge base..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className="px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: selectedCat === cat ? (cat === "All" ? "var(--secondary)" : `${categoryColor(cat)}18`) : "transparent",
                color: selectedCat === cat ? (cat === "All" ? "var(--foreground)" : categoryColor(cat)) : "var(--muted-foreground)",
                border: `1px solid ${selectedCat === cat ? "var(--border)" : "transparent"}`,
                fontSize: 12,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* RAG knowledge base */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <Database size={14} style={{ color: "var(--primary)" }} />
            <div>
              <div style={{ color: "var(--foreground)", fontSize: 13.5, fontWeight: 500 }}>RAG Knowledge Base — 化妆品监督管理条例</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>
                PDF chunking + keyword vector index preview
              </div>
            </div>
          </div>
          <button
            onClick={handleRagReindex}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: "rgba(59,123,255,0.1)", color: "#3B7BFF", fontSize: 12 }}
          >
            <RefreshCw size={12} className={ragLoading ? "animate-spin" : ""} />
            Rebuild Index
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          {[
            { label: "Source PDF", value: ragHealth?.document?.sourceFile || "Not loaded" },
            { label: "Chunks", value: ragHealth?.document?.chunkCount ?? "--" },
            { label: "Index Type", value: "Keyword Vector" },
            { label: "Built At", value: ragHealth?.document?.builtAt ? new Date(ragHealth.document.builtAt).toLocaleString() : "--" },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-lg" style={{ background: "var(--muted)" }}>
              <div style={{ color: "var(--muted-foreground)", fontSize: 11 }}>{label}</div>
              <div style={{ color: "var(--foreground)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
              <Search size={13} style={{ color: "var(--muted-foreground)" }} />
              <input
                className="outline-none bg-transparent flex-1"
                style={{ color: "var(--foreground)", fontSize: 13 }}
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                placeholder="Search regulation chunks..."
              />
            </div>
            <button
              onClick={handleRagSearch}
              className="px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 12 }}
            >
              Search Chunks
            </button>
          </div>

          {ragError && <div className="mb-3" style={{ color: "#E84040", fontSize: 12 }}>{ragError}</div>}

          <div className="grid grid-cols-1 gap-2">
            {ragChunks.slice(0, 5).map((chunk) => (
              <div key={chunk.id} className="p-3 rounded-lg" style={{ background: "rgba(59,123,255,0.05)", border: "1px solid rgba(59,123,255,0.14)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: "#7EB8FF", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{chunk.id}</span>
                  <span style={{ color: "var(--foreground)", fontSize: 12, fontWeight: 500 }}>{chunk.article}</span>
                  <span className="ml-auto" style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                    score {chunk.score ?? "--"} · terms {chunk.termCount ?? chunk.matchedTerms?.length ?? "--"}
                  </span>
                </div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 12, lineHeight: 1.6 }}>{chunk.text.slice(0, 220)}{chunk.text.length > 220 ? "…" : ""}</div>
                {chunk.matchedTerms?.length ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {chunk.matchedTerms.slice(0, 8).map((term) => (
                      <span key={term} className="px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", fontSize: 10.5 }}>{term}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div
          className="grid px-5 py-3 border-b"
          style={{ gridTemplateColumns: "100px 1fr 140px 100px 120px 110px 130px", borderColor: "var(--border)", background: "var(--muted)" }}
        >
          {["ID", "Document Title", "Category", "Version", "Last Updated", "Status", "Actions"].map((h) => (
            <div key={h} style={{ color: "var(--muted-foreground)", fontSize: 11.5, fontWeight: 500 }}>{h}</div>
          ))}
        </div>

        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {filtered.map((doc) => {
            const sc = statusCfg[doc.status];
            const cc = categoryColor(doc.category);
            const isSyncing = syncing === doc.id;
            return (
              <div
                key={doc.id}
                className="grid items-center px-5 py-3.5 hover:opacity-90 transition-opacity"
                style={{ gridTemplateColumns: "100px 1fr 140px 100px 120px 110px 130px" }}
              >
                <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace" }}>{doc.id}</div>
                <div className="pr-4 min-w-0">
                  <div style={{ color: "var(--foreground)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>{doc.ruleCount} rules vectorized</div>
                </div>
                <div>
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ background: `${cc}18`, color: cc, fontSize: 11, border: `1px solid ${cc}30` }}
                  >
                    {doc.category}
                  </span>
                </div>
                <div style={{ color: "var(--foreground)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>v{doc.version}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{doc.lastUpdated}</div>
                <div>
                  <span
                    className="px-2.5 py-1 rounded-lg"
                    style={{ background: sc.bg, color: sc.color, fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {doc.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    className="p-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ background: "rgba(59,123,255,0.1)", color: "#3B7BFF" }}
                    title="Edit"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ background: isSyncing ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.1)", color: isSyncing ? "#10B981" : "#F59E0B" }}
                    title="Sync Index"
                    onClick={() => handleSync(doc.id)}
                  >
                    <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ background: "rgba(232,64,64,0.1)", color: "#E84040" }}
                    title="Delete"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="mt-5 flex items-center gap-2 p-4 rounded-xl"
        style={{ background: "rgba(59,123,255,0.06)", border: "1px solid rgba(59,123,255,0.18)" }}
      >
        <RefreshCw size={13} style={{ color: "#3B7BFF", flexShrink: 0 }} />
        <p style={{ color: "#7EB8FF", fontSize: 12.5, lineHeight: 1.5 }}>
          Rules will be vectorized and activated automatically after update. Syncing may take 1–5 minutes depending on document size.
        </p>
      </div>
    </div>
  );
}
