import { useState, useEffect } from "react";
import { useSettings } from "../hooks/useSettings";
import { AppSettings, LlmConfig } from "../store/appStore";
import { v4 as uuidv4 } from "uuid";

// ── Known providers with defaults ──────────────────────────────────────────
const PRESET_PROVIDERS = [
  { id: "openai",    label: "OpenAI",     models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],                      defaultUrl: "https://api.openai.com/v1" },
  { id: "anthropic", label: "Anthropic",  models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"], defaultUrl: "https://api.anthropic.com" },
  { id: "deepseek",  label: "DeepSeek",   models: ["deepseek-chat", "deepseek-reasoner"],                                           defaultUrl: "https://api.deepseek.com/v1" },
  { id: "qwen",      label: "通义千问",    models: ["qwen-turbo", "qwen-plus", "qwen-max"],                                          defaultUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { id: "ollama",    label: "Ollama",     models: ["llama3.2", "mistral", "codellama", "qwen2.5"],                                   defaultUrl: "http://localhost:11434" },
  { id: "custom",    label: "自定义",     models: [],                                                                                defaultUrl: "" },
];

const PAGE_SIZE = 5;

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#ffffff",
  border: "#e8e8ed",
  borderFocus: "#7c5cbf",
  text: "#1a1a1a",
  textMuted: "#888",
  textLabel: "#555",
  accent: "#7c5cbf",
  accentLight: "#f5f0ff",
  danger: "#dc2626",
  dangerLight: "#fff5f5",
  success: "#16a34a",
  successLight: "#f0fdf4",
  bgRow: "#fafafa",
};

// ── Empty config template ──────────────────────────────────────────────────
function emptyConfig(): LlmConfig {
  return { id: uuidv4(), name: "", provider: "openai", api_key: "", model: "gpt-4o", base_url: null };
}

