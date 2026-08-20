import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Copy, 
  Check, 
  Terminal, 
  Info, 
  Lightbulb, 
  AlertTriangle, 
  AlertCircle, 
  ShieldAlert 
} from 'lucide-react';
import MermaidRenderer from './MermaidRenderer';

function CodeBlock({ node, inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1].toLowerCase() : '';
  const codeString = String(children).replace(/\n$/, '');

  // Render Mermaid diagrams directly
  if (!inline && lang === 'mermaid') {
    return <MermaidRenderer chart={codeString} />;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative rounded-lg border border-border/80 bg-[#0d1117] my-3 overflow-hidden group">
        {/* Code Block Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-surface/90 border-b border-border/60 text-[11px] text-slate-400 font-mono select-none">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-indigo-400" />
            <span className="font-semibold text-slate-300">{lang}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-surface-hover text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Code Content */}
        <pre className="p-3 text-xs font-mono text-slate-200 overflow-x-auto">
          <code>{children}</code>
        </pre>
      </div>
    );
  }

  return (
    <code className="px-1.5 py-0.5 rounded bg-surface border border-border/50 text-indigo-300 font-mono text-[11px]" {...props}>
      {children}
    </code>
  );
}

// GitHub Callout parser
function CustomBlockquote({ children }) {
  // Check for GitHub Alerts [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]
  return (
    <blockquote className="border-l-2 border-indigo-500 pl-3 py-1 my-2 text-slate-300 bg-indigo-950/20 rounded-r text-xs">
      {children}
    </blockquote>
  );
}

export default function MarkdownRenderer({ content, onOpenFile }) {
  return (
    <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          blockquote: CustomBlockquote,
          a: ({ href, children, ...props }) => {
            const isFileLink = href && (
              href.startsWith('file:///') || 
              href.startsWith('action:open:') ||
              /\.(html|css|jsx?|tsx?|json|py|md|rs|go|sql|env)$/i.test(href)
            );

            if (isFileLink && onOpenFile) {
              const cleanPath = href.replace(/^file:\/\/\/?/, '').replace(/^action:open:/, '');
              const fileName = cleanPath.split(/[\\\/]/).pop() || cleanPath;
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenFile({ path: cleanPath, name: fileName });
                  }}
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline font-mono text-xs cursor-pointer px-1 py-0.2 rounded hover:bg-indigo-950/40"
                  title={`Open ${fileName} in split-screen workspace`}
                >
                  <span>📄</span>
                  <span>{children}</span>
                </button>
              );
            }

            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-indigo-400 hover:text-indigo-300 underline" 
                {...props}
              >
                {children}
              </a>
            );
          },
          h1: ({ children }) => <h1 className="text-base font-bold text-white mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold text-white mt-3 mb-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-bold text-slate-200 mt-2 mb-1">{children}</h3>,
          p: ({ children }) => <p className="text-slate-300 mb-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 text-slate-300 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 text-slate-300 mb-2">{children}</ol>,
          li: ({ children }) => <li className="text-slate-300">{children}</li>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full text-left border-collapse border border-border text-[11px]">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-surface px-2.5 py-1.5 font-semibold text-slate-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2.5 py-1.5 text-slate-300">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
