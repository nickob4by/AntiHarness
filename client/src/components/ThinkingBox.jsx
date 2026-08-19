import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronRight, BrainCircuit } from 'lucide-react';

export default function ThinkingBox({ thoughts, isThinking }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!thoughts && !isThinking) return null;

  return (
    <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/20 mb-3 overflow-hidden text-xs">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-indigo-900/20 transition-colors select-none"
      >
        <div className="flex items-center gap-2 text-indigo-300 font-medium">
          <BrainCircuit className={`w-3.5 h-3.5 ${isThinking ? 'animate-pulse text-indigo-400' : 'text-indigo-400/70'}`} />
          <span>{isThinking ? 'Agent is thinking...' : 'Thought Process'}</span>
        </div>

        <div className="flex items-center gap-2">
          {isThinking && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
          )}
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-indigo-400/60" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-indigo-400/60" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="p-3 border-t border-indigo-500/10 bg-black/20 text-indigo-200/80 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
          {thoughts || 'Formulating plan...'}
        </div>
      )}
    </div>
  );
}
