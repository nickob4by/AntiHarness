import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Sparkles, 
  Terminal, 
  StopCircle, 
  Bot, 
  User, 
  Clock, 
  History, 
  ChevronUp, 
  ChevronDown, 
  FileText, 
  Cpu, 
  Brain, 
  Search, 
  X, 
  ArrowUp, 
  ArrowDown,
  Plus,
  Zap,
  Code2,
  HelpCircle,
  Folder,
  Check
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import ThinkingBox from './ThinkingBox';
import ToolCard from './ToolCard';
import TerminalCommandCard from './TerminalCommandCard';

const AVAILABLE_MODELS = [
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', desc: 'Default • Ultra-fast agentic coding' },
  { id: 'gemini-3.7-thinking', name: 'Gemini 3.7 Flash (Thinking)', desc: 'High-reasoning chain-of-thought' },
  { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro', desc: 'Complex planning & deep analysis' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Lightweight & instant lookups' },
  { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', desc: 'Hybrid reasoning model' },
  { id: 'gpt-4o', name: 'GPT-4o', desc: 'Multimodal omni model' },
];

const THINKING_EFFORTS = [
  { id: 'off', label: 'Thinking: Off', desc: 'Direct fast response' },
  { id: 'low', label: 'Thinking: Low (1k)', desc: 'Quick targeted analysis' },
  { id: 'medium', label: 'Thinking: Medium (8k)', desc: 'Balanced problem-solving' },
  { id: 'high', label: 'Thinking: High (32k)', desc: 'Exhaustive step verification' },
  { id: 'dynamic', label: 'Thinking: Dynamic', desc: 'Model-adaptive effort' },
];

export default function MainCanvas({
  selectedSessionTranscript,
  selectedSessionId,
  chatTabs = [],
  activeTabId,
  onSelectChatTab,
  onAddChatTab,
  onCloseChatTab,
  messages = [],
  currentStream,
  onSendMessage,
  onRunShellCommand,
  onStopStream,
  isStreaming,
  workspace
}) {
  const [inputPrompt, setInputPrompt] = useState('');
  const [showHistoryTray, setShowHistoryTray] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.7-flash');
  const [thinkingEffort, setThinkingEffort] = useState('medium');
  const [inputMode, setInputMode] = useState('auto'); // 'auto' | 'agent' | 'shell'
  
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isThinkingDropdownOpen, setIsThinkingDropdownOpen] = useState(false);

  // Chat Search state
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const chatBottomRef = useRef(null);
  const textareaRef = useRef(null);
  const messageRefs = useRef([]);
  const modelDropdownRef = useRef(null);
  const thinkingDropdownRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStream]);

  // Auto-resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputPrompt]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setIsModelDropdownOpen(false);
      }
      if (thinkingDropdownRef.current && !thinkingDropdownRef.current.contains(event.target)) {
        setIsThinkingDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Ctrl+F for quick chat search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowChatSearch((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSend = (e) => {
    e?.preventDefault();
    const trimmed = inputPrompt.trim();
    if (!trimmed || isStreaming) return;

    // Check if input is a shell command (starts with $ or >, or in shell mode, or common shell commands)
    const isShellCommand = 
      inputMode === 'shell' ||
      trimmed.startsWith('$ ') || 
      trimmed.startsWith('> ') ||
      trimmed.startsWith('git ') || 
      trimmed.startsWith('npm ') || 
      trimmed.startsWith('dir') || 
      trimmed.startsWith('ls') || 
      trimmed.startsWith('cd ') ||
      trimmed.startsWith('node ') ||
      trimmed.startsWith('python ');

    if (isShellCommand) {
      const cleanCommand = trimmed.replace(/^[\$>]\s*/, '');
      onRunShellCommand(cleanCommand);
    } else {
      const activeModelObj = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
      onSendMessage(trimmed, {
        model: activeModelObj?.name || 'Gemini 3.7 Flash',
        thinkingEffort,
      });
    }

    setInputPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Find matching message indices
  const matchingMessageIndices = useMemo(() => {
    if (!chatSearchQuery.trim()) return [];
    const query = chatSearchQuery.toLowerCase();
    const indices = [];
    messages.forEach((msg, idx) => {
      if (
        (msg.content && msg.content.toLowerCase().includes(query)) ||
        (msg.command && msg.command.toLowerCase().includes(query)) ||
        (msg.output && msg.output.toLowerCase().includes(query)) ||
        (msg.thoughts && msg.thoughts.toLowerCase().includes(query))
      ) {
        indices.push(idx);
      }
    });
    return indices;
  }, [chatSearchQuery, messages]);

  const handleNextMatch = () => {
    if (matchingMessageIndices.length === 0) return;
    const next = (activeMatchIndex + 1) % matchingMessageIndices.length;
    setActiveMatchIndex(next);
    scrollToMessage(matchingMessageIndices[next]);
  };

  const handlePrevMatch = () => {
    if (matchingMessageIndices.length === 0) return;
    const prev = (activeMatchIndex - 1 + matchingMessageIndices.length) % matchingMessageIndices.length;
    setActiveMatchIndex(prev);
    scrollToMessage(matchingMessageIndices[prev]);
  };

  const scrollToMessage = (msgIndex) => {
    const el = messageRefs.current[msgIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const summary = selectedSessionTranscript?.summary;
  const lastUpdated = summary?.lastUpdated || 'Recent';
  const bulletPoints = summary?.bulletPoints || [];
  const filesModified = summary?.filesModified || [];

  const currentModelName = AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name || 'Gemini 3.7 Flash';
  const currentThinkingLabel = THINKING_EFFORTS.find((t) => t.id === thinkingEffort)?.label || 'Thinking: Medium';

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-background font-mono">
      {/* 1. TOP CHAT TABS BAR */}
      <div className="h-10 px-2 border-b border-border/80 bg-surface/80 backdrop-blur flex items-center justify-between text-xs select-none z-20 overflow-x-auto">
        {/* Left: Chat Agent Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {chatTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectChatTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-t-lg border-t-2 transition-all cursor-pointer truncate max-w-[190px] ${
                  isActive
                    ? 'bg-background border-indigo-500 text-white font-medium shadow-sm'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
                }`}
              >
                <Bot className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="truncate">{tab.title}</span>

                {tab.isStreaming && (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping shrink-0" />
                )}

                {chatTabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseChatTab(tab.id);
                    }}
                    className="p-0.5 hover:bg-surface rounded text-slate-400 hover:text-slate-200 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Plus (+) Button to spawn new agent tab */}
          <button
            onClick={onAddChatTab}
            title="Deploy new Agent / Subagent Tab"
            className="p-1.5 hover:bg-surface-hover rounded-md text-slate-400 hover:text-indigo-300 transition-colors ml-0.5"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Active Directory Badge, Search & History Summary Toggle */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {/* Active Workspace Directory Badge */}
          <div 
            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-surface/80 border border-border/60 text-slate-300 text-[10px]"
            title={`Active Working Directory: ${workspace?.workspacePath || 'D:\\AntiG'}`}
          >
            <Folder className="w-3 h-3 text-indigo-400" />
            <span className="truncate max-w-[120px] font-semibold text-slate-200">
              {workspace?.name || 'AntiG'}
            </span>
          </div>

          {/* Chat Search Toggle Button */}
          <button
            type="button"
            onClick={() => setShowChatSearch(!showChatSearch)}
            title="Search conversation (Ctrl+F)"
            className={`p-1.5 rounded text-slate-300 transition-colors border ${
              showChatSearch
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-surface border-border/60 hover:bg-surface-hover hover:text-white'
            }`}
          >
            <Search className="w-3 h-3" />
          </button>

          {/* History Summary Button */}
          <button
            type="button"
            onClick={() => setShowHistoryTray(!showHistoryTray)}
            title="Toggle inline conversation history summary"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono transition-all border ${
              showHistoryTray
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 font-semibold shadow-sm'
                : 'bg-surface border-border/60 text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            }`}
          >
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>History ({summary?.totalSteps || 0})</span>
            {showHistoryTray ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* 2. CHAT SEARCH BAR STRIP */}
      {showChatSearch && (
        <div className="px-4 py-2 border-b border-border/80 bg-[#090d14] flex items-center justify-between gap-3 text-xs animate-fadeIn select-none">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={chatSearchQuery}
              onChange={(e) => {
                setChatSearchQuery(e.target.value);
                setActiveMatchIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.shiftKey) handlePrevMatch();
                  else handleNextMatch();
                } else if (e.key === 'Escape') {
                  setShowChatSearch(false);
                }
              }}
              placeholder="Find in chat or terminal outputs..."
              className="w-full bg-surface border border-border/80 rounded px-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            {chatSearchQuery && (
              <span>
                {matchingMessageIndices.length > 0 
                  ? `${activeMatchIndex + 1} of ${matchingMessageIndices.length}` 
                  : '0 matches'}
              </span>
            )}
            <button
              onClick={handlePrevMatch}
              disabled={matchingMessageIndices.length === 0}
              title="Previous Match (Shift+Enter)"
              className="p-1 rounded bg-surface border border-border/60 hover:bg-surface-hover disabled:opacity-30 text-slate-300"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={matchingMessageIndices.length === 0}
              title="Next Match (Enter)"
              className="p-1 rounded bg-surface border border-border/60 hover:bg-surface-hover disabled:opacity-30 text-slate-300"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setShowChatSearch(false);
                setChatSearchQuery('');
              }}
              className="p-1 rounded hover:bg-surface text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 3. INLINE EMBEDDED HISTORY TRAY */}
      {showHistoryTray && (
        <div className="border-b border-border/80 bg-[#0d121a] max-h-72 overflow-y-auto p-4 space-y-3 font-mono text-xs select-none shadow-inner animate-fadeIn">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-border/40">
              <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <History className="w-3.5 h-3.5" />
                Session Summary & Changes ({selectedSessionId?.slice(0, 8)}...)
              </span>
              <span>Updated: {lastUpdated}</span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="p-1.5 rounded bg-surface border border-border/60 text-slate-300">
                Prompts: <strong className="text-white">{summary?.userPromptCount || 0}</strong>
              </div>
              <div className="p-1.5 rounded bg-surface border border-border/60 text-slate-300">
                Tools: <strong className="text-indigo-400">{Object.values(summary?.toolCounts || {}).reduce((a, b) => a + b, 0)}</strong>
              </div>
              <div className="p-1.5 rounded bg-surface border border-border/60 text-slate-300">
                Files: <strong className="text-emerald-400">{filesModified.length}</strong>
              </div>
            </div>

            {/* Files Modified */}
            {filesModified.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span>Files Modified & Created:</span>
                </div>
                <ul className="space-y-1 pl-1 text-[11px]">
                  {filesModified.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-slate-300">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <div className="flex-1 truncate">
                        <strong className="text-emerald-300">{item.file}</strong>
                        <span className="text-slate-400 ml-1">— {item.desc}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono shrink-0">{item.timestamp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Milestone Actions */}
            {bulletPoints.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-indigo-400" />
                  <span>Milestone Instructions & Actions:</span>
                </div>
                <ul className="space-y-1 pl-1 text-[11px]">
                  {bulletPoints.slice(0, 10).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-slate-300">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      <span className="text-slate-400 font-bold uppercase text-[9px] px-1 rounded bg-surface shrink-0">
                        {item.label}
                      </span>
                      <div className="flex-1 truncate text-slate-200">
                        {item.text}
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono shrink-0">{item.timestamp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. CHAT MESSAGES CONTAINER (AGENT CHAT + INLINE TERMINAL OUTPUTS) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.length === 0 && !isStreaming ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 text-slate-400 select-none py-12">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Antigravity Unified Console</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Chat with the AI or run terminal commands directly in this prompt box!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <button 
                  onClick={() => onRunShellCommand("git status")}
                  className="p-3 text-left rounded-lg bg-surface/60 hover:bg-surface border border-border transition-all text-xs hover:border-indigo-500/40"
                >
                  <div className="font-medium text-slate-200">⚡ git status</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Run repository status</div>
                </button>
                <button 
                  onClick={() => onRunShellCommand("npm run build")}
                  className="p-3 text-left rounded-lg bg-surface/60 hover:bg-surface border border-border transition-all text-xs hover:border-indigo-500/40"
                >
                  <div className="font-medium text-slate-200">⚡ npm run build</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Test project build</div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Completed Messages & Terminal Command Executions */}
              {messages.map((msg, idx) => {
                const isMatch = matchingMessageIndices.includes(idx);
                const isCurrentActiveMatch = isMatch && matchingMessageIndices[activeMatchIndex] === idx;

                // Terminal Execution Card
                if (msg.type === 'terminal') {
                  return (
                    <div 
                      key={idx}
                      ref={(el) => (messageRefs.current[idx] = el)}
                      className={`w-full ${isCurrentActiveMatch ? 'ring-2 ring-indigo-500 rounded-2xl p-1' : ''}`}
                    >
                      <TerminalCommandCard
                        command={msg.command}
                        output={msg.output}
                        exitCode={msg.exitCode}
                        duration={msg.duration}
                        isRunning={msg.isRunning}
                        onRerun={(cmd) => onRunShellCommand(cmd)}
                      />
                    </div>
                  );
                }

                // Standard Agent Message
                return (
                  <div 
                    key={idx} 
                    ref={(el) => (messageRefs.current[idx] = el)}
                    className={`flex gap-3 w-full transition-all ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    } ${isCurrentActiveMatch ? 'ring-2 ring-indigo-500 rounded-2xl p-1 bg-indigo-500/5' : ''}`}
                  >
                    {msg.role !== 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div 
                      className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-[85%] ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                          : 'bg-surface/90 border border-border text-slate-200 rounded-bl-none shadow-sm flex-1'
                      }`}
                    >
                      {/* Thought process */}
                      {msg.thoughts && (
                        <ThinkingBox thoughts={msg.thoughts} isThinking={false} />
                      )}

                      {/* Tool Calls */}
                      {msg.tools && msg.tools.length > 0 && (
                        <div className="space-y-1.5 my-2">
                          {msg.tools.map((tool) => (
                            <ToolCard key={tool.toolId || tool.name} tool={tool} />
                          ))}
                        </div>
                      )}

                      {/* Content */}
                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap font-mono">{msg.content}</div>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300 mt-0.5 shadow-sm">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Active Live Stream Message */}
              {isStreaming && currentStream && (
                <div className="flex gap-3 w-full justify-start animate-fadeIn">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>

                  <div className="p-3.5 rounded-xl text-xs leading-relaxed bg-surface/90 border border-indigo-500/30 text-slate-200 rounded-bl-none shadow-md flex-1 max-w-[85%]">
                    {/* Live Thinking */}
                    {(currentStream.thoughts || currentStream.isThinking) && (
                      <ThinkingBox thoughts={currentStream.thoughts} isThinking={currentStream.isThinking} />
                    )}

                    {/* Live Tool Executions */}
                    {currentStream.tools && currentStream.tools.length > 0 && (
                      <div className="space-y-1.5 my-2">
                        {currentStream.tools.map((tool) => (
                          <ToolCard key={tool.toolId || tool.name} tool={tool} />
                        ))}
                      </div>
                    )}

                    {/* Live Token Streaming */}
                    {currentStream.content ? (
                      <MarkdownRenderer content={currentStream.content} />
                    ) : (
                      !currentStream.isThinking && (
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                          <span>Generating response...</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={chatBottomRef} />
        </div>
      </div>

      {/* 5. UNIFIED PROMPT & TERMINAL INPUT BAR */}
      <div className="p-4 border-t border-border bg-surface/40 backdrop-blur select-none relative z-30">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto w-full bg-surface/95 border border-border rounded-xl p-2.5 space-y-2 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/40 transition-all shadow-sm relative">
          {/* Expanding Monospace Input */}
          <textarea
            ref={textareaRef}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              inputMode === 'shell'
                ? "Enter shell command... (e.g. npm run build, git status, dir)"
                : "Message Antigravity or type shell command ($ git status, npm test)..."
            }
            className="w-full bg-transparent border-0 text-xs text-white placeholder-slate-500 focus:outline-none resize-none font-mono px-1 py-0.5 leading-relaxed max-h-32"
          />

          {/* Bottom Toolbar: Mode Toggle, Model Selector, Thinking & Execute */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
            {/* Left Controls: Mode + Model + Thinking */}
            <div className="flex items-center gap-1.5">
              {/* Input Mode Toggle: Auto / Agent / Shell */}
              <div className="flex items-center bg-surface border border-border/70 rounded p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setInputMode('auto')}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    inputMode === 'auto' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Auto-detect AI prompt or shell command"
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('agent')}
                  className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-0.5 ${
                    inputMode === 'agent' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="AI Agent Chat Mode"
                >
                  <Bot className="w-2.5 h-2.5" />
                  <span>Agent</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('shell')}
                  className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-0.5 ${
                    inputMode === 'shell' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Terminal Shell Mode"
                >
                  <Terminal className="w-2.5 h-2.5" />
                  <span>Shell</span>
                </button>
              </div>

              {/* Model Dropdown (when not in pure shell mode) */}
              {inputMode !== 'shell' && (
                <div className="relative" ref={modelDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModelDropdownOpen(!isModelDropdownOpen);
                      setIsThinkingDropdownOpen(false);
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-all text-[10px] ${
                      isModelDropdownOpen 
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200' 
                        : 'bg-surface border-border/70 text-slate-300 hover:text-white hover:border-indigo-500/40'
                    }`}
                  >
                    <Cpu className="w-3 h-3 text-indigo-400" />
                    <span className="font-medium text-slate-200">{currentModelName}</span>
                    <ChevronDown className={`w-2.5 h-2.5 text-slate-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isModelDropdownOpen && (
                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#0a0e17] border border-border/90 rounded-xl shadow-2xl p-1.5 z-50 space-y-0.5 animate-fadeIn">
                      <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                        <span>Select Model</span>
                        <Cpu className="w-3 h-3 text-indigo-400" />
                      </div>
                      {AVAILABLE_MODELS.map((model) => {
                        const isSelected = selectedModel === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model.id);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors text-[11px] flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                                : 'text-slate-300 hover:bg-surface-hover hover:text-white'
                            }`}
                          >
                            <div className="truncate mr-1">
                              <div className="font-medium">{model.name}</div>
                              <div className="text-[9px] opacity-75 font-sans truncate">{model.desc}</div>
                            </div>
                            {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Thinking Effort Dropdown */}
              {inputMode !== 'shell' && (
                <div className="relative" ref={thinkingDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsThinkingDropdownOpen(!isThinkingDropdownOpen);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-all text-[10px] ${
                      isThinkingDropdownOpen
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                        : 'bg-surface border-border/70 text-slate-300 hover:text-white hover:border-indigo-500/40'
                    }`}
                  >
                    <Brain className="w-3 h-3 text-indigo-400" />
                    <span>{currentThinkingLabel}</span>
                    <ChevronDown className={`w-2.5 h-2.5 text-slate-400 transition-transform ${isThinkingDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isThinkingDropdownOpen && (
                    <div className="absolute left-0 bottom-full mb-2 w-56 bg-[#0a0e17] border border-border/90 rounded-xl shadow-2xl p-1.5 z-50 space-y-0.5 animate-fadeIn">
                      <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                        <span>Thinking Effort</span>
                        <Brain className="w-3 h-3 text-indigo-400" />
                      </div>
                      {THINKING_EFFORTS.map((effort) => {
                        const isSelected = thinkingEffort === effort.id;
                        return (
                          <button
                            key={effort.id}
                            type="button"
                            onClick={() => {
                              setThinkingEffort(effort.id);
                              setIsThinkingDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors text-[11px] flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                                : 'text-slate-300 hover:bg-surface-hover hover:text-white'
                            }`}
                          >
                            <div className="truncate mr-1">
                              <div className="font-medium">{effort.label}</div>
                              <div className="text-[9px] opacity-75 font-sans truncate">{effort.desc}</div>
                            </div>
                            {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Send / Stop Action Button */}
            <div className="flex items-center">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStream}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-sm font-mono h-7"
                >
                  <StopCircle className="w-3 h-3" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputPrompt.trim()}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-sm font-mono h-7"
                >
                  <span>{inputMode === 'shell' ? 'Run' : 'Send'}</span>
                  {inputMode === 'shell' ? <Terminal className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
