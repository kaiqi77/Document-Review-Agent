import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Upload, FileText, Mail, X, CheckCircle, AlertCircle, RotateCcw, Play, Bot, Search, ShieldCheck, FileCheck2, Cloud, FolderSync, Link2, Activity, Wifi } from "lucide-react";
import { createReviewTask } from "../lib/demoAgent";
import {
  clearSharePointConnection,
  connectSharePoint,
  defaultSharePointConnection,
  fetchSharePointChanges,
  getProcessedSharePointFileIds,
  getSharePointConnection,
  markSharePointFilesProcessed,
  resetProcessedSharePointFiles,
  saveSharePointConnection,
  type SharePointConnection,
  type SharePointFile,
} from "../lib/sharepointClient";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
}

const initialFiles: UploadedFile[] = [
  { id: "1", name: "Partnership_Agreement_2024.pdf", size: "2.4 MB", type: "pdf" },
  { id: "2", name: "Vendor_NDA_Template.docx", size: "890 KB", type: "docx" },
];

export function DocumentUpload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [dragOver, setDragOver] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [activeTab, setActiveTab] = useState<"file" | "email" | "sharepoint">("file");
  const [reviewing, setReviewing] = useState(false);
  const [agentStep, setAgentStep] = useState(0);
  const [sharePointConnection, setSharePointConnection] = useState<SharePointConnection>(() => getSharePointConnection() || defaultSharePointConnection);
  const [sharePointConnected, setSharePointConnected] = useState(() => Boolean(getSharePointConnection()));
  const [sharePointMonitoring, setSharePointMonitoring] = useState(() => Boolean(getSharePointConnection()));
  const [sharePointCursor, setSharePointCursor] = useState<string>();
  const [sharePointFiles, setSharePointFiles] = useState<SharePointFile[]>([]);
  const [sharePointStatus, setSharePointStatus] = useState("Not connected");
  const [sharePointError, setSharePointError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const agentSteps = [
    { label: "Ingesting documents", icon: FileText },
    { label: "Matching compliance rules", icon: ShieldCheck },
    { label: "Checking anomaly alerts", icon: AlertCircle },
    { label: "Routing by confidence threshold", icon: Activity },
    { label: "Generating report", icon: FileCheck2 },
  ];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    const newFiles = dropped.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(0)} KB`,
      type: f.name.split(".").pop() || "file",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const handleStartReview = () => {
    if (reviewing || (files.length === 0 && !emailText.trim())) return;
    setReviewing(true);
    setAgentStep(0);
    const task = createReviewTask(files, emailText);

    agentSteps.forEach((_, index) => {
      setTimeout(() => setAgentStep(index), 800 + index * 1100);
    });

    setTimeout(() => {
      navigate(`/tasks/${task.id}`);
    }, 5600);
  };

  const handleSharePointConnect = async () => {
    if (!sharePointConnection.siteUrl.trim()) {
      setSharePointError("SharePoint site URL is required.");
      return;
    }

    setSharePointError("");
    setSharePointStatus("Connecting to SharePoint site...");
    try {
      const response = await connectSharePoint(sharePointConnection);
      saveSharePointConnection(sharePointConnection);
      setSharePointConnected(true);
      setSharePointMonitoring(true);
      setSharePointCursor(response.cursor);
      setSharePointStatus(response.message || "Connected. Monitoring folder changes.");
    } catch (error) {
      setSharePointError(error instanceof Error ? error.message : "Unable to connect SharePoint.");
      setSharePointStatus("Connection failed");
    }
  };

  const handleSharePointDisconnect = () => {
    clearSharePointConnection();
    setSharePointConnected(false);
    setSharePointMonitoring(false);
    setSharePointCursor(undefined);
    setSharePointStatus("Not connected");
  };

  const handleSharePointReset = () => {
    resetProcessedSharePointFiles();
    setSharePointFiles([]);
    setSharePointCursor(undefined);
    setSharePointStatus("Processed file history cleared. New uploads will create review tasks again.");
  };

  useEffect(() => {
    if (!sharePointConnected || !sharePointMonitoring) return;

    let cancelled = false;
    let cursor = sharePointCursor;
    const poll = async () => {
      try {
        const response = await fetchSharePointChanges(sharePointConnection, cursor);
        if (cancelled) return;

        const processedIds = new Set(getProcessedSharePointFileIds());
        const newFiles = (response.files || []).filter((file) => !processedIds.has(file.id));

        if (newFiles.length > 0) {
          const taskIds = newFiles.map((file) => {
            const task = createReviewTask([file], `SharePoint source: ${file.sourceUrl}`);
            return task.id;
          });
          markSharePointFilesProcessed(newFiles.map((file) => file.id));
          setSharePointFiles((prev) => [...newFiles, ...prev].slice(0, 12));
          setSharePointStatus(`${newFiles.length} new upload${newFiles.length > 1 ? "s" : ""} detected. Review tasks started: ${taskIds.join(", ")}`);
        } else {
          setSharePointStatus("Monitoring active. No new uploads detected.");
        }

  cursor = response.cursor;
  setSharePointCursor(response.cursor);
        setSharePointError("");
      } catch (error) {
        if (!cancelled) {
          setSharePointError(error instanceof Error ? error.message : "SharePoint monitoring failed.");
          setSharePointStatus("Monitoring paused by an error");
        }
      }
    };

    void poll();
    const timer = window.setInterval(poll, Math.max(5, sharePointConnection.pollSeconds) * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sharePointConnected, sharePointMonitoring, sharePointConnection]);

  const extColor = (type: string) => {
    if (type === "pdf") return "#E84040";
    if (type === "docx" || type === "doc") return "#3B7BFF";
    if (type === "txt") return "#10B981";
    return "#6B7FA0";
  };

  return (
    <div className="px-8 py-7 max-w-4xl mx-auto">
      <div className="mb-7">
        <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>DOCUMENT UPLOAD</div>
        <h1 style={{ color: "var(--foreground)", fontSize: 22, fontWeight: 600 }}>Create New Compliance Review Task</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 5 }}>Upload files or import business emails for automated compliance verification.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg w-fit" style={{ background: "var(--muted)" }}>
        {(["file", "email", "sharepoint"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-md transition-all"
            style={{
              background: activeTab === tab ? "var(--card)" : "transparent",
              color: activeTab === tab ? "var(--foreground)" : "var(--muted-foreground)",
              fontSize: 13,
              fontWeight: activeTab === tab ? 500 : 400,
              border: activeTab === tab ? "1px solid var(--border)" : "1px solid transparent",
            }}
          >
            {tab === "file" ? "Upload Files" : tab === "email" ? "Import Email" : "SharePoint Monitor"}
          </button>
        ))}
      </div>

      {activeTab === "file" ? (
        <>
          {/* Drop zone */}
          <div
            className="rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer mb-5 transition-all"
            style={{
              border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border)"}`,
              background: dragOver ? "rgba(59,123,255,0.05)" : "var(--card)",
              padding: "48px 32px",
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: dragOver ? "rgba(59,123,255,0.15)" : "var(--muted)" }}
            >
              <Upload size={22} style={{ color: dragOver ? "var(--primary)" : "var(--muted-foreground)" }} />
            </div>
            <div className="text-center">
              <div style={{ color: "var(--foreground)", fontSize: 15, fontWeight: 500 }}>Drop files here to upload</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>
                Supported formats: <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>PDF, DOCX, TXT, EML</span>
              </div>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                className="px-4 py-2 rounded-lg transition-all hover:opacity-90"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13 }}
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              >
                Select Files
              </button>
              <button
                className="px-4 py-2 rounded-lg transition-all hover:opacity-80"
                style={{ background: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: 13, border: "1px solid var(--border)" }}
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              >
                Batch Upload
              </button>
            </div>
            <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.doc,.txt,.eml" className="hidden" onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              const newFiles = selected.map((f, i) => ({
                id: `${Date.now()}-${i}`,
                name: f.name,
                size: `${(f.size / 1024).toFixed(0)} KB`,
                type: f.name.split(".").pop() || "file",
              }));
              setFiles((prev) => [...prev, ...newFiles]);
            }} />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="rounded-xl overflow-hidden mb-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500 }}>
                  {files.length} file{files.length > 1 ? "s" : ""} queued
                </span>
                <span style={{ color: "var(--muted-foreground)", fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace" }}>
                  Ready for review
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 px-5 py-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${extColor(file.type)}18` }}
                    >
                      <FileText size={14} style={{ color: extColor(file.type) }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ color: "var(--foreground)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                      <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                        {file.type.toUpperCase()} · {file.size}
                      </div>
                    </div>
                    <CheckCircle size={14} style={{ color: "#10B981", flexShrink: 0 }} />
                    <button onClick={() => removeFile(file.id)} className="p-1 rounded hover:opacity-70 transition-opacity ml-1" style={{ color: "var(--muted-foreground)" }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : activeTab === "email" ? (
        <div className="mb-5">
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <Mail size={14} style={{ color: "var(--muted-foreground)" }} />
              <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>Paste email content for compliance review</span>
            </div>
            <textarea
              className="w-full resize-none outline-none"
              style={{
                background: "transparent",
                color: "var(--foreground)",
                fontSize: 13.5,
                padding: "16px 20px",
                minHeight: 220,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.7,
              }}
              placeholder={`From: supplier@acmecorp.com\nTo: legal@yourcompany.com\nSubject: Contract Amendment Proposal\n\n[Paste email content here...]`}
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5 mb-5">
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,123,255,0.12)", color: "var(--primary)" }}>
                  <Cloud size={18} />
                </div>
                <div>
                  <div style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 500 }}>SharePoint site connection</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 12 }}>Connect a site folder. New files trigger review tasks automatically.</div>
                </div>
              </div>
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{ background: sharePointConnected ? "rgba(16,185,129,0.1)" : "var(--muted)", color: sharePointConnected ? "#10B981" : "var(--muted-foreground)", fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Wifi size={11} />
                {sharePointConnected ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 p-5">
              <label className="col-span-2">
                <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, marginBottom: 7 }}>Site URL</div>
                <input
                  className="w-full outline-none rounded-lg px-3 py-2.5"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13 }}
                  placeholder="https://tenant.sharepoint.com/sites/legal-compliance"
                  value={sharePointConnection.siteUrl}
                  onChange={(e) => setSharePointConnection((prev) => ({ ...prev, siteUrl: e.target.value }))}
                />
              </label>
              <label>
                <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, marginBottom: 7 }}>Document Library</div>
                <input
                  className="w-full outline-none rounded-lg px-3 py-2.5"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13 }}
                  value={sharePointConnection.libraryName}
                  onChange={(e) => setSharePointConnection((prev) => ({ ...prev, libraryName: e.target.value }))}
                />
              </label>
              <label>
                <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, marginBottom: 7 }}>Folder Path</div>
                <input
                  className="w-full outline-none rounded-lg px-3 py-2.5"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13 }}
                  value={sharePointConnection.folderPath}
                  onChange={(e) => setSharePointConnection((prev) => ({ ...prev, folderPath: e.target.value }))}
                />
              </label>
              <label>
                <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, marginBottom: 7 }}>Polling Interval (seconds)</div>
                <input
                  type="number"
                  min={5}
                  className="w-full outline-none rounded-lg px-3 py-2.5"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13 }}
                  value={sharePointConnection.pollSeconds}
                  onChange={(e) => setSharePointConnection((prev) => ({ ...prev, pollSeconds: Number(e.target.value) || 8 }))}
                />
              </label>
              <div className="flex items-end gap-2">
                <button
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:opacity-90"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13 }}
                  onClick={handleSharePointConnect}
                >
                  <Link2 size={13} />
                  Connect & Monitor
                </button>
                <button
                  className="px-3.5 py-2.5 rounded-lg transition-all hover:opacity-80"
                  style={{ background: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: 13, border: "1px solid var(--border)" }}
                  onClick={() => setSharePointMonitoring((prev) => !prev)}
                  disabled={!sharePointConnected}
                >
                  {sharePointMonitoring ? "Pause" : "Resume"}
                </button>
                <button
                  className="px-3.5 py-2.5 rounded-lg transition-all hover:opacity-80"
                  style={{ background: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: 13, border: "1px solid var(--border)" }}
                  onClick={handleSharePointDisconnect}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: "rgba(59,123,255,0.07)", border: "1px solid rgba(59,123,255,0.2)" }}>
            <div className="flex items-start gap-3">
              <Activity size={14} style={{ color: sharePointError ? "#E84040" : "#3B7BFF", marginTop: 2, flexShrink: 0 }} />
              <div className="flex-1">
                <div style={{ color: sharePointError ? "#FF8A8A" : "#7EB8FF", fontSize: 12.5, lineHeight: 1.6 }}>{sharePointError || sharePointStatus}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, marginTop: 4 }}>
                  Uploaded PDF, DOCX, TXT, and EML files are converted into compliance review tasks immediately after detection.
                </div>
              </div>
              <button onClick={handleSharePointReset} className="px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.08)", color: "var(--muted-foreground)", fontSize: 11.5 }}>
                Reset history
              </button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2" style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500 }}>
                <FolderSync size={14} />
                Live upload activity
              </div>
              <span style={{ color: "var(--muted-foreground)", fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace" }}>{sharePointFiles.length} recent file{sharePointFiles.length === 1 ? "" : "s"}</span>
            </div>
            {sharePointFiles.length === 0 ? (
              <div className="py-10 text-center" style={{ color: "var(--muted-foreground)", fontSize: 13 }}>No SharePoint uploads detected yet.</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {sharePointFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${extColor(file.type)}18` }}>
                      <FileText size={14} style={{ color: extColor(file.type) }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ color: "var(--foreground)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                      <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                        {file.type.toUpperCase()} · {file.size} · {file.uploadedBy} · {file.uploadedAt}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace" }}>
                      REVIEW STARTED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl mb-6"
        style={{ background: "rgba(59,123,255,0.07)", border: "1px solid rgba(59,123,255,0.2)" }}
      >
        <AlertCircle size={14} style={{ color: "#3B7BFF", marginTop: 2, flexShrink: 0 }} />
        <p style={{ color: "#7EB8FF", fontSize: 12.5, lineHeight: 1.6 }}>
          The AI agent will automatically complete compliance verification — checking against internal policy rules, regulatory frameworks, and the active knowledge base. Results are typically ready within 30 minutes.
        </p>
      </div>

      {reviewing && (
        <div className="rounded-xl p-5 mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,123,255,0.12)", color: "var(--primary)" }}>
              <Bot size={17} />
            </div>
            <div>
              <div style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 500 }}>PAL demo agent is running</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 12 }}>A new task is being created and will open automatically.</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {agentSteps.map(({ label, icon: Icon }, index) => {
              const active = index <= agentStep;
              return (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: active ? "rgba(59,123,255,0.1)" : "var(--muted)", color: active ? "#7EB8FF" : "var(--muted-foreground)", fontSize: 11.5 }}
                >
                  <Icon size={13} />
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleStartReview}
          disabled={reviewing || (files.length === 0 && !emailText.trim())}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 14, fontWeight: 500 }}
        >
          {reviewing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Play size={14} />
              Start Review
            </>
          )}
        </button>
        <button
          onClick={() => { setFiles([]); setEmailText(""); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:opacity-80"
          style={{ background: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: 14, border: "1px solid var(--border)" }}
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>
    </div>
  );
}
