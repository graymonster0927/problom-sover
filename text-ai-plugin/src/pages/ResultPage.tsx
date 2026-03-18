import { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import ResultPanel from "../components/ResultPanel";
import { useAiStream } from "../hooks/useAiStream";
import { useSettings } from "../hooks/useSettings";
import { aiService } from "../services/aiService";
import { AppSettings } from "../store/appStore";

const PROVIDERS = [
  { id: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { id: "anthropic", label: "Anthropic", models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"] },
  { id: "ollama", label: "Ollama", models: ["llama3.2", "mistral", "codellama", "qwen2.5"] },
];


export default function ResultPage() {
  const { content, status, error, reset } = useAiStream();
  const { settings, save } = useSettings();
  const [inputText, setInputText] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showLlmDropdown, setShowLlmDropdown] = useState(false);
  const [customModelInput, setCustomModelInput] = useState<Record<string, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === "loading";

  // Current model label shown in header
  const currentModelLabel = settings ? `${settings.model}` : "AI 助手";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLlmDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // When result panel opens: reset, store text, auto-start AI
  useEffect(() => {
    const unlisten = listen<{ text: string }>("open_result_panel", (e) => {
      reset();
      const text = e.payload.text;
      setInputText(text);
      // Auto-trigger AI after brief delay to let reset propagate
      setTimeout(() => {
        aiService.solveWithAi(text).catch(console.error);
      }, 50);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [reset]);

  const handleClose = () => {
    invoke("hide_result_panel").catch(console.error);
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRegenerate = () => {
    if (!inputText || isStreaming) return;
    reset();
    setTimeout(() => {
      aiService.solveWithAi(inputText).catch(console.error);
    }, 50);
  };

  const handleSelectModel = async (providerId: string, model: string) => {
    setShowLlmDropdown(false);
    if (!settings) return;
    const updated: AppSettings = { ...settings, provider: providerId, model };
    await save(updated).catch(console.error);
  };

  const handleCustomModel = async (providerId: string) => {
    const model = (customModelInput[providerId] ?? "").trim();
    if (!model) return;
    await handleSelectModel(providerId, model);
    setCustomModelInput((prev) => ({ ...prev, [providerId]: "" }));
  };

  const handleOpenSettings = () => {
    invoke("show_settings_window").catch(console.error);
  };

  return (
    // Outer: transparent padding so rounded card doesn't hit window edge
    <div style={{
      width: "100%",
      height: "100%",
      background: "transparent",
      padding: "6px",
      boxSizing: "border-box",
    }}>
      <div style={{
        width: "100%",
        height: "100%",
        background: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, sans-serif",
        border: "1px solid rgba(0,0,0,0.07)",
      }}>
        {/* ── Header toolbar ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: "9px 10px",
          borderBottom: "1px solid #f0f0f0",
          gap: "6px",
          flexShrink: 0,
        }}>
          {/* App icon */}
          <div style={{
            width: 26,
            height: 26,
            borderRadius: "7px",
            background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L13.5 8.5L20 7L14.5 11.5L17 18L12 14L7 18L9.5 11.5L4 7L10.5 8.5L12 2Z" fill="white" />
            </svg>
          </div>

          {/* LLM selector — shows current model, click to open dropdown */}
          <div ref={dropdownRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <button
              onClick={() => setShowLlmDropdown((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "#f4f4f6",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "12px",
                color: "#333",
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                width: "100%",
                outline: "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {/* dot indicator */}
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#7c5cbf", flexShrink: 0, display: "inline-block",
              }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1, textAlign: "left" }}>
                {currentModelLabel}
              </span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="#444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Dropdown */}
            {showLlmDropdown && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                minWidth: "220px",
                background: "#ffffff",
                border: "1px solid #e8e8e8",
                borderRadius: "8px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                zIndex: 999,
                overflow: "hidden",
              }}>
                {PROVIDERS.map((provider) => (
                  <div key={provider.id}>
                    <div style={{
                      padding: "6px 12px 3px",
                      fontSize: "10px",
                      color: "#999",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}>
                      {provider.label}
                    </div>
                    {provider.models.map((model) => {
                      const isActive = settings?.provider === provider.id && settings?.model === model;
                      return (
                        <button
                          key={model}
                          onClick={() => handleSelectModel(provider.id, model)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "5px 12px",
                            fontSize: "12px",
                            color: isActive ? "#7c5cbf" : "#333",
                            background: isActive ? "#f5f0ff" : "transparent",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                            fontWeight: isActive ? 600 : 400,
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#f8f8fa";
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                          }}
                        >
                          {isActive
                            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M5 13l4 4L19 7" stroke="#7c5cbf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            : <span style={{ width: 10, flexShrink: 0 }} />
                          }
                          {model}
                        </button>
                      );
                    })}
                    {/* Custom model input for this provider */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px 6px" }}>
                      <input
                        type="text"
                        placeholder="自定义模型名…"
                        value={customModelInput[provider.id] ?? ""}
                        onChange={(e) => setCustomModelInput((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCustomModel(provider.id);
                          e.stopPropagation();
                        }}
                        style={{
                          flex: 1,
                          fontSize: "11px",
                          padding: "3px 7px",
                          border: "1px solid #e0e0e0",
                          borderRadius: "4px",
                          outline: "none",
                          color: "#333",
                          background: "#fafafa",
                        }}
                        onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#7c5cbf"; }}
                        onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#e0e0e0"; }}
                      />
                      <button
                        onClick={() => handleCustomModel(provider.id)}
                        style={{
                          fontSize: "11px",
                          padding: "3px 7px",
                          border: "1px solid #e0e0e0",
                          borderRadius: "4px",
                          background: "#f4f4f6",
                          color: "#555",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        确定
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toolbar: copy, retry, settings, divider, close */}
          <div style={{ display: "flex", alignItems: "center", gap: "1px", flexShrink: 0 }}>
            <IconBtn onClick={handleCopy} title={copied ? "已复制" : "复制结果"} disabled={!content}>
              {copied
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="#888" strokeWidth="1.8" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#888" strokeWidth="1.8" /></svg>
              }
            </IconBtn>
            <IconBtn onClick={handleRegenerate} title="重新生成" disabled={isStreaming || !inputText}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                style={isStreaming ? { animation: "spin 1s linear infinite" } : {}}>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <path d="M4 12a8 8 0 018-8 8 8 0 016.93 4M20 12a8 8 0 01-8 8 8 8 0 01-6.93-4"
                  stroke="#888" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M19 4v4h-4" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconBtn>
            <IconBtn onClick={handleOpenSettings} title="配置 LLM">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="#888" strokeWidth="1.8" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke="#888" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </IconBtn>
            <div style={{ width: "1px", height: "13px", background: "#e8e8e8", margin: "0 2px" }} />
            <IconBtn onClick={handleClose} title="关闭" danger>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </IconBtn>
          </div>
        </div>

        {/* ── Selected text preview ── */}
        {inputText && (
          <div style={{
            padding: "10px 14px 8px",
            borderBottom: "1px solid #f4f4f4",
            flexShrink: 0,
          }}>
            <p style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#1a1a1a",
              lineHeight: 1.55,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}>
              {inputText}
            </p>
          </div>
        )}

        {/* ── AI Result Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          {status === "idle" && !content && !inputText && (
            <div style={{
              display: "flex", flexDirection: "column" as const,
              alignItems: "center", justifyContent: "center",
              height: "100%", gap: "10px", color: "#aaa",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "#f4f4f6", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L13.5 8.5L20 7L14.5 11.5L17 18L12 14L7 18L9.5 11.5L4 7L10.5 8.5L12 2Z" fill="#ccc" />
                </svg>
              </div>
              <p style={{ fontSize: "12px" }}>选中文字后点击悬浮按钮</p>
            </div>
          )}

          {/* Loading skeleton while waiting for first chunk */}
          {status === "loading" && !content && (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
              {[80, 60, 90, 50].map((w, i) => (
                <div key={i} style={{
                  height: "12px", borderRadius: "4px",
                  width: `${w}%`,
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s infinite",
                }} />
              ))}
              <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
            </div>
          )}

          {error && (
            <div style={{
              padding: "10px 12px", borderRadius: "8px",
              background: "#fff5f5", border: "1px solid #fecaca",
              color: "#dc2626", fontSize: "12px", marginBottom: "10px",
            }}>
              {error}
            </div>
          )}

          {content && (
            <div style={{ fontSize: "13px", color: "#222", lineHeight: 1.65 }}>
              <ResultPanel content={content} isStreaming={isStreaming} />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 12px", borderTop: "1px solid #f0f0f0", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <IconBtn onClick={handleCopy} title={copied ? "已复制" : "复制"} small disabled={!content}>
              {copied
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="#aaa" strokeWidth="1.8" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#aaa" strokeWidth="1.8" /></svg>
              }
            </IconBtn>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "#bbb" }}>
              {isStreaming ? "生成中…" : status === "done" ? "完成" : ""}
            </span>
            <IconBtn onClick={() => {}} title="有帮助" small>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" stroke="#aaa" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke="#aaa" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </IconBtn>
            <IconBtn onClick={() => {}} title="没帮助" small>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" stroke="#aaa" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" stroke="#aaa" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children, onClick, title, disabled, danger, small,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  danger?: boolean;
  small?: boolean;
}) {
  const size = small ? "24px" : "28px";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: size, height: size,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "6px", border: "none",
        background: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        transition: "background 0.12s ease",
        outline: "none",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background = danger ? "#fff0f0" : "#f0f0f4";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}
