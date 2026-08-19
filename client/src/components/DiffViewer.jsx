import React, { useMemo, useState } from 'react';
import * as Diff from 'diff';
import { Columns, AlignJustify, Plus, Minus, Check, Copy } from 'lucide-react';

export default function DiffViewer({ oldCode = '', newCode = '', oldFileName = 'Original', newFileName = 'Modified' }) {
  const [viewMode, setViewMode] = useState('sideBySide'); // 'sideBySide' | 'unified'
  const [copied, setCopied] = useState(false);

  const diffResult = useMemo(() => {
    return Diff.diffLines(oldCode, newCode);
  }, [oldCode, newCode]);

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    diffResult.forEach((part) => {
      const count = part.count || (part.value.match(/\n/g) || []).length + 1;
      if (part.added) additions += count;
      if (part.removed) deletions += count;
    });
    return { additions, deletions };
  }, [diffResult]);

  // Compute side-by-side lines
  const sideBySideLines = useMemo(() => {
    const left = [];
    const right = [];
    let leftLineNum = 1;
    let rightLineNum = 1;

    diffResult.forEach((part) => {
      const lines = part.value.replace(/\n$/, '').split('\n');

      if (part.added) {
        lines.forEach((line) => {
          left.push({ lineNum: '', text: '', type: 'empty' });
          right.push({ lineNum: rightLineNum++, text: line, type: 'added' });
        });
      } else if (part.removed) {
        lines.forEach((line) => {
          left.push({ lineNum: leftLineNum++, text: line, type: 'removed' });
          right.push({ lineNum: '', text: '', type: 'empty' });
        });
      } else {
        lines.forEach((line) => {
          left.push({ lineNum: leftLineNum++, text: line, type: 'normal' });
          right.push({ lineNum: rightLineNum++, text: line, type: 'normal' });
        });
      }
    });

    return { left, right };
  }, [diffResult]);

  const handleCopyNew = () => {
    navigator.clipboard.writeText(newCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#080b11] font-mono text-xs overflow-hidden select-none">
      {/* Diff Controls Header */}
      <div className="px-4 py-2 border-b border-border bg-surface/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200 text-xs">Code Diff Comparison</span>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
              <Plus className="w-2.5 h-2.5" /> {stats.additions} lines
            </span>
            <span className="px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-0.5">
              <Minus className="w-2.5 h-2.5" /> {stats.deletions} lines
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-surface border border-border rounded-md p-0.5 text-[10px]">
            <button
              onClick={() => setViewMode('sideBySide')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                viewMode === 'sideBySide' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                viewMode === 'unified' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlignJustify className="w-3 h-3" />
              <span>Unified</span>
            </button>
          </div>

          <button
            onClick={handleCopyNew}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface hover:bg-surface-hover border border-border text-slate-300 text-[11px]"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy Modified'}</span>
          </button>
        </div>
      </div>

      {/* Side-By-Side Mode */}
      {viewMode === 'sideBySide' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Original Code */}
          <div className="flex-1 flex flex-col border-r border-border/80 overflow-hidden bg-[#07090f]">
            <div className="px-3 py-1.5 bg-surface/60 border-b border-border/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {oldFileName} (Original)
            </div>
            <div className="flex-1 overflow-auto p-2 font-mono text-xs">
              {sideBySideLines.left.map((item, i) => (
                <div
                  key={i}
                  className={`flex leading-relaxed font-mono ${
                    item.type === 'removed'
                      ? 'bg-rose-950/40 text-rose-300'
                      : item.type === 'empty'
                      ? 'bg-transparent opacity-20'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="w-10 select-none text-right pr-3 text-slate-600 shrink-0 text-[10px]">
                    {item.lineNum}
                  </span>
                  <span className="whitespace-pre overflow-x-visible">{item.text || ' '}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Modified Code */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#07090f]">
            <div className="px-3 py-1.5 bg-surface/60 border-b border-border/50 text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
              {newFileName} (Modified)
            </div>
            <div className="flex-1 overflow-auto p-2 font-mono text-xs">
              {sideBySideLines.right.map((item, i) => (
                <div
                  key={i}
                  className={`flex leading-relaxed font-mono ${
                    item.type === 'added'
                      ? 'bg-emerald-950/40 text-emerald-300 font-medium'
                      : item.type === 'empty'
                      ? 'bg-transparent opacity-20'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="w-10 select-none text-right pr-3 text-slate-600 shrink-0 text-[10px]">
                    {item.lineNum}
                  </span>
                  <span className="whitespace-pre overflow-x-visible">{item.text || ' '}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Unified Mode */
        <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-[#07090f]">
          {diffResult.map((part, pidx) => {
            const lines = part.value.replace(/\n$/, '').split('\n');
            return lines.map((line, lidx) => (
              <div
                key={`${pidx}-${lidx}`}
                className={`flex leading-relaxed ${
                  part.added
                    ? 'bg-emerald-950/40 text-emerald-300'
                    : part.removed
                    ? 'bg-rose-950/40 text-rose-300'
                    : 'text-slate-300'
                }`}
              >
                <span className="w-6 text-center select-none shrink-0 font-bold text-[10px]">
                  {part.added ? '+' : part.removed ? '-' : ' '}
                </span>
                <span className="whitespace-pre overflow-x-visible">{line || ' '}</span>
              </div>
            ));
          })}
        </div>
      )}
    </div>
  );
}
