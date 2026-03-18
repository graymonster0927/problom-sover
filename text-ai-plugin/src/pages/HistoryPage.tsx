import { useState, useEffect } from "react";
import HistoryItem, { HistoryRecord } from "../components/HistoryItem";
import { settingsService } from "../services/settingsService";

const PER_PAGE = 20;

const C = {
  bg: "#ffffff",
  border: "#e8e8ed",
  text: "#1a1a1a",
  textMuted: "#888",
  accent: "#7c5cbf",
  accentLight: "#f5f0ff",
  danger: "#dc2626",
  dangerLight: "#fff5f5",
};

export default function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadMore = async (p = page) => {
    setLoading(true);
    const data = await settingsService.listHistory(p, PER_PAGE).catch(() => []);
    if (data.length < PER_PAGE) setHasMore(false);
    setRecords((prev) => (p === 0 ? data : [...prev, ...data]));
    setPage(p + 1);
    setLoading(false);
  };

  useEffect(() => { loadMore(0); }, []);

  const handleClear = async () => {
    if (!confirm("确定清除所有历史记录？")) return;
    await settingsService.clearHistory().catch(console.error);
    setRecords([]);
    setHasMore(false);
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
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px",
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "8px",
            background: "linear-gradient(135deg, #7c5cbf 0%, #a78bfa 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
              <polyline points="12 6 12 12 16 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: "15px", fontWeight: 600, color: C.text }}>历史记录</h1>
        </div>
        <button
          onClick={handleClear}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "5px 10px", borderRadius: "7px", fontSize: "12px",
            border: `1px solid ${C.border}`,
            background: "transparent", color: C.danger, cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.dangerLight; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <polyline points="3 6 5 6 21 6" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 11v6M14 11v6" stroke={C.danger} strokeWidth="2" strokeLinecap="round" />
          </svg>
          清除全部
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {records.length === 0 && !loading && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100%", gap: "10px", color: C.textMuted,
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
              <circle cx="12" cy="12" r="10" stroke={C.textMuted} strokeWidth="1.8" />
              <polyline points="12 6 12 12 16 14" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p style={{ fontSize: "13px" }}>暂无历史记录</p>
          </div>
        )}

        {records.map((record) => (
          <div key={record.id}>
            <div
              onClick={() => setExpanded(expanded === record.id ? null : record.id)}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: `1px solid ${expanded === record.id ? C.accent : C.border}`,
                background: expanded === record.id ? C.accentLight : "#fafafa",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                if (expanded !== record.id) (e.currentTarget as HTMLDivElement).style.borderColor = "#d0d0e0";
              }}
              onMouseLeave={(e) => {
                if (expanded !== record.id) (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
              }}
            >
              <HistoryItem record={record} onClick={() => {}} />
            </div>
            {expanded === record.id && (
              <div style={{
                margin: "2px 4px 0",
                padding: "12px 14px",
                borderRadius: "0 0 8px 8px",
                background: "#fafafa",
                border: `1px solid ${C.border}`,
                borderTop: "none",
              }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: C.textMuted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  AI 回复
                </p>
                <p style={{ fontSize: "12px", color: C.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {record.ai_result}
                </p>
              </div>
            )}
          </div>
        ))}

        {hasMore && !loading && (
          <button
            onClick={() => loadMore()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              padding: "10px", fontSize: "12px", color: C.accent,
              background: "transparent", border: "none", cursor: "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            加载更多
          </button>
        )}

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "12px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }} fill="none">
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <circle cx="12" cy="12" r="10" stroke="#e0e0e0" strokeWidth="2.5" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
