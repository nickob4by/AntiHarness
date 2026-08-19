import React, { useState, useRef, useEffect } from 'react';
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
  Layers,
  Cpu,
  Brain,
  Zap,
  Sliders
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import ThinkingBox from './ThinkingBox';
import ToolCard from './ToolCard';

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
  messages,
  currentStream,
  onSendMessage,
  onStopStream,
  isStreaming,
  workspace
}) {
  const [inputPrompt, setInputPrompt] = useState('');
  const [showHistoryTray, setShowHistoryTray] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.7-flash');
  const [thinkingEffort, setThinkingEffort] = useState('medium');
  
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isThinkingDropdownOpen, setIsThinkingDropdownOpen] = useState(false);

  const chatBottomRef = useRef(null);
  const textareaRef = useRef(null);

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

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || isStreaming) return;
    const activeModelObj = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
    onSendMessage(inputPrompt, {
      model: activeModelObj?.name || 'Gemini 3.7 Flash',
      thinkingEffort,
    });
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

  const summary = selectedSessionTranscript?.summary;
  const lastUpdated = summary?.lastUpdated || 'Recent';
  const bulletPoints = summary?.bulletPoints || [];
  const filesModified = summary?.filesModified || [];

  const currentModelName = AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name || 'Gemini 3.7 Flash';
  const currentThinkingLabel = THINKING_EFFORTS.find((t) => t.id === thinkingEffort)?.label || 'Thinking: Medium';

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-background font-mono">
      {/* 1. CHAT HEADER CONTROLS (MODEL SELECTOR, THINKING EFFORT & HISTORY) */}
      <div className="h-10 px-3 border-b border-border/80 bg-surface/60 backdrop-blur flex items-center justify-between text-xs select-none z-20">
        {/* Left: Model & Thinking Effort Selectors */}
        <div className="flex items-center gap-2">
          {/* Model Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsModelDropdownOpen(!isModelDropdownOpen);
                setIsThinkingDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border/70 text-slate-200 hover:text-white hover:border-indigo-500/40 transition-all text-[11px]"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-100">{currentModelName}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isModelDropdownOpen && (
              <div 
                className="absolute left-0 top-full mt-1 w-64 bg-[#0e131d] border border-border rounded-xl shadow-2xl p-1.5 z-30 space-y-0.5 animate-fadeIn"
                onMouseLeave={() => setIsModelDropdownOpen(false)}
              >
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Select Model
                </div>
                {AVAILABLE_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors text-[11px] ${
                      selectedModel === model.id
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'text-slate-300 hover:bg-surface-hover hover:text-white'
                    }`}
                  >
                    <div className="font-medium">{model.name}</div>
                    <div className="text-[9px] opacity-75 font-sans truncate">{model.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thinking Effort Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsThinkingDropdownOpen(!isThinkingDropdownOpen);
                setIsModelDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border/70 text-slate-300 hover:text-white hover:border-indigo-500/40 transition-all text-[11px]"
            >
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              <span>{currentThinkingLabel}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isThinkingDropdownOpen && (
              <div 
                className="absolute left-0 top-full mt-1 w-56 bg-[#0e131d] border border-border rounded-xl shadow-2xl p-1.5 z-30 space-y-0.5 animate-fadeIn"
                onMouseLeave={() => setIsThinkingDropdownOpen(false)}
              >
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Thinking Effort
                </div>
                {THINKING_EFFORTS.map((effort) => (
                  <button
                    key={effort.id}
                    onClick={() => {
                      setThinkingEffort(effort.id);
                      setIsThinkingDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors text-[11px] ${
                      thinkingEffort === effort.id
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'text-slate-300 hover:bg-surface-hover hover:text-white'
                    }`}
                  >
                    <div className="font-medium">{effort.label}</div>
                    <div className="text-[9px] opacity-75 font-sans truncate">{effort.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Inline History Summary Toggle */}
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

      {/* 2. INLINE EMBEDDED HISTORY TRAY */}
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

      {/* 3. CHAT MESSAGES CONTAINER (ALIGNED TO MAX-W-3XL) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.length === 0 && !isStreaming ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 text-slate-400 select-none py-12">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Antigravity Localhost Harness</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Chat with the agent on the left, and review your workspace files in the right pane.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <button 
                  onClick={() => {
                    setInputPrompt("List files in the workspace and analyze project structure");
                  }}
                  className="p-3 text-left rounded-lg bg-surface/60 hover:bg-surface border border-border transition-all text-xs hover:border-indigo-500/40"
                >
                  <div className="font-medium text-slate-200">📁 List Files</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Inspect workspace folders</div>
                </button>
                <button 
                  onClick={() => {
                    setInputPrompt("Check system status, CPU, RAM and Node runtime");
                  }}
                  className="p-3 text-left rounded-lg bg-surface/60 hover:bg-surface border border-border transition-all text-xs hover:border-indigo-500/40"
                >
                  <div className="font-medium text-slate-200">⚡ Check Status</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">System diagnostics</div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Completed Messages */}
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
              ))}

              {/* Active Live Stream Message */}
              {isStreaming && currentStream && (
                <div className="flex gap-3 w-full justify-start animate-fadeIn">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>

                  <div className="p-3.5 rounded-xl text-xs leading-relaxed bg-surface/90 border border-indigo-500/30 text-slate-200 rounded-bl-none shadow-md flex-1 max-w-[85%]">
                    {/* Live Thinking */}
                    {currentStream.thoughts && (
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

      {/* 4. PROMPT INPUT BAR (ALIGNED & VERTICALLY CENTERED) */}
      <div className="p-4 border-t border-border bg-surface/40 backdrop-blur select-none">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto w-full flex items-center gap-2 bg-surface/90 border border-border rounded-xl px-3 py-2 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/40 transition-all shadow-sm">
          {/* Expanding Monospace Textarea */}
          <textarea
            ref={textareaRef}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message Antigravity or type a command... (Shift+Enter for newline)"
            className="flex-1 bg-transparent border-0 text-xs text-white placeholder-slate-500 focus:outline-none resize-none font-mono py-1 px-1 leading-relaxed max-h-32"
          />

          {/* Centered Action Button */}
          <div className="flex items-center shrink-0">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStream}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm font-mono h-8"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputPrompt.trim()}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm font-mono h-8"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
