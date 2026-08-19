import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Copy, 
  Check 
} from 'lucide-react';

export default function ToolCard({ tool }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tool.output || JSON.stringify(tool.args, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = !tool.status || tool.status === 'RUNNING';
  const isSuccess = tool.status === 'SUCCESS';
  const isError = tool.status === 'ERROR';

  return (
    <div className="rounded-lg border border-border/80 bg-surface/90 overflow-hidden text-xs my-2 transition-all shadow-sm">
      {/* Tool Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-surface-hover/80 transition-colors select-none"
      >
        <div className="flex items-center gap-2 font-mono">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-indigo-300">{tool.name}</span>
          {tool.args?.DirectoryPath && (
            <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
              {tool.args.DirectoryPath}
            </span>
          )}
          {tool.args?.Query && (
            <span className="text-amber-300 text-[11px] truncate max-w-[150px]">
              "{tool.args.Query}"
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running...
            </span>
          )}
          {isSuccess && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3" />
              Done
            </span>
          )}
          {isError && (
            <span className="flex items-center gap-1 text-[10px] text-rose-400 font-mono">
              <AlertCircle className="w-3 h-3" />
              Failed
            </span>
          )}

          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {isOpen && (
        <div className="p-3 border-t border-border/60 bg-background/50 space-y-2 font-mono text-[11px]">
          {/* Tool Arguments */}
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Arguments</div>
            <pre className="p-2 rounded bg-surface border border-border/40 text-slate-300 overflow-x-auto">
              {JSON.stringify(tool.args, null, 2)}
            </pre>
          </div>

          {/* Tool Result / Output */}
          {tool.output && (
            <div>
              <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 font-bold mb-1">
                <span>Output</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-200 capitalize font-normal"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-2 rounded bg-surface border border-border/40 text-emerald-300/90 overflow-x-auto max-h-48 whitespace-pre">
                {tool.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
