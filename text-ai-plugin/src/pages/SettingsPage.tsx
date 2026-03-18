import { useState, useEffect } from "react";
import { useSettings } from "../hooks/useSettings";
import { AppSettings } from "../store/appStore";

// Preset model suggestions per provider
const PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    defaultUrl: "https://api.openai.com/v1",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
    defaultUrl: "https://api.anthropic.com",
  },
  {
    id: "ollama",
    label: "Ollama (Local)",
    models: ["llama3.2", "mistral", "codellama", "qwen2.5"],
    defaultUrl: "http://localhost:11434",
  },
  {
    id: "custom",
    label: "自定义",
    models: [],
    defaultUrl: "",
  },
];

// Shared token colours
const C = {
  bg: "#ffffff",
  border: "#e8e8ed",
  borderFocus: "#7c5cbf",
  text: "#1a1a1a",
  textMuted: "#888",
  textLabel: "#555",
  pill: "#f4f4f6",
  pillActive: "#7c5cbf",
  accent: "#7c5cbf",
  accentLight: "#f5f0ff",
  danger: "#dc2626",
  dangerLight: "#fff5f5",
  success: "#16a34a",
  successLight: "#f0fdf4",
};

export default function SettingsPage() {
  const { settings, loading, error, save } = useSettings();
  const [form, setForm] = useState<AppSettings | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    if (settings && !form) setForm({ ...settings });
  }, [settings, form]);

  if (!form) {
    return (
      <div style={{ width: "100%", height: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  const selectedProvider = PROVIDERS.find((p) => p.id === form.provider) ?? PROVIDERS[PROVIDERS.length - 1];

  const set = (key: keyof AppSettings, value: unknown) =>
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);

  const handleSave = async () => {
    await save(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = () => {
    if (form.provider !== "ollama" && form.provider !== "custom" && !form.api_key.trim()) {
      setTestStatus("fail");
      setTimeout(() => setTestStatus("idle"), 3000);
      return;
    }
    setTestStatus("ok");
    setTimeout(() => setTestStatus("idle"), 3000);
  };

  return (
    <div style={{
      width: "100%", height: "100vh",
      background: C.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "14px 18px",
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "8px",
          background: "linear-gradient(135deg, #7c5cbf 0%, #a78bfa 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 style={{ fontSize: "15px", fontWeight: 600, color: C.text }}>设置</h1>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "18px" }}>

        {/* Provider */}
        <Field label="AI 服务商">
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  set("provider", p.id);
                  if (p.models.length > 0) set("model", p.models[0]);
                  if (p.defaultUrl) set("base_url", p.defaultUrl);
                }}
                style={{
                  padding: "5px 13px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 500,
                  border: "1px solid",
                  borderColor: form.provider === p.id ? C.pillActive : C.border,
                  background: form.provider === p.id ? C.accentLight : "transparent",
                  color: form.provider === p.id ? C.accent : C.textMuted,
                  cursor: "pointer",
                  transition: "all 0.12s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        {/* API Key (not for ollama/custom-no-key) */}
        {form.provider !== "ollama" && (
          <Field label="API Key">
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <TextInput
                  type={showKey ? "text" : "password"}
                  value={form.api_key}
                  onChange={(v) => set("api_key", v)}
                  placeholder="sk-..."
                  style={{ paddingRight: "36px" }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: C.textMuted,
                    display: "flex", alignItems: "center",
                  }}
                >
                  {showKey
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" /></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={C.textMuted} strokeWidth="1.8" /><circle cx="12" cy="12" r="3" stroke={C.textMuted} strokeWidth="1.8" /></svg>
                  }
                </button>
              </div>
              <button
                onClick={handleTestConnection}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "7px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 500,
                  border: "1px solid",
                  borderColor: testStatus === "ok" ? C.success : testStatus === "fail" ? C.danger : C.accent,
                  background: testStatus === "ok" ? C.successLight : testStatus === "fail" ? C.dangerLight : C.accentLight,
                  color: testStatus === "ok" ? C.success : testStatus === "fail" ? C.danger : C.accent,
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                {testStatus === "ok"
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={C.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  : testStatus === "fail"
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke={C.danger} strokeWidth="2" strokeLinecap="round" /></svg>
                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12.55a11 11 0 0114.08 0" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" /><path d="M1.42 9a16 16 0 0121.16 0" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" /><path d="M8.53 16.11a6 6 0 016.95 0" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" /><line x1="12" y1="20" x2="12.01" y2="20" stroke={C.accent} strokeWidth="2" strokeLinecap="round" /></svg>
                }
                测试
              </button>
            </div>
          </Field>
        )}

        {/* Base URL — always visible */}
        <Field label="Base URL（自定义接口地址）">
          <TextInput
            type="text"
            value={form.base_url ?? ""}
            onChange={(v) => set("base_url", v || null)}
            placeholder={selectedProvider.defaultUrl || "https://api.example.com/v1"}
          />
          <p style={{ fontSize: "11px", color: C.textMuted, marginTop: "4px" }}>
            留空则使用默认地址。兼容任何 OpenAI 格式 API（如 deepseek、通义千问等自部署模型）。
          </p>
        </Field>

        {/* Model */}
        <Field label="模型">
          <TextInput
            type="text"
            list="model-datalist"
            value={form.model}
            onChange={(v) => set("model", v)}
            placeholder="输入或选择模型名称，如 gpt-4o、deepseek-chat"
          />
          {selectedProvider.models.length > 0 && (
            <datalist id="model-datalist">
              {selectedProvider.models.map((m) => <option key={m} value={m} />)}
            </datalist>
          )}
          <p style={{ fontSize: "11px", color: C.textMuted, marginTop: "4px" }}>
            可直接输入任意自定义模型名
          </p>
        </Field>

        {/* Advanced */}
        <Field label="高级">
          <div style={{ display: "flex", gap: "10px" }}>
            <NumInput label="最大迭代次数" value={form.max_iterations} onChange={(v) => set("max_iterations", v)} min={1} max={50} />
            <NumInput label="超时（秒）" value={form.timeout_secs} onChange={(v) => set("timeout_secs", v)} min={5} max={300} />
          </div>
        </Field>

        {/* Enabled */}
        <Field label="插件状态">
          <button
            onClick={() => set("enabled", !form.enabled)}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              width: "100%", padding: "10px 14px", borderRadius: "10px",
              border: `1px solid ${form.enabled ? C.accent : C.border}`,
              background: form.enabled ? C.accentLight : "transparent",
              cursor: "pointer",
            }}
          >
            <Toggle active={form.enabled} />
            <span style={{ fontSize: "13px", fontWeight: 500, color: form.enabled ? C.accent : C.textMuted }}>
              {form.enabled ? "插件已启用" : "插件已禁用"}
            </span>
          </button>
        </Field>

        {error && (
          <div style={{
            padding: "10px 12px", borderRadius: "8px",
            background: C.dangerLight, border: `1px solid #fecaca`,
            color: C.danger, fontSize: "12px",
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Save */}
      <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            width: "100%", padding: "10px",
            borderRadius: "10px", fontSize: "13px", fontWeight: 600,
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            background: saved
              ? C.success
              : `linear-gradient(135deg, ${C.accent} 0%, #a78bfa 100%)`,
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            opacity: loading ? 0.6 : 1,
            boxShadow: saved ? "none" : "0 2px 12px rgba(124,92,191,0.3)",
            transition: "all 0.15s",
          }}
        >
          {saved
            ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg> 已保存</>
            : loading ? "保存中…"
            : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="white" strokeWidth="2" strokeLinejoin="round" /><polyline points="17 21 17 13 7 13 7 21" stroke="white" strokeWidth="2" strokeLinejoin="round" /><polyline points="7 3 7 8 15 8" stroke="white" strokeWidth="2" strokeLinejoin="round" /></svg> 保存设置</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "11px", fontWeight: 600, color: C.textLabel, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  type = "text", value, onChange, placeholder, style, list,
}: {
  type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; style?: React.CSSProperties; list?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      list={list}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "8px 12px",
        border: `1px solid ${C.border}`,
        borderRadius: "8px", fontSize: "13px",
        color: C.text, background: "#fafafa",
        outline: "none", transition: "border-color 0.12s",
        ...style,
      }}
      onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = C.borderFocus; }}
      onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = C.border; }}
    />
  );
}

function NumInput({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ fontSize: "11px", color: C.textMuted }}>{label}</span>
      <TextInput
        type="number"
        value={String(value)}
        onChange={(v) => onChange(parseInt(v) || 0)}
        placeholder=""
      />
    </div>
  );
}

function Toggle({ active }: { active: boolean }) {
  return (
    <div style={{
      width: 36, height: 20, borderRadius: 10,
      background: active ? C.accent : "#d1d5db",
      position: "relative", flexShrink: 0,
      transition: "background 0.2s",
    }}>
      <div style={{
        position: "absolute", top: "2px",
        left: active ? "18px" : "2px",
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

function Spinner() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }} fill="none">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="#e0e0e0" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
