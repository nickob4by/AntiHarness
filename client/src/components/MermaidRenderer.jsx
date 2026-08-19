import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { 
  Copy, 
  Check, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  AlertTriangle,
  Maximize2,
  Minimize2,
  Move
} from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'JetBrains Mono, monospace',
  themeVariables: {
    darkMode: true,
    background: '#0a0d14',
    primaryColor: '#6366f1',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#818cf8',
    lineColor: '#94a3b8',
    secondaryColor: '#3b82f6',
    tertiaryColor: '#1e293b',
  },
});

export default function MermaidRenderer({ chart, minHeight = 'min-h-[450px]', title = 'Architecture Diagram' }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1.15);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only primary mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleResetView = () => {
    setZoom(1.15);
    setPan({ x: 0, y: 0 });
  };

  if (error) {
    return (
      <div className="p-4 my-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono space-y-2">
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

  const content = (
    <div className={`rounded-2xl border border-border/80 bg-[#0a0d14] overflow-hidden shadow-2xl flex flex-col ${
      isFullscreen ? 'fixed inset-4 z-50 bg-[#070a10]' : 'my-2'
    }`}>
      {/* Header Controls Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0f1422] border-b border-border/70 text-xs text-slate-300 font-mono select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-bold text-white tracking-tight">{title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 font-sans hidden sm:inline">
            Interactive Pan & Zoom
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom Presets */}
          <button
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(2))))}
            title="Zoom Out (-)"
            className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] px-2 py-0.5 rounded bg-black/40 border border-border/60 text-indigo-300 font-bold min-w-[50px] text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.2).toFixed(2))))}
            title="Zoom In (+)"
            className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetView}
            title="Reset Zoom & Pan"
            className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-border/80 mx-1" />

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-300" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white text-[11px] border border-indigo-500/40 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Area with Drag & Pan */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`p-6 overflow-hidden flex items-center justify-center bg-[#070a10] transition-all relative ${
          isFullscreen ? 'flex-1 h-full cursor-grab active:cursor-grabbing' : `${minHeight} cursor-grab active:cursor-grabbing`
        }`}
        style={{
          backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        {svgContent ? (
          <div 
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out'
            }}
            className="select-none inline-block filter drop-shadow-xl"
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        ) : (
          <div className="text-xs text-slate-500 animate-pulse font-mono flex items-center gap-2">
            <Move className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Rendering high-resolution architecture diagram...</span>
          </div>
        )}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 bg-black/80 z-40 backdrop-blur-md" onClick={() => setIsFullscreen(false)} />
        {content}
      </>
    );
  }

  return content;
}