import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  content: string;
  isStreaming: boolean;
}

export default function ResultPanel({ content, isStreaming }: Props) {
  return (
    <div className="prose max-w-none text-[13px] text-[#1a1a1a]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: CodeBlock,
          pre: PreBlock,
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-gray-400 ml-0.5 animate-pulse" />
      )}
    </div>
  );
}

function PreBlock({ children, ...props }: any) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const codeEl = (props as any).node?.children?.[0];
    const text =
      codeEl?.children?.[0]?.value || "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative group my-3">
      <pre
        className="!bg-black/40 !border !border-indigo-500/20 !rounded-lg !p-4 overflow-x-auto"
        {...props}
      >
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="
          absolute top-2 right-2 opacity-0 group-hover:opacity-100
          transition-opacity p-1.5 rounded-md
          bg-indigo-600/50 hover:bg-indigo-500/70
          text-white/80 hover:text-white
        "
        title="Copy code"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

function CodeBlock({ inline, children, className, ...props }: any) {
  if (inline) {
    return (
      <code
        className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-[0.85em] font-mono"
        {...props}
      >
        {children}
      </code>
    );
  }
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}
