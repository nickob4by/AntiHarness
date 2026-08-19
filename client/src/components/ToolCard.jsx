import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Copy, 
  Check,
  FileCode,
  FilePlus,
  Play,
  ExternalLink,
  Plus,
  Minus
} from 'lucide-react';

export default function ToolCard({ tool, onOpenFile }) {
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

  const toolName = tool.name || 'tool';
  const targetFile = tool.args?.TargetFile || tool.args?.AbsolutePath || tool.args?.filePath;
  const command = tool.args?.CommandLine;
  const targetContent = tool.args?.TargetContent;
  const replacementContent = tool.args?.ReplacementContent;

  const getToolIcon = () => {
    switch (toolName) {
      case 'replace_file_content':
        return <FileCode className="w-3.5 h-3.5 text-indigo-400" />;
      case 'write_to_file':
        return <FilePlus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'run_command':
        return <Play className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="rounded-lg border border-border/80 bg-surface/90 overflow-hidden text-xs my-2 transition-all shadow-sm">
      {/* Tool Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-surface-hover/80 transition-colors select-none"
      >
        <div className="flex items-center gap-2 font-mono truncate mr-2">
          {getToolIcon()}
          <span className="font-semibold text-indigo-300 shrink-0">{toolName}</span>
          
          {targetFile && (
            <span className="text-slate-300 text-[11px] truncate max-w-[240px]" title={targetFile}>
              {targetFile.split(/[/\\]/).pop()}
            </span>
          )}

          {command && (
            <span className="text-amber-300 text-[11px] truncate max-w-[200px]" title={command}>
              `{command}`
            </span>
          )}

          {tool.args?.Query && (
            <span className="text-amber-300 text-[11px] truncate max-w-[150px]">
              "{tool.args.Query}"
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
        <div className="p-3 border-t border-border/60 bg-background/50 space-y-2.5 font-mono text-[11px]">
          
          {/* Quick File Action if Target File is present */}
          {targetFile && onOpenFile && (
            <div className="flex items-center justify-between p-2 rounded bg-surface border border-border/60">
              <span className="text-slate-300 text-[10px] truncate max-w-[260px]">{targetFile}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFile({ path: targetFile, name: targetFile.split(/[/\\]/).pop() });
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-[10px] transition-all cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open in Monaco Editor</span>
              </button>
            </div>
          )}

          {/* Inline Visual Diff for replace_file_content */}
          {targetContent !== undefined && replacementContent !== undefined && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-slate-400 font-bold">Code Modification Diff</div>
              <div className="rounded border border-border/60 overflow-hidden text-[10px]">
                {/* Removed Target Content */}
                <div className="bg-rose-950/25 border-b border-border/40 p-2 text-rose-300">
                  <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-rose-400 mb-1">
                    <Minus className="w-3 h-3" />
                    <span>Original Code Chunk</span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre font-mono">{targetContent}</pre>
                </div>

                {/* Added Replacement Content */}
                <div className="bg-emerald-950/25 p-2 text-emerald-300">
                  <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-emerald-400 mb-1">
                    <Plus className="w-3 h-3" />
                    <span>Replacement Code Chunk</span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre font-mono">{replacementContent}</pre>
                </div>
              </div>
            </div>
          )}

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
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-200 capitalize font-normal cursor-pointer"
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
