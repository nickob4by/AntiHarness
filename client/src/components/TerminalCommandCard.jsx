import React, { useState } from 'react';
import { Terminal, Copy, Check, RotateCw, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function TerminalCommandCard({ command, output, exitCode, duration, isRunning, onRerun }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(output || command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = exitCode === 0 || exitCode === undefined;

  return (
    <div className="rounded-xl border border-border/80 bg-[#080b11] overflow-hidden shadow-lg font-mono text-xs my-2 select-text">
      {/* Header Bar */}
      <div className="px-3 py-2 bg-surface/80 border-b border-border/60 flex items-center justify-between select-none">
        <div className="flex items-center gap-2 text-slate-200">
          <div className="w-5 h-5 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Terminal className="w-3 h-3" />
          </div>
          <span className="font-bold text-xs text-indigo-300">$ {command}</span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {isRunning ? (
            <span className="flex items-center gap-1 text-indigo-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              Running...
            </span>
          ) : (
            <>
              {duration && (
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-2.5 h-2.5" />
                  {duration}
                </span>
              )}
              {exitCode !== undefined && (
                <span className={`flex items-center gap-1 font-semibold ${isSuccess ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {isSuccess ? 'Success' : `Exit ${exitCode}`}
                </span>
              )}
            </>
          )}

          {onRerun && !isRunning && (
            <button
              onClick={() => onRerun(command)}
              title="Rerun command"
              className="p-1 hover:bg-surface rounded text-slate-400 hover:text-indigo-300 transition-colors"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={handleCopy}
            title="Copy output"
            className="p-1 hover:bg-surface rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="p-3.5 bg-[#05070c] max-h-80 overflow-auto text-slate-200 leading-relaxed whitespace-pre font-mono text-[11px] selection:bg-indigo-500/30 selection:text-indigo-200">
        {output || (isRunning ? <span className="text-slate-500 italic">Executing command in workspace...</span> : <span className="text-slate-500 italic">No output</span>)}
      </div>
    </div>
  );
}