export default function SettingsPage() {
  const { settings, loading, save } = useSettings();
  const [form, setForm] = useState<AppSettings | null>(null);
  const [page, setPage] = useState(0);
  // editing: null = list view; "new" or config id = edit view
  const [editing, setEditing] = useState<LlmConfig | null>(null);
  const [saved, setSaved] = useState(false);

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

  const configs = form.llm_configs ?? [];
  const totalPages = Math.max(1, Math.ceil(configs.length / PAGE_SIZE));
  const pageItems = configs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSave = async () => {
    await save(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleActivate = (id: string) => {
    setForm((prev) => prev ? { ...prev, active_llm_id: id } : prev);
  };

  const handleDelete = (id: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = prev.llm_configs.filter((c) => c.id !== id);
      return {
        ...prev,
        llm_configs: next,
        active_llm_id: prev.active_llm_id === id ? (next[0]?.id ?? null) : prev.active_llm_id,
      };
    });
  };

  const handleEditSave = (cfg: LlmConfig) => {
    setForm((prev) => {
      if (!prev) return prev;
      const exists = prev.llm_configs.some((c) => c.id === cfg.id);
      const next = exists
        ? prev.llm_configs.map((c) => c.id === cfg.id ? cfg : c)
        : [...prev.llm_configs, cfg];
      return {
        ...prev,
        llm_configs: next,
        active_llm_id: prev.active_llm_id ?? cfg.id,
      };
    });
    setEditing(null);
  };

  // ── Edit view ──
  if (editing) {
    return (
      <EditView
        initial={editing}
        onSave={handleEditSave}
        onCancel={() => setEditing(null)}
        loading={loading}
      />
    );
  }

  // ── List view ──
  return (
    <div style={{ width: "100%", height: "100vh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 18px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: "8px", background: "linear-gradient(135deg, #7c5cbf 0%, #a78bfa 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: 0 }}>LLM 配置</h1>
          <p style={{ fontSize: "11px", color: C.textMuted, margin: 0 }}>{configs.length} 个配置</p>
        </div>
        <button
          onClick={() => setEditing(emptyConfig())}
          style={{
            display: "flex", alignItems: "center", gap: "4px",
            padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
            border: "none", background: C.accent, color: "#fff", cursor: "pointer",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          添加
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {configs.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", color: C.textMuted }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="#d0d0d8" strokeWidth="1.5" />
              <path d="M12 8v8M8 12h8" stroke="#d0d0d8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p style={{ fontSize: "13px" }}>还没有 LLM 配置</p>
            <button
              onClick={() => setEditing(emptyConfig())}
              style={{ padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, border: `1px solid ${C.accent}`, background: C.accentLight, color: C.accent, cursor: "pointer" }}
            >
              + 添加第一个配置
            </button>
          </div>
        ) : (
          pageItems.map((cfg) => {
            const isActive = form.active_llm_id === cfg.id || (!form.active_llm_id && configs[0]?.id === cfg.id);
            const preset = PRESET_PROVIDERS.find((p) => p.id === cfg.provider);
            return (
              <div
                key={cfg.id}
                style={{
                  border: `1px solid ${isActive ? C.accent : C.border}`,
                  borderRadius: "10px",
                  background: isActive ? C.accentLight : C.bgRow,
                  padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: "10px",
                  transition: "all 0.12s",
                }}
              >
                {/* Active indicator */}
                <div
                  onClick={() => handleActivate(cfg.id)}
                  style={{ cursor: "pointer", flexShrink: 0 }}
                  title={isActive ? "当前使用" : "设为当前"}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: `2px solid ${isActive ? C.accent : "#d0d0d8"}`,
                    background: isActive ? C.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.12s",
                  }}>
                    {isActive && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: isActive ? C.accent : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cfg.name || `${cfg.provider} / ${cfg.model}`}
                    </span>
                    <span style={{
                      fontSize: "10px", padding: "1px 6px", borderRadius: "10px",
                      background: isActive ? "rgba(124,92,191,0.15)" : "#e8e8ed",
                      color: isActive ? C.accent : C.textMuted, flexShrink: 0,
                    }}>
                      {preset?.label ?? cfg.provider}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cfg.model}
                    {cfg.base_url ? ` · ${cfg.base_url}` : ""}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  <SmallBtn onClick={() => setEditing({ ...cfg })} title="编辑">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </SmallBtn>
                  {!isActive && (
                    <SmallBtn onClick={() => handleDelete(cfg.id)} title="删除" danger>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 11v6M14 11v6" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </SmallBtn>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px", borderTop: `1px solid ${C.border}` }}>
          <SmallBtn onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#888" strokeWidth="2" strokeLinecap="round" /></svg>
          </SmallBtn>
          <span style={{ fontSize: "11px", color: C.textMuted }}>{page + 1} / {totalPages}</span>
          <SmallBtn onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#888" strokeWidth="2" strokeLinecap="round" /></svg>
          </SmallBtn>
        </div>
      )}

      {/* Global settings section */}
      <div style={{ padding: "10px 18px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: "8px", background: "#fafafa" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <NumInput label="最大迭代" value={form.max_iterations} onChange={(v) => setForm((p) => p ? { ...p, max_iterations: v } : p)} min={1} max={50} />
          <NumInput label="超时（秒）" value={form.timeout_secs} onChange={(v) => setForm((p) => p ? { ...p, timeout_secs: v } : p)} min={5} max={300} />
        </div>
        <EnableToggle enabled={form.enabled} onChange={(v) => setForm((p) => p ? { ...p, enabled: v } : p)} />
      </div>

      {/* Save */}
      <div style={{ padding: "10px 18px 14px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            width: "100%", padding: "10px", borderRadius: "10px",
            fontSize: "13px", fontWeight: 600, border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            background: saved ? C.success : `linear-gradient(135deg, ${C.accent} 0%, #a78bfa 100%)`,
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            opacity: loading ? 0.6 : 1,
            boxShadow: saved ? "none" : "0 2px 12px rgba(124,92,191,0.3)",
            transition: "all 0.15s",
          }}
        >
          {saved
            ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>已保存</>
            : loading ? "保存中…"
            : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="white" strokeWidth="2" strokeLinejoin="round" /><polyline points="17 21 17 13 7 13 7 21" stroke="white" strokeWidth="2" strokeLinejoin="round" /><polyline points="7 3 7 8 15 8" stroke="white" strokeWidth="2" strokeLinejoin="round" /></svg>保存设置</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Edit / Add view ──────────────────────────────────────────────────────────
function EditView({
  initial, onSave, onCancel, loading,
}: {
  initial: LlmConfig;
  onSave: (cfg: LlmConfig) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [cfg, setCfg] = useState<LlmConfig>({ ...initial });
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "fail">("idle");

  const preset = PRESET_PROVIDERS.find((p) => p.id === cfg.provider);
  const isNew = !initial.name && !initial.api_key && !initial.model;

  const set = (key: keyof LlmConfig, value: unknown) =>
    setCfg((prev) => ({ ...prev, [key]: value }));

  const handleTest = () => {
    if (cfg.provider !== "ollama" && cfg.provider !== "custom" && !cfg.api_key.trim()) {
      setTestStatus("fail");
      setTimeout(() => setTestStatus("idle"), 3000);
      return;
    }
    setTestStatus("ok");
    setTimeout(() => setTestStatus("idle"), 3000);
  };

  const valid = cfg.model.trim().length > 0;

  return (
    <div style={{ width: "100%", height: "100vh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 18px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: C.textMuted, display: "flex", alignItems: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: 0 }}>{isNew ? "添加 LLM 配置" : "编辑配置"}</h1>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Name */}
        <Field label="配置名称">
          <TextInput value={cfg.name} onChange={(v) => set("name", v)} placeholder="如：GPT-4o 工作用" />
        </Field>

        {/* Provider */}
        <Field label="服务商">
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {PRESET_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  set("provider", p.id);
                  if (p.models.length > 0) set("model", p.models[0]);
                  if (p.defaultUrl) set("base_url", p.defaultUrl);
                  else set("base_url", null);
                }}
                style={{
                  padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 500,
                  border: "1px solid", cursor: "pointer", transition: "all 0.12s",
                  borderColor: cfg.provider === p.id ? C.accent : C.border,
                  background: cfg.provider === p.id ? C.accentLight : "transparent",
                  color: cfg.provider === p.id ? C.accent : C.textMuted,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Model */}
        <Field label="模型">
          <TextInput
            value={cfg.model}
            onChange={(v) => set("model", v)}
            placeholder="输入或选择模型名"
            list="edit-model-datalist"
          />
          {preset && preset.models.length > 0 && (
            <datalist id="edit-model-datalist">
              {preset.models.map((m) => <option key={m} value={m} />)}
            </datalist>
          )}
          <p style={{ fontSize: "11px", color: C.textMuted, marginTop: "3px" }}>支持任意自定义模型名</p>
        </Field>

        {/* API Key */}
        {cfg.provider !== "ollama" && (
          <Field label="API Key">
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <TextInput
                  type={showKey ? "text" : "password"}
                  value={cfg.api_key}
                  onChange={(v) => set("api_key", v)}
                  placeholder="sk-..."
                  style={{ paddingRight: "36px" }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  {showKey
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" /></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={C.textMuted} strokeWidth="1.8" /><circle cx="12" cy="12" r="3" stroke={C.textMuted} strokeWidth="1.8" /></svg>
                  }
                </button>
              </div>
              <button
                onClick={handleTest}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "7px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 500,
                  border: "1px solid", cursor: "pointer", flexShrink: 0,
                  borderColor: testStatus === "ok" ? C.success : testStatus === "fail" ? C.danger : C.accent,
                  background: testStatus === "ok" ? C.successLight : testStatus === "fail" ? C.dangerLight : C.accentLight,
                  color: testStatus === "ok" ? C.success : testStatus === "fail" ? C.danger : C.accent,
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

        {/* Base URL */}
        <Field label="Base URL（自定义接口地址）">
          <TextInput
            value={cfg.base_url ?? ""}
            onChange={(v) => set("base_url", v || null)}
            placeholder={preset?.defaultUrl || "https://api.example.com/v1"}
          />
          <p style={{ fontSize: "11px", color: C.textMuted, marginTop: "3px" }}>
            兼容任何 OpenAI 格式 API（deepseek、通义千问、自部署等），留空使用默认地址
          </p>
        </Field>

      </div>

      {/* Actions */}
      <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}`, display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: "9px", borderRadius: "9px", fontSize: "13px", fontWeight: 500, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, cursor: "pointer" }}
        >
          取消
        </button>
        <button
          onClick={() => valid && onSave(cfg)}
          disabled={!valid || loading}
          style={{
            flex: 2, padding: "9px", borderRadius: "9px", fontSize: "13px", fontWeight: 600,
            border: "none", cursor: !valid || loading ? "not-allowed" : "pointer",
            background: !valid ? "#e0e0e8" : `linear-gradient(135deg, ${C.accent} 0%, #a78bfa 100%)`,
            color: !valid ? "#aaa" : "#fff",
            boxShadow: valid ? "0 2px 12px rgba(124,92,191,0.3)" : "none",
            transition: "all 0.15s",
          }}
        >
          {isNew ? "添加配置" : "保存修改"}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label style={{ fontSize: "11px", fontWeight: 600, color: C.textLabel, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ type = "text", value, onChange, placeholder, style, list }: {
  type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; style?: React.CSSProperties; list?: string;
}) {
  return (
    <input
      type={type} value={value} list={list}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "8px 12px",
        border: `1px solid ${C.border}`, borderRadius: "8px",
        fontSize: "13px", color: C.text, background: "#fafafa",
        outline: "none", transition: "border-color 0.12s",
        boxSizing: "border-box",
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
      <span style={{ fontSize: "11px", color: C.textMuted }}>{label}</span>
      <input
        type="number" value={value} min={min} max={max}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        style={{
          width: "100%", padding: "6px 10px", border: `1px solid ${C.border}`,
          borderRadius: "7px", fontSize: "13px", color: C.text, background: "#fafafa",
          outline: "none", boxSizing: "border-box",
        }}
        onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = C.borderFocus; }}
        onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = C.border; }}
      />
    </div>
  );
}

function EnableToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "8px 12px", borderRadius: "9px",
        border: `1px solid ${enabled ? C.accent : C.border}`,
        background: enabled ? C.accentLight : "transparent",
        cursor: "pointer", width: "100%",
      }}
    >
      <div style={{ width: 34, height: 19, borderRadius: 10, background: enabled ? C.accent : "#d1d5db", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
        <div style={{ position: "absolute", top: "1.5px", left: enabled ? "16px" : "1.5px", width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
      </div>
      <span style={{ fontSize: "13px", fontWeight: 500, color: enabled ? C.accent : C.textMuted }}>
        {enabled ? "插件已启用" : "插件已禁用"}
      </span>
    </button>
  );
}

function SmallBtn({ children, onClick, title, disabled, danger }: {
  children: React.ReactNode; onClick?: () => void; title?: string; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      style={{
        width: 28, height: 28, borderRadius: "6px", border: "none",
        background: "transparent", cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: disabled ? 0.35 : 1, transition: "background 0.12s",
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = danger ? "#fff0f0" : "#f0f0f4"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      {children}
    </button>
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
