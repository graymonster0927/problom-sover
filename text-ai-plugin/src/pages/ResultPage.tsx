import { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import ResultPanel from "../components/ResultPanel";
import { useAiStream } from "../hooks/useAiStream";
import { useSettings } from "../hooks/useSettings";
import { aiService } from "../services/aiService";
import { AppSettings, getActiveLlm } from "../store/appStore";

// ── Design tokens (matches SettingsPage) ───────────────────────────────────
const C = {
    bg: "#ffffff",
    border: "#e8e8ed",
    text: "#1a1a1a",
    textMuted: "#888",
    textLabel: "#555",
    accent: "#7c5cbf",
    accentLight: "#f5f0ff",
    bgHover: "#f5f5f8",
    bgRow: "#fafafa",
    danger: "#dc2626",
};

export default function ResultPage() {
    const { content, status, error, reset } = useAiStream();
    const { settings, save, reload } = useSettings();
    const [inputText, setInputText] = useState<string>("");
    const [showLlmDropdown, setShowLlmDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isStreaming = status === "loading";

    const activeLlm = settings ? getActiveLlm(settings) : null;
    const currentModelLabel = activeLlm?.model ?? "AI 助手";


    // Reload settings when this window receives a settings_updated event
    useEffect(() => {
        const unlisten = listen("settings_updated", () => {
            reload();
        });
        return () => { unlisten.then((fn) => fn()); };
    }, [reload]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowLlmDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Open event: reset + auto-start AI
    useEffect(() => {
        const unlisten = listen<{ text: string }>("open_result_panel", (e) => {
            reset();
            const text = e.payload.text;
            setInputText(text);
            //setTimeout(() => aiService.solveWithAi(text).catch(console.error), 50);
        });
        return () => { unlisten.then((fn) => fn()); };
    }, [reset]);

    const handleClose = () => invoke("hide_result_panel").catch(console.error);

    const handleDragMouseDown = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await getCurrentWebviewWindow().startDragging();
        } catch (_) { /* ignore */ }
    };

    const handleRegenerate = () => {
        if (!inputText || isStreaming) return;
        reset();
        setTimeout(() => aiService.solveWithAi(inputText).catch(console.error), 50);
    };

    const handleReask = () => {
        if (!inputText.trim() || isStreaming) return;
        reset();
        setTimeout(() => aiService.solveWithAi(inputText).catch(console.error), 50);
    };

    const handleSelectLlm = async (llmId: string) => {
        setShowLlmDropdown(false);
        if (!settings) return;
        const updated: AppSettings = { ...settings, active_llm_id: llmId };
        await save(updated).catch(console.error);
    };

    return (
        <div style={{
            width: "100%", height: "100%",
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            fontFamily: "'Inter', system-ui, sans-serif",
            border: `1px solid rgba(255,255,255,0.3)`,
        }}>

            {/* ── Title bar: drag handle + title + close (matches SettingsPage header style) ── */}
            <div
                onMouseDown={handleDragMouseDown}
                style={{
                    display: "flex", alignItems: "center",
                    padding: "12px 14px 10px",
                    borderBottom: `1px solid ${C.border}`,
                    flexShrink: 0,
                    cursor: "grab",
                    userSelect: "none",
                    gap: "8px",
                }}
            >
                {/* Icon */}
                <div style={{
                    width: 28, height: 28, borderRadius: "8px",
                    background: "linear-gradient(135deg, #7c5cbf 0%, #a78bfa 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <text
                            x="50%"
                            y="50%"
                            dominantBaseline="middle"
                            textAnchor="middle"
                            fill="white"
                            fontSize="16"
                            fontWeight="700"
                            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                        >
                            M
                        </text>
                    </svg>
                </div>

                {/* Title */}
                <div style={{ flex: 1 }}>
                    <div ref={dropdownRef} style={{ position: "relative" }}>
                        <button
                            onClick={() => setShowLlmDropdown((v) => !v)}
                            style={{
                                display: "flex", alignItems: "center", gap: "5px",
                                background: C.accentLight, borderRadius: "6px",
                                padding: "6px", fontSize: "12px",
                                color: C.accent, fontWeight: 600,
                                border: `1px solid rgba(124,92,191,0.2)`,
                                cursor: "pointer", outline: "none",
                                whiteSpace: "nowrap",
                                height: 28,
                            }}
                        >
                            <span>{currentModelLabel}</span>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, opacity: 0.6 }}>
                                <path d="M2 3.5L5 6.5L8 3.5" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>

                        {showLlmDropdown && settings && (
                            <div style={{
                                position: "absolute", top: "calc(100% + 4px)", left: 0,
                                minWidth: "200px", maxHeight: "280px", overflowY: "auto",
                                background: "#ffffff", border: `1px solid ${C.border}`,
                                borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                                zIndex: 999,
                            }}>
                                {settings.llm_configs.length === 0 ? (
                                    <div style={{ padding: "12px", fontSize: "12px", color: C.textMuted, textAlign: "center" }}>
                                        暂无配置，请前往设置添加
                                    </div>
                                ) : (
                                    settings.llm_configs.map((cfg) => {
                                        const isActive = settings.active_llm_id === cfg.id ||
                                            (!settings.active_llm_id && settings.llm_configs[0]?.id === cfg.id);
                                        return (
                                            <button
                                                key={cfg.id}
                                                onClick={() => handleSelectLlm(cfg.id)}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: "8px",
                                                    width: "100%", padding: "7px 12px",
                                                    fontSize: "12px",
                                                    color: isActive ? C.accent : C.text,
                                                    background: isActive ? C.accentLight : "transparent",
                                                    border: "none", cursor: "pointer", textAlign: "left",
                                                    fontWeight: isActive ? 600 : 400,
                                                }}
                                                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = C.bgHover; }}
                                                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                                            >
                                                {isActive
                                                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M5 13l4 4L19 7" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                    : <span style={{ width: 10, flexShrink: 0 }} />
                                                }
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cfg.name || cfg.model}</div>
                                                    <div style={{ fontSize: "10px", color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cfg.model}</div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {/* Toolbar buttons: regenerate + settings + close */}
                <div
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}
                >
                    <IconBtn onClick={handleRegenerate} title="重新生成" disabled={isStreaming || !inputText}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            style={isStreaming ? { animation: "spin 1s linear infinite" } : {}}>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            <path d="M4 12a8 8 0 018-8 8 8 0 016.93 4M20 12a8 8 0 01-8 8 8 8 0 01-6.93-4"
                                stroke="#888" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M19 4v4h-4" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </IconBtn>
                    <IconBtn onClick={() => invoke("show_settings_window").catch(console.error)} title="LLM 设置">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="3" stroke="#888" strokeWidth="1.8" />
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                                stroke="#888" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                    </IconBtn>
                    <div style={{ width: "1px", height: "13px", background: C.border, margin: "0 2px" }} />
                    <IconBtn onClick={handleClose} title="关闭" danger>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </IconBtn>
                </div>
            </div>

 {/* ── Editable question input ── */}
        <div style={{
          padding: "10px 14px 8px",
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
          background: C.bgRow,
        }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleReask();
              }
            }}
            placeholder="输入问题或选中文字后触发…"
            //rows={2}
            style={{
              height: "60%",
              width: "100%",
              border: `1px solid ${C.border}`,
              borderRadius: "7px",
              padding: "7px 10px",
              fontSize: "13px", 
              //fontWeight: 500,
              color: C.text, lineHeight: 1.55,
              background: C.bg,
              outline: "none",
              fontFamily: "'Inter', system-ui, sans-serif",
              boxSizing: "border-box",
              transition: "border-color 0.12s",
            }}
            onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.accent; }}
            onBlur={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.border; }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "5px" }}>
            <button
              onClick={handleReask}
              disabled={isStreaming || !inputText.trim()}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "4px 10px", borderRadius: "6px",
                fontSize: "11px", fontWeight: 600,
                border: "none",
                background: isStreaming || !inputText.trim() ? "#e8e8ed" : C.accent,
                color: isStreaming || !inputText.trim() ? "#aaa" : "#fff",
                cursor: isStreaming || !inputText.trim() ? "not-allowed" : "pointer",
                transition: "all 0.12s",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isStreaming ? "分析中…" : "⌘↵ 发送"}
            </button>
          </div>
        </div>


        {/* ── AI Result ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", minHeight: 0 }}>
          {status === "idle" && !content && !inputText && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              height: "100%", gap: "10px", color: "#ccc",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.5 8.5L20 7L14.5 11.5L17 18L12 14L7 18L9.5 11.5L4 7L10.5 8.5L12 2Z" fill="#e8e8ed" />
              </svg>
              <p style={{ fontSize: "12px", color: "#ccc" }}>选中文字后悬停悬浮球触发分析</p>
            </div>
          )}

          {status === "loading" && !content && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
              {[75, 55, 85, 45, 65].map((w, i) => (
                <div key={i} style={{
                  height: "11px", borderRadius: "4px", width: `${w}%`,
                  background: "linear-gradient(90deg, #f0f0f2 25%, #e8e8ec 50%, #f0f0f2 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s infinite",
                }} />
              ))}
            </div>
          )}

          {error && (
            <div style={{
              padding: "10px 12px", borderRadius: "8px",
              background: "#fff5f5", border: "1px solid #fecaca",
              color: C.danger, fontSize: "12px", marginBottom: "10px",
              display: "flex", alignItems: "flex-start", gap: "6px",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
                <circle cx="12" cy="12" r="10" stroke={C.danger} strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke={C.danger} strokeWidth="2" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {content && (
            <div style={{ fontSize: "13px", color: "#222", lineHeight: 1.7 }}>
              <ResultPanel content={content} isStreaming={isStreaming} />
            </div>
            
          )}

          {/* 确保即使没有内容也有最小高度 */}
          {!content && !error && status === "idle" && inputText && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              height: "00px", gap: "10px", color: "#ccc",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="#ddd" strokeWidth="2" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                    stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p style={{ fontSize: "12px", color: "#ccc" }}>点击发送按钮开始分析</p>
            </div>
          )}
        </div>



        {/* ── Footer ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "5px 14px 6px",
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
          background: C.bgRow,
        }}>
          {isStreaming && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: C.accent }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: C.accent,
                animation: "pulse 1s ease-in-out infinite",
                display: "inline-block",
              }} />
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
              生成中
            </span>
          )}
        </div>

        </div>
    );
}


function IconBtn({
    children, onClick, title, disabled, danger,
}: {
    children: React.ReactNode;
    onClick: () => void;
    title?: string;
    disabled?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={{
                width: "28px", height: "28px",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "6px", border: "none",
                background: "transparent",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.35 : 1,
                transition: "background 0.12s",
                outline: "none", flexShrink: 0,
            }}
        //   onMouseEnter={(e) => {
        //     if (!disabled)
        //       (e.currentTarget as HTMLButtonElement).style.background = danger ? "#fff0f0" : "#f0f0f4";
        //   }}
        //   onMouseLeave={(e) => {
        //     (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        //   }}
        >
            {children}
        </button>
    );
}
