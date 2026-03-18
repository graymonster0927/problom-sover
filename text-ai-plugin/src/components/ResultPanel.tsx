import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Copy, Check } from "lucide-react";

/**
 * 🔥 Error Boundary（防止整个窗口崩掉）
 */
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    console.error("🔥 Markdown 渲染错误:", error);
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("🔥 Markdown Crash:", error);
    console.error("🔥 Error Info:", errorInfo);
    
    // 通知父组件渲染失败
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return null; // 返回 null，让父组件显示原文
    }
    return this.props.children;
  }
}

interface Props {
  content: string;
  isStreaming: boolean;
}

export default function ResultPanel({ content, isStreaming }: Props) {
  const [renderError, setRenderError] = useState(false);
  
  console.log("📝 ResultPanel render:", {
    contentLength: content?.length,
    isStreaming,
    fullContent: content
  });

  // ✅ 防止 undefined/null
  let safeContent = content || "";

  // 如果渲染出错，直接显示原文
  if (renderError) {
    return (
      <div 
        className="p-4 text-[14px] leading-7 whitespace-pre-wrap"
        style={{ 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
          color: '#1a1a1a'
        }}
      >
        {content}
        {isStreaming && (
          <span className="inline-block w-0.5 h-4 bg-purple-500 ml-0.5 animate-pulse" />
        )}
      </div>
    );
  }

  try {
    // ✅ 修复未闭合代码块（streaming 必炸点）
    const codeBlockCount = (safeContent.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      console.log("⚠️ 未闭合代码块，自动补全");
      safeContent += "\n```";
    }

    // ✅ 修复未闭合的行内代码（兼容所有浏览器）
    const withoutCodeBlocks = safeContent.replace(/```[\s\S]*?```/g, "");
    const singleBackticks = withoutCodeBlocks.match(/`/g) || [];
    if (singleBackticks.length % 2 !== 0) {
      console.log("⚠️ 未闭合行内代码，自动补全");
      safeContent += "`";
    }
  } catch (e) {
    console.error("❌ 修复 Markdown 时出错:", e);
    setRenderError(true);
    return null;
  }

  return (
    <div 
      className="prose prose-sm max-w-none text-[14px] leading-7 p-4"
      style={{ 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
        color: '#1a1a1a'
      }}
    >
      <ErrorBoundary onError={() => setRenderError(true)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={isStreaming ? [] : [rehypeHighlight]}
          components={{
            code: CodeBlock,
            pre: PreBlock,
          }}
        >
          {safeContent}
        </ReactMarkdown>
      </ErrorBoundary>

      {/* 打字光标 */}
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-purple-500 ml-0.5 animate-pulse" />
      )}
    </div>
  );
}

/**
 * 📦 代码块容器（带复制）
 */
function PreBlock({ children, ...props }: any) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      let text = "";

      // 安全提取代码内容
      if (children?.props?.children) {
        const codeChild = children.props.children;
        
        if (typeof codeChild === "string") {
          text = codeChild;
        } else if (Array.isArray(codeChild)) {
          text = codeChild.filter(c => c != null).join("");
        } else {
          text = String(codeChild);
        }
      }

      console.log("📋 复制内容:", text);

      if (text) {
        // 使用多种方式尝试复制
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // 降级方案：使用 execCommand
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        
        console.log("✅ 复制成功");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.error("❌ 复制失败:", e);
    }
  };

  return (
    <div className="relative group my-4">
      <pre
        className="!bg-gradient-to-br !from-slate-800 !to-slate-900 !border !border-slate-700/50 !rounded-xl !p-4 overflow-x-auto shadow-lg"
        style={{ fontFamily: '"Consolas", "Monaco", "Courier New", monospace' }}
        {...props}
      >
        {children}
      </pre>

      <button
        onClick={handleCopy}
        className="
          absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100
          transition-all duration-200 p-1.5 rounded-lg
          bg-white/10 hover:bg-white/20 backdrop-blur-sm
          text-white/70 hover:text-white
        "
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

/**
 * 💻 code 渲染
 */
function CodeBlock({ inline, children, className, ...props }: any) {
  // 行内代码
  if (inline) {
    return (
      <code
        className="
          bg-purple-50 text-purple-700 
          px-1.5 py-0.5 rounded-md 
          text-[0.9em] font-medium 
          border border-purple-100
        "
        {...props}
      >
        {children}
      </code>
    );
  }

  // 块级代码
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}
