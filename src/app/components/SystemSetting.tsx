import { useState } from "react";
import { Settings, Shield, Bell, Cpu, Database, Key, Save, ChevronRight } from "lucide-react";
import { getLLMConfig, getReviewEngineConfig, maskApiKey, saveLLMConfig, saveReviewEngineConfig } from "../lib/ragClient";

type SettingSection = "general" | "review" | "notification" | "model" | "security" | "api";

const sections: { id: SettingSection; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "general", label: "General", icon: Settings, desc: "Language, timezone, display preferences" },
  { id: "review", label: "Review Engine", icon: Shield, desc: "Compliance thresholds and rule weights" },
  { id: "notification", label: "Notifications", icon: Bell, desc: "Alert delivery and escalation settings" },
  { id: "model", label: "AI Model", icon: Cpu, desc: "Model selection and inference settings" },
  { id: "security", label: "Security", icon: Database, desc: "Access control and audit logs" },
  { id: "api", label: "API Keys", icon: Key, desc: "External integrations and credentials" },
];

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="relative w-10 h-5.5 rounded-full transition-all"
      style={{
        background: checked ? "var(--primary)" : "var(--switch-background)",
        width: 38,
        height: 22,
      }}
      onClick={() => onChange(!checked)}
    >
      <div
        className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all"
        style={{
          width: 18,
          height: 18,
          top: 2,
          left: checked ? 18 : 2,
          transition: "left 0.15s ease",
        }}
      />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <div>
        <div style={{ color: "var(--foreground)", fontSize: 13.5, fontWeight: 400 }}>{label}</div>
        {desc && <div style={{ color: "var(--muted-foreground)", fontSize: 12, marginTop: 2 }}>{desc}</div>}
      </div>
      <div className="shrink-0 ml-6">{children}</div>
    </div>
  );
}

