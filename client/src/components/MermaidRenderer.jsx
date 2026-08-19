import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, ZoomIn, ZoomOut, RotateCcw, AlertTriangle } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'JetBrains Mono, monospace',
  themeVariables: {
    darkMode: true,
    background: '#0d1117',
    primaryColor: '#6366f1',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#818cf8',
    lineColor: '#94a3b8',
    secondaryColor: '#3b82f6',
    tertiaryColor: '#1e293b',
  },
});

export default function MermaidRenderer({ chart }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const id = `mermaid-svg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    async function renderChart() {
      if (!chart || !chart.trim()) return;
      setError(null);

      try {
        const cleanChart = chart.trim();
        const { svg } = await mermaid.render(id, cleanChart);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Mermaid rendering warning:', err);
          setError(err.message || 'Diagram syntax error');
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
      const elem = document.getElementById(id);
      if (elem) elem.remove();
    };
  }, [chart]);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="p-3 my-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-rose-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Diagram Render Error</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono bg-black/40 p-2 rounded overflow-x-auto">
          {error}
        </div>
        <pre className="text-[10px] text-slate-300 bg-surface/80 p-2 rounded overflow-x-auto">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div className="my-3 rounded-xl border border-border/80 bg-[#0d121c] overflow-hidden shadow-lg group">
      {/* Header with Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface/90 border-b border-border/60 text-[11px] text-slate-400 font-mono select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="font-semibold text-slate-300">Mermaid Architecture Diagram</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            title="Zoom Out"
            className="p-1 rounded hover:bg-surface-hover text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] px-1 text-slate-500 font-mono">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
            title="Zoom In"
            className="p-1 rounded hover:bg-surface-hover text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            title="Reset Zoom"
            className="p-1 rounded hover:bg-surface-hover text-slate-400 hover:text-slate-200 transition-colors ml-0.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-3 w-px bg-border/60 mx-1" />

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface hover:bg-surface-hover text-slate-300 hover:text-white text-[10px] border border-border/60 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div 
        ref={containerRef}
        className="p-4 overflow-auto flex items-center justify-center min-h-[160px] bg-[#070a10]/60 transition-all"
      >
        {svgContent ? (
          <div 
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            className="transition-transform duration-150 ease-out"
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        ) : (
          <div className="text-xs text-slate-500 animate-pulse font-mono">
            Rendering diagram...
          </div>
        )}
      </div>
    </div>
  );
}