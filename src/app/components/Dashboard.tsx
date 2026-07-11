import { useNavigate } from "react-router";
import { ArrowRight, TrendingUp, Clock, Zap, Users, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { getReviewMetrics, getTasks } from "../lib/demoAgent";

const throughputData = [
  { month: "Jan", before: 0.33, after: 1.2 },
  { month: "Feb", before: 0.33, after: 1.5 },
  { month: "Mar", before: 0.33, after: 1.7 },
  { month: "Apr", before: 0.33, after: 1.85 },
  { month: "May", before: 0.33, after: 1.95 },
  { month: "Jun", before: 0.33, after: 2.0 },
];

const weeklyData = [
  { day: "Mon", tasks: 8 },
  { day: "Tue", tasks: 12 },
  { day: "Wed", tasks: 9 },
  { day: "Thu", tasks: 15 },
  { day: "Fri", tasks: 11 },
  { day: "Sat", tasks: 4 },
  { day: "Sun", tasks: 2 },
];

export function Dashboard() {
  const navigate = useNavigate();
  const metrics = getReviewMetrics();
  const recentActivity = getTasks().slice(0, 5).map((task, index) => ({
    id: task.id,
    name: task.fileName,
    time: index === 0 ? "just now" : `${index * 12} min ago`,
    status: task.status,
    risk: task.status === "Risk Detected",
  }));

  return (
    <div className="px-8 py-7 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>DASHBOARD OVERVIEW</div>
        <h1 style={{ color: "var(--foreground)", fontSize: 24, fontWeight: 600, lineHeight: 1.2 }}>PAL — Automated Document Review Agent</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 6 }}>AI-powered compliance verification for enterprise legal documents.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Average Review Time",
            before: "180 min",
            after: "30 min",
            change: "83% Efficiency Improved",
            icon: Clock,
            color: "#3B7BFF",
          },
          {
            label: "Processing Throughput",
            before: "0.33 docs/h",
            after: "2.00 docs/h",
            change: "+507% Increase",
            icon: Zap,
            color: "#10B981",
          },
          {
            label: "Annual Hours Saved",
            before: "0",
            after: "150,000+",
            change: "Labor Hours Eliminated",
            icon: Users,
            color: "#8B5CF6",
          },
          {
            label: "Docs Reviewed Today",
            before: "",
            after: "47",
            change: "3 Risk Flagged",
            icon: FileText,
            color: "#F59E0B",
          },
        ].map(({ label, before, after, change, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl p-5"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between mb-3">
              <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            {before && (
              <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", textDecoration: "line-through", marginBottom: 2 }}>
                {before}
              </div>
            )}
            <div style={{ color: "var(--foreground)", fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{after}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp size={11} style={{ color }} />
              <span style={{ color, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Human-in-the-loop quality metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Task Completion Rate",
            value: `${Math.round(metrics.taskCompletionRate * 100)}%`,
            desc: `${metrics.completedTasks}/${metrics.totalTasks} tasks completed`,
            icon: CheckCircle,
            color: "#10B981",
          },
          {
            label: "Avg. Interaction Rounds",
            value: `${metrics.averageInteractionRounds.toFixed(1)} rounds`,
            desc: "Average reviewer ↔ Agent turns per completed task",
            icon: Users,
            color: "#3B7BFF",
          },
          {
            label: "User Correction Rate",
            value: `${Math.round(metrics.userCorrectionRate * 100)}%`,
            desc: `${metrics.correctedOutputs}/${metrics.reviewedOutputs} outputs modified by users`,
            icon: AlertTriangle,
            color: "#F59E0B",
          },
        ].map(({ label, value, desc, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{label}</div>
                <div style={{ color: "var(--foreground)", fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{value}</div>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Throughput chart */}
        <div className="col-span-2 rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500 }}>Processing Throughput</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>Before vs. after PAL deployment (docs/hour)</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(107,127,160,0.5)" }} />
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Before</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#3B7BFF" }} />
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>After</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={throughputData}>
              <defs>
                <linearGradient id="afterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B7BFF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B7BFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#6B7FA0", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6B7FA0", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#0F1623", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#A8B8D0" }}
              />
              <Area type="monotone" dataKey="before" stroke="rgba(107,127,160,0.5)" strokeWidth={1.5} fill="none" strokeDasharray="4 3" dot={false} />
              <Area type="monotone" dataKey="after" stroke="#3B7BFF" strokeWidth={2} fill="url(#afterGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly bar chart */}
        <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Weekly Tasks</div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, marginBottom: 16 }}>Documents processed this week</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData} barSize={14}>
              <XAxis dataKey="day" tick={{ fill: "#6B7FA0", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#0F1623", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#A8B8D0" }}
              />
              <Bar dataKey="tasks" radius={[3, 3, 0, 0]}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-${entry.day}`} fill={index === 3 ? "#3B7BFF" : "#1A2236"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action Entrance + Recent */}
      <div className="grid grid-cols-3 gap-4">
        {/* Actions */}
        <div className="flex flex-col gap-3">
          {[
            { label: "New Review Task", desc: "Upload & start compliance check", to: "/upload", accent: "#3B7BFF", bg: "rgba(59,123,255,0.08)" },
            { label: "Task List", desc: "View all processing tasks", to: "/tasks", accent: "#10B981", bg: "rgba(16,185,129,0.08)" },
            { label: "Knowledge Base", desc: "Manage compliance rules", to: "/knowledge", accent: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
          ].map(({ label, desc, to, accent, bg }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: bg, border: `1px solid ${accent}30` }}
            >
              <ArrowRight size={14} style={{ color: accent, flexShrink: 0 }} />
              <div>
                <div style={{ color: "var(--foreground)", fontSize: 13.5, fontWeight: 500 }}>{label}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Recent activity */}
        <div className="col-span-2 rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
            <span style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500 }}>Recent Activity</span>
            <button onClick={() => navigate("/tasks")} style={{ color: "var(--primary)", fontSize: 12 }}>View all →</button>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-5 py-3 hover:opacity-80 cursor-pointer transition-opacity"
                onClick={() => navigate(`/tasks/${item.id}`)}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: item.risk ? "rgba(232,64,64,0.1)" : "rgba(16,185,129,0.1)" }}>
                  {item.risk
                    ? <AlertTriangle size={13} style={{ color: "#E84040" }} />
                    : <CheckCircle size={13} style={{ color: "#10B981" }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ color: "var(--foreground)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{item.id} · {item.time}</div>
                </div>
                <div
                  className="px-2 py-0.5 rounded text-nowrap"
                  style={{
                    background: item.status === "Risk Detected" ? "rgba(232,64,64,0.12)" : item.status === "Processing" ? "rgba(59,123,255,0.12)" : "rgba(16,185,129,0.12)",
                    color: item.status === "Risk Detected" ? "#E84040" : item.status === "Processing" ? "#3B7BFF" : "#10B981",
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
