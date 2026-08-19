import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Layers, 
  FolderTree, 
  Zap, 
  RefreshCw, 
  Sparkles, 
  FileCode, 
  FileText, 
  Settings, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Cpu,
  ArrowRight,
  TrendingDown,
  MessageSquare
} from 'lucide-react';
import MermaidRenderer from './MermaidRenderer';
import { getCodebaseGraph } from '../services/api';

export default function CodebaseGraphViewer({ 
  activeProject, 
  onOpenFile, 
  onSendPromptToChat,
  onClose 
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [graphData, setGraphData] = useState(null);
  const [activeTab, setActiveTab] = useState('diagram'); // 'diagram' | 'outline' | 'raw'
  const [copied, setCopied] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});

  const workspacePath = activeProject?.workspacePath || '';

  const loadGraph = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCodebaseGraph(workspacePath);
      setGraphData(data);
      // Auto-expand top level
      if (data?.directoryTree) {
        setExpandedFolders({ [data.directoryTree.path]: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to generate codebase graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [workspacePath]);

  const handleCopyMap = () => {
    if (!graphData?.compressedMap) return;
    navigator.clipboard?.writeText(graphData.compressedMap);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInjectToChat = () => {
    if (!graphData?.compressedMap) return;
    const prompt = `Here is the current Codebase Cartography map for \`${graphData.workspaceName}\`:\n\n\`\`\`\n${graphData.compressedMap}\n\`\`\`\n\nPlease give me a high-level architectural walkthrough and recommendations for optimization.`;
    if (onSendPromptToChat) {
      onSendPromptToChat(prompt);
    }
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const renderTreeNode = (node, depth = 0) => {
    if (!node) return null;

    if (node.type === 'directory') {
      const isExpanded = expandedFolders[node.path] ?? (depth < 2);
      return (
        <div key={node.path} className="select-none font-mono">
          <div 
            onClick={() => toggleFolder(node.path)}
            className="flex items-center gap-1.5 py-1 px-2 hover:bg-surface-hover/80 rounded-lg cursor-pointer text-slate-300 text-xs transition-colors"
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            <span className="font-semibold text-indigo-300">📁 {node.name}</span>
            <span className="text-[10px] text-slate-500 font-sans">({node.children?.length || 0})</span>
          </div>

          {isExpanded && node.children && (
            <div className="border-l border-border/40 ml-3">
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File Node
    return (
      <div 
        key={node.path}
        onClick={() => onOpenFile && onOpenFile(node)}
        className="flex items-center justify-between py-1 px-2 hover:bg-indigo-600/10 hover:text-indigo-200 rounded-lg cursor-pointer text-slate-400 text-xs transition-colors group select-none font-mono"
        style={{ paddingLeft: `${depth * 14 + 18}px` }}
      >
        <div className="flex items-center gap-1.5 truncate">
          {node.role === 'entry' ? (
            <span className="text-amber-400 font-bold">★</span>
          ) : node.role === 'config' ? (
            <Settings className="w-3 h-3 text-cyan-400" />
          ) : node.role === 'ui' ? (
            <FileCode className="w-3 h-3 text-indigo-400" />
          ) : (
            <FileText className="w-3 h-3 text-slate-500" />
          )}
          <span className="truncate group-hover:text-white text-slate-300">{node.name}</span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-sans shrink-0">
          <span className="px-1.5 py-0.2 rounded bg-surface border border-border/60 uppercase text-[9px]">
            {node.role}
          </span>
          <span>{node.lineCount} lines</span>
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-[#070a10] text-slate-100 flex flex-col font-mono overflow-hidden">
      {/* 1. Header Toolbar & Token Savings Metrics Banner */}
      <div className="border-b border-border bg-[#0d121c] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">Codebase Cartographer</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                Graphify Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Live structural map and token-optimized discovery index for <code className="text-indigo-300">{graphData?.workspaceName || activeProject?.name}</code>
            </p>
          </div>
        </div>

        {/* Token Savings & Stats Pill */}
        {graphData && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300 shadow-inner">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-bold">{graphData.tokenStats?.savingsPercent} Token Savings</span>
                <span className="text-[9px] text-emerald-400/80 block font-sans">
                  ~{graphData.tokenStats?.tokensSaved.toLocaleString()} tokens saved / prompt
                </span>
              </div>
            </div>

            <button
              onClick={loadGraph}
              disabled={loading}
              title="Re-scan workspace map"
              className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* 2. Secondary View Mode Tabs */}
      <div className="border-b border-border/70 bg-[#090d15] px-4 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-[#0d121c] border border-border/80 rounded-xl p-0.5 text-xs">
          <button
            onClick={() => setActiveTab('diagram')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'diagram'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture Graph</span>
          </button>

          <button
            onClick={() => setActiveTab('outline')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'outline'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>File Cartography Tree</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'raw'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Token Context Payload</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMap}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border text-slate-300 hover:text-white text-xs transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Map'}</span>
          </button>

          <button
            onClick={handleInjectToChat}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Send to AI Chat</span>
          </button>
        </div>
      </div>

      {/* 3. Main Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 text-slate-400">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs">Generating project cartography & AST dependency graph...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs max-w-md mx-auto">
            {error}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* TAB 1: Visual Mermaid Architecture Graph */}
            {activeTab === 'diagram' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#0d121c] border border-border/80 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Workspace Architecture Flow</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans">
                      {graphData?.techStack?.join(' • ') || 'Node.js'}
                    </span>
                  </div>

                  <div className="min-h-[400px]">
                    <MermaidRenderer chart={graphData?.mermaidGraph} />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: File Cartography Tree */}
            {activeTab === 'outline' && (
              <div className="p-4 rounded-2xl bg-[#0d121c] border border-border/80 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <FolderTree className="w-4 h-4 text-indigo-400" />
                    <span>Project File Cartography ({graphData?.totalFiles} files, ~{graphData?.totalLinesOfCode} lines)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">
                    Click any file to open in Monaco Editor
                  </span>
                </div>

                <div className="space-y-1">
                  {renderTreeNode(graphData?.directoryTree)}
                </div>
              </div>
            )}

            {/* TAB 3: Token Context Payload */}
            {activeTab === 'raw' && (
              <div className="p-4 rounded-2xl bg-[#0d121c] border border-border/80 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Auto-Injected Token-Optimized Context (Turn 1 Payload)</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold font-sans">
                    ~{graphData?.tokenStats?.optimizedCartographyTokens} Tokens
                  </span>
                </div>

                <pre className="p-4 rounded-xl bg-black/60 border border-border/60 text-[11px] text-indigo-200 font-mono overflow-x-auto leading-relaxed max-h-[500px]">
                  {graphData?.compressedMap}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