function SelectInput({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select
      className="outline-none rounded-lg px-3 py-1.5"
      style={{
        background: "var(--secondary)",
        color: "var(--foreground)",
        border: "1px solid var(--border)",
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function TextInput({ value, onChange, type = "text" }: { value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      className="outline-none rounded-lg px-3 py-1.5"
      style={{
        background: "var(--secondary)",
        color: "var(--foreground)",
        border: "1px solid var(--border)",
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        width: 200,
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function RangeInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: "var(--primary)", width: 120 }}
      />
      <span style={{ color: "var(--foreground)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", minWidth: 36 }}>{value}%</span>
    </div>
  );
}

export function SystemSetting() {
  const initialLLMConfig = getLLMConfig();
  const initialReviewConfig = getReviewEngineConfig();
  const [activeSection, setActiveSection] = useState<SettingSection>("general");
  const [saved, setSaved] = useState(false);

  // General settings
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("UTC+8 (Asia/Shanghai)");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");

  // Review settings
  const [highConfidenceThreshold, setHighConfidenceThreshold] = useState(Math.round(initialReviewConfig.highConfidence * 100));
  const [mediumConfidenceThreshold, setMediumConfidenceThreshold] = useState(Math.round(initialReviewConfig.mediumConfidence * 100));
  const [ruleEngineEnabled, setRuleEngineEnabled] = useState(initialReviewConfig.ruleEngineEnabled);
  const [anomalyEngineEnabled, setAnomalyEngineEnabled] = useState(initialReviewConfig.anomalyEngineEnabled);
  const [badcaseCollectionEnabled, setBadcaseCollectionEnabled] = useState(initialReviewConfig.badcaseCollectionEnabled);
  const [autoExportReport, setAutoExportReport] = useState(true);
  const [requireManualReview, setRequireManualReview] = useState(false);

  // Notification settings
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [emailAddress, setEmailAddress] = useState("legal@yourcompany.com");

  // Model settings
  const [model, setModel] = useState(initialLLMConfig.model);
  const [temperature, setTemperature] = useState(20);
  const [maxTokens, setMaxTokens] = useState("4096");

  // Security
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("8 hours");
  const [auditLog, setAuditLog] = useState(true);

  // API
  const [baseUrl, setBaseUrl] = useState(initialLLMConfig.baseUrl);
  const [apiKey, setApiKey] = useState(initialLLMConfig.apiKey);

  const handleSave = () => {
    const normalizedHighConfidence = Math.max(0.6, highConfidenceThreshold / 100);
    const normalizedMediumConfidence = Math.min(normalizedHighConfidence - 0.01, Math.max(0.3, mediumConfidenceThreshold / 100));
    saveLLMConfig({ baseUrl, apiKey, model });
    saveReviewEngineConfig({
      highConfidence: normalizedHighConfidence,
      mediumConfidence: normalizedMediumConfidence,
      ruleEngineEnabled,
      anomalyEngineEnabled,
      badcaseCollectionEnabled,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <>
            <SettingRow label="Interface Language" desc="Display language for all UI elements">
              <SelectInput value={language} options={["English", "中文", "日本語", "한국어"]} onChange={setLanguage} />
            </SettingRow>
            <SettingRow label="Timezone" desc="Used for timestamps in reports and logs">
              <SelectInput value={timezone} options={["UTC+8 (Asia/Shanghai)", "UTC+0 (London)", "UTC-5 (New York)", "UTC+9 (Tokyo)"]} onChange={setTimezone} />
            </SettingRow>
            <SettingRow label="Date Format">
              <SelectInput value={dateFormat} options={["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"]} onChange={setDateFormat} />
            </SettingRow>
          </>
        );
      case "review":
        return (
          <>
            <SettingRow label="Rule Matching Engine" desc="Deterministic checks for prohibited words, required labels, structured rules, and regulation clauses">
              <ToggleSwitch checked={ruleEngineEnabled} onChange={setRuleEngineEnabled} />
            </SettingRow>
            <SettingRow label="Anomaly Alert Engine" desc="Flags incomplete evidence, ambiguous claims, no-RAG-evidence cases, and low-confidence results">
              <ToggleSwitch checked={anomalyEngineEnabled} onChange={setAnomalyEngineEnabled} />
            </SettingRow>
            <SettingRow label="Badcase Collection" desc="Capture false positives, false negatives, ambiguous cases, and low-quality explanations for improvement">
              <ToggleSwitch checked={badcaseCollectionEnabled} onChange={setBadcaseCollectionEnabled} />
            </SettingRow>
            <SettingRow label="High Confidence Threshold" desc={`confidence ≥ ${highConfidenceThreshold}% → evidence can be displayed directly`}>
              <RangeInput value={highConfidenceThreshold} onChange={setHighConfidenceThreshold} min={60} max={99} />
            </SettingRow>
            <SettingRow label="Medium Confidence Threshold" desc={`${mediumConfidenceThreshold}% ≤ confidence < ${highConfidenceThreshold}% → reviewer confirmation required`}>
              <RangeInput value={mediumConfidenceThreshold} onChange={setMediumConfidenceThreshold} min={30} max={85} />
            </SettingRow>
            <SettingRow label="Auto Export Report" desc="Automatically generate PDF report when review completes">
              <ToggleSwitch checked={autoExportReport} onChange={setAutoExportReport} />
            </SettingRow>
            <SettingRow label="Require Manual Review" desc="All Risk Detected results must be confirmed by a human reviewer">
              <ToggleSwitch checked={requireManualReview} onChange={setRequireManualReview} />
            </SettingRow>
          </>
        );
      case "notification":
        return (
          <>
            <SettingRow label="Email Alerts" desc="Send review result notifications by email">
              <ToggleSwitch checked={emailAlerts} onChange={setEmailAlerts} />
            </SettingRow>
            <SettingRow label="Alert Email Address">
              <TextInput value={emailAddress} onChange={setEmailAddress} type="email" />
            </SettingRow>
            <SettingRow label="Slack Notifications" desc="Post alerts to a configured Slack channel">
              <ToggleSwitch checked={slackAlerts} onChange={setSlackAlerts} />
            </SettingRow>
            <SettingRow label="High Risk Alerts Only" desc="Suppress Normal Risk notifications to reduce noise">
              <ToggleSwitch checked={highRiskOnly} onChange={setHighRiskOnly} />
            </SettingRow>
          </>
        );
      case "model":
        return (
          <>
            <SettingRow label="Review Model" desc="AI model used for compliance analysis">
              <SelectInput
                value={model}
                options={["gpt-4o-mini", "gpt-4o", "deepseek-chat", "qwen-plus", "claude-sonnet-4-6"]}
                onChange={setModel}
              />
            </SettingRow>
            <SettingRow label="Temperature" desc={`Controls response creativity. Lower = more deterministic (current: ${temperature / 100})`}>
              <RangeInput value={temperature} onChange={setTemperature} min={0} max={100} />
            </SettingRow>
            <SettingRow label="Max Output Tokens" desc="Maximum tokens per compliance analysis response">
              <SelectInput value={maxTokens} options={["2048", "4096", "8192", "16384"]} onChange={setMaxTokens} />
            </SettingRow>
          </>
        );
      case "security":
        return (
          <>
            <SettingRow label="Multi-Factor Authentication" desc="Require MFA for all admin accounts">
              <ToggleSwitch checked={mfaEnabled} onChange={setMfaEnabled} />
            </SettingRow>
            <SettingRow label="Session Timeout">
              <SelectInput value={sessionTimeout} options={["1 hour", "4 hours", "8 hours", "24 hours"]} onChange={setSessionTimeout} />
            </SettingRow>
            <SettingRow label="Audit Logging" desc="Record all user actions for compliance and investigation">
              <ToggleSwitch checked={auditLog} onChange={setAuditLog} />
            </SettingRow>
          </>
        );
      case "api":
        return (
          <>
            <SettingRow label="LLM Base URL" desc="OpenAI-compatible endpoint used by the local RAG API">
              <TextInput value={baseUrl} onChange={setBaseUrl} type="text" />
            </SettingRow>
            <SettingRow label="LLM API Key" desc={`Saved in this browser for demo use. Current: ${maskApiKey(apiKey)}`}>
              <TextInput value={apiKey} onChange={setApiKey} type="password" />
            </SettingRow>
            <SettingRow label="LLM Model" desc="Same model used by the RAG compliance review task">
              <TextInput value={model} onChange={setModel} type="text" />
            </SettingRow>
            <SettingRow label="API Request Timeout" desc="Maximum wait time per inference request">
              <SelectInput value="30s" options={["10s", "30s", "60s", "120s"]} onChange={() => {}} />
            </SettingRow>
            <SettingRow label="Fallback Mode" desc="If no API key is saved, RAG uses local rule-based review">
              <span style={{ color: apiKey ? "#10B981" : "#F59E0B", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                {apiKey ? "LLM Enabled" : "Local Fallback"}
              </span>
            </SettingRow>
          </>
        );
    }
  };

  return (
    <div className="px-8 py-7 max-w-5xl mx-auto">
      <div className="mb-7">
        <div style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>CONFIGURATION</div>
        <h1 style={{ color: "var(--foreground)", fontSize: 22, fontWeight: 600 }}>System Settings</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>Configure the PAL agent behavior, notifications, and integrations.</p>
      </div>

      <div className="flex gap-5">
        {/* Sidebar nav */}
        <div className="w-52 shrink-0 flex flex-col gap-0.5">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left transition-all"
              style={{
                background: activeSection === id ? "var(--secondary)" : "transparent",
                color: activeSection === id ? "var(--foreground)" : "var(--muted-foreground)",
                border: `1px solid ${activeSection === id ? "var(--border)" : "transparent"}`,
              }}
            >
              <Icon size={14} style={{ color: activeSection === id ? "var(--primary)" : "var(--muted-foreground)", opacity: activeSection === id ? 1 : 0.7 }} />
              <span style={{ fontSize: 13, fontWeight: activeSection === id ? 500 : 400 }}>{label}</span>
              {activeSection === id && <ChevronRight size={12} className="ml-auto" style={{ color: "var(--muted-foreground)" }} />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl overflow-hidden mb-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              {(() => {
                const s = sections.find((s) => s.id === activeSection)!;
                const Icon = s.icon;
                return (
                  <>
                    <Icon size={15} style={{ color: "var(--primary)" }} />
                    <div>
                      <div style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 500 }}>{s.label}</div>
                      <div style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>{s.desc}</div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="px-6 py-2">
              {renderContent()}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all hover:opacity-90"
              style={{
                background: saved ? "#10B981" : "var(--primary)",
                color: "var(--primary-foreground)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Save size={14} />
              {saved ? "Saved!" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
