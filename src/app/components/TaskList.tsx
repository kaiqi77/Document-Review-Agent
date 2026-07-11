import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Filter, Download, Eye, AlertTriangle, CheckCircle, Loader, ChevronUp, ChevronDown } from "lucide-react";
import { getTasks, type ReviewTask } from "../lib/demoAgent";

type SortKey = "id" | "submitTime" | "status";

export function TaskList() {
  const navigate = useNavigate();
  const [allTasks, setAllTasks] = useState<ReviewTask[]>(() => getTasks());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Processing" | "Completed" | "Risk Detected">("All");
  const [sortKey, setSortKey] = useState<SortKey>("submitTime");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setAllTasks(getTasks()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = allTasks
    .filter((t) => {
      const matchSearch = t.fileName.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "All" || t.status === filter;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      const mul = sortAsc ? 1 : -1;
      return mul * a[sortKey].localeCompare(b[sortKey]);
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const statusConfig = {
    "Completed": { color: "#10B981", bg: "rgba(16,185,129,0.1)", icon: CheckCircle },
    "Risk Detected": { color: "#E84040", bg: "rgba(232,64,64,0.1)", icon: AlertTriangle },
    "Processing": { color: "#3B7BFF", bg: "rgba(59,123,255,0.1)", icon: Loader },
  };

  const counts = {
    All: allTasks.length,
    Processing: allTasks.filter(t => t.status === "Processing").length,
    Completed: allTasks.filter(t => t.status === "Completed").length,
    "Risk Detected": allTasks.filter(t => t.status === "Risk Detected").length,
  };

  const SortIcon = ({ k }: { k: SortKey }) => (
    sortKey === k
      ? (sortAsc ? <ChevronUp size={11} style={{ color: "var(--primary)" }} /> : <ChevronDown size={11} style={{ color: "var(--primary)" }} />)
      : <ChevronDown size={11} style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
  );

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">
      <div className="mb-6">
        <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>TASK MANAGEMENT</div>
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ color: "var(--foreground)", fontSize: 22, fontWeight: 600 }}>Task List</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>Monitor all compliance review tasks and their status.</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5">
        {(["All", "Processing", "Completed", "Risk Detected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all"
            style={{
              background: filter === f ? (f === "Risk Detected" ? "rgba(232,64,64,0.12)" : f === "Completed" ? "rgba(16,185,129,0.12)" : f === "Processing" ? "rgba(59,123,255,0.12)" : "var(--secondary)") : "transparent",
              color: filter === f ? (f === "Risk Detected" ? "#E84040" : f === "Completed" ? "#10B981" : f === "Processing" ? "#3B7BFF" : "var(--foreground)") : "var(--muted-foreground)",
              border: `1px solid ${filter === f ? "rgba(255,255,255,0.1)" : "transparent"}`,
              fontSize: 13,
            }}
          >
            {f}
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(255,255,255,0.08)",
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                color: "inherit",
              }}
            >
              {counts[f]}
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <Search size={13} style={{ color: "var(--muted-foreground)" }} />
            <input
              className="outline-none bg-transparent"
              style={{ color: "var(--foreground)", fontSize: 13, width: 180 }}
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: 13 }}
          >
            <Filter size={13} />
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {/* Header */}
        <div
          className="grid px-5 py-3 border-b"
          style={{ gridTemplateColumns: "150px 1fr 155px 120px 125px 120px", borderColor: "var(--border)", background: "var(--muted)" }}
        >
          {[
            { label: "Task ID", key: "id" as SortKey },
            { label: "File Name", key: null },
            { label: "Submit Time", key: "submitTime" as SortKey },
            { label: "Status", key: "status" as SortKey },
            { label: "Confidence", key: null },
            { label: "Operation", key: null },
          ].map(({ label, key }) => (
            <button
              key={label}
              className="flex items-center gap-1 text-left"
              style={{ color: "var(--muted-foreground)", fontSize: 11.5, fontWeight: 500, cursor: key ? "pointer" : "default" }}
              onClick={() => key && toggleSort(key)}
            >
              {label}
              {key && <SortIcon k={key} />}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {filtered.length === 0 ? (
            <div className="py-12 text-center" style={{ color: "var(--muted-foreground)", fontSize: 14 }}>No tasks found</div>
          ) : (
            filtered.map((task) => {
              const cfg = statusConfig[task.status];
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={task.id}
                  className="grid items-center px-5 py-3.5 hover:opacity-80 cursor-pointer transition-opacity"
                  style={{ gridTemplateColumns: "150px 1fr 155px 120px 125px 120px" }}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <div style={{ color: "var(--primary)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{task.id}</div>
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <div style={{ color: "var(--foreground)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.fileName}</div>
                    <span style={{ color: "var(--muted-foreground)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, background: "var(--muted)", padding: "1px 5px", borderRadius: 3 }}>{task.fileType}</span>
                  </div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{task.submitTime}</div>
                  <div>
                    <span
                      className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg"
                      style={{ background: cfg.bg, color: cfg.color, fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <StatusIcon size={11} className={task.status === "Processing" ? "animate-spin" : ""} />
                      {task.status}
                    </span>
                  </div>
                  <div>
                    {typeof task.confidence === "number" ? (
                      <span
                        className="px-2.5 py-1 rounded-lg"
                        style={{
                          background: task.confidenceBand === "High" ? "rgba(16,185,129,0.1)" : task.confidenceBand === "Medium" ? "rgba(245,158,11,0.1)" : "rgba(232,64,64,0.1)",
                          color: task.confidenceBand === "High" ? "#10B981" : task.confidenceBand === "Medium" ? "#F59E0B" : "#E84040",
                          fontSize: 11.5,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {Math.round(task.confidence * 100)}% {task.badcaseCandidate ? "· Review" : ""}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted-foreground)", fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace" }}>Pending</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ background: "rgba(59,123,255,0.1)", color: "#3B7BFF", fontSize: 11.5 }}
                    >
                      <Eye size={11} />
                      Detail
                    </button>
                    {task.status === "Completed" || task.status === "Risk Detected" ? (
                      <button
                        className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                        style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}
                      >
                        <Download size={12} />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <span style={{ color: "var(--muted-foreground)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
          Showing {filtered.length} of {allTasks.length} tasks
        </span>
      </div>
    </div>
  );
}
