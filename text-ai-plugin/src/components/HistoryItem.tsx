import { formatDistanceToNow } from "date-fns";

export interface HistoryRecord {
  id: string;
  timestamp: string;
  input_text: string;
  ai_result: string;
  provider: string;
}

interface Props {
  record: HistoryRecord;
  onClick: () => void;
}

export default function HistoryItem({ record, onClick }: Props) {
  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(record.timestamp), { addSuffix: true });
    } catch {
      return record.timestamp;
    }
  })();

  const providerColor: Record<string, string> = {
    openai: "bg-emerald-500/20 text-emerald-300",
    anthropic: "bg-orange-500/20 text-orange-300",
    ollama: "bg-blue-500/20 text-blue-300",
  };

  return (
    <button
      onClick={onClick}
      className="
        w-full text-left p-4 rounded-xl
        bg-white/[0.04] hover:bg-white/[0.07]
        border border-white/[0.06] hover:border-indigo-500/30
        transition-all duration-200 animate-fade-in
        group
      "
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[#E0E0F0] font-medium text-[13px] line-clamp-2 flex-1">
          {record.input_text}
        </p>
        <span
          className={`
            shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium
            ${providerColor[record.provider] ?? "bg-gray-500/20 text-gray-300"}
          `}
        >
          {record.provider}
        </span>
      </div>
      <p className="text-[#7070A0] text-[12px] line-clamp-2 mb-2 group-hover:text-[#9090C0] transition-colors">
        {record.ai_result}
      </p>
      <p className="text-[#50507A] text-[11px]">{timeAgo}</p>
    </button>
  );
}
