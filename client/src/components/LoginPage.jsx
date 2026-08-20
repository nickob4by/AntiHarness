import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  ShieldCheck, 
  ShieldAlert,
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Cpu, 
  Terminal, 
  Layers,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { getAuthStatus, triggerCliLogin } from '../services/api';

export default function LoginPage({ onLogin }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggeringLogin, setIsTriggeringLogin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const [cliState, setCliState] = useState({
    checking: true,
    connected: false,
    authenticated: false,
    cliVersion: 'agy CLI',
    binaryPath: 'agy',
    quota: null,
    lastChecked: null,
  });

  const failureCountRef = useRef(0);
  const isPollingRef = useRef(false);
  const pollTimerRef = useRef(null);

  // Check AGY CLI authentication status
  const checkStatus = async (force = false) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const auth = await getAuthStatus(force);
      failureCountRef.current = 0;

      const isAuthed = Boolean(auth.authenticated);
      const isConn = Boolean(auth.cliConnected);

      setCliState({
        checking: false,
        connected: isConn,
        authenticated: isAuthed,
        cliVersion: auth.cliVersion || 'agy CLI',
        binaryPath: auth.binaryPath || 'agy',
        quota: auth.quota,
        lastChecked: Date.now(),
      });
    } catch (err) {
      failureCountRef.current += 1;
      if (failureCountRef.current >= 3) {
        setCliState((prev) => ({
          ...prev,
          checking: false,
          connected: false,
          authenticated: false,
          lastChecked: Date.now(),
        }));
      }
    } finally {
      isPollingRef.current = false;
    }
  };

  useEffect(() => {
    let isMounted = true;
    checkStatus(true);

    const poll = async () => {
      if (!isMounted) return;
      await checkStatus(false);
      if (isMounted) {
        pollTimerRef.current = setTimeout(poll, 4000);
      }
    };

    pollTimerRef.current = setTimeout(poll, 4000);

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Trigger CLI Login via backend command
  const handleTriggerCliLogin = async () => {
    setError('');
    setIsTriggeringLogin(true);
    try {
      await triggerCliLogin();
      setTimeout(() => {
        checkStatus(true);
        setIsTriggeringLogin(false);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to launch agy login command');
      setIsTriggeringLogin(false);
    }
  };

  // Open Google Gemini Web Sign In in browser
  const handleOpenGeminiLogin = () => {
    window.open('https://gemini.google.com/', '_blank');
  };

  // Copy agy login command helper
  const handleCopyCommand = () => {
    navigator.clipboard?.writeText('agy login');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Final Step: Launch Harness
  const handleEnterHarness = (e) => {
    e?.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const userObj = {
        name: 'Developer',
        provider: 'google',
        cliVersion: cliState.cliVersion,
        loginTime: Date.now()
      };
      onLogin(userObj);
    }, 300);
  };

  const gemini5h = cliState.quota?.fiveHourRemainingPercent ?? 52;
  const geminiW = cliState.quota?.weeklyRemainingPercent ?? 91;

  return (
    <div className="h-screen w-screen bg-[#070a10] text-slate-100 font-mono flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Ambience Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="max-w-lg w-full bg-[#0d121c]/95 border border-border/80 rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-xl relative z-10 space-y-5 animate-fadeIn">
        
        {/* Antigravity Logo & Branding Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 shadow-inner mb-0.5">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>AntiHarness Gateway</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-normal">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Ready to deploy with <span className="text-indigo-300 font-semibold font-mono">{cliState.cliVersion}</span> & <span className="text-purple-300 font-semibold font-sans">Gemini Chat</span>
          </p>
        </div>

        {/* Dual Connection Status Cards */}
        <div className="space-y-3">
          
          {/* 1. AGY CLI ENGINE STATUS */}
          <div className="p-3.5 rounded-xl bg-surface/70 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Antigravity CLI Engine</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Autonomous coding agent, tools, & workspace patcher.</p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1.5 ${
                cliState.connected 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cliState.connected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <span>{cliState.connected ? 'Connected' : 'Connecting...'}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleTriggerCliLogin}
                disabled={isTriggeringLogin}
                className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                {isTriggeringLogin ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Opening CLI Auth...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Sign In / Switch CLI Account</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyCommand}
                className="py-2 px-3 rounded-lg bg-[#080c14] hover:bg-surface border border-border/80 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy 'agy login' command"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span className="text-[11px]">{copied ? 'Copied' : 'agy login'}</span>
              </button>
            </div>
          </div>

          {/* 2. GOOGLE GEMINI PRO STATUS */}
          <div className="p-3.5 rounded-xl bg-surface/70 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Google Gemini Chat Mode</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Fast conversational reasoning, Q&A, and brainstorming.</p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/40 border border-purple-500/40 text-purple-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Ready ✨</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenGeminiLogin}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Open Google Gemini Sign-In</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Live Quota Status Indicator */}
        <div className="p-3 rounded-xl bg-[#090d16] border border-border/60 grid grid-cols-2 gap-2.5 text-[10px]">
          <div>
            <div className="text-slate-400 flex items-center justify-between mb-1">
              <span>CLI 5-Hour Limit:</span>
              <span className="font-bold text-indigo-300 font-mono">{gemini5h}% Left</span>
            </div>
            <div className="w-full bg-surface-hover h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${gemini5h}%` }} />
            </div>
          </div>

          <div>
            <div className="text-slate-400 flex items-center justify-between mb-1">
              <span>Weekly Quota:</span>
              <span className="font-bold text-purple-300 font-mono">{geminiW}% Left</span>
            </div>
            <div className="w-full bg-surface-hover h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${geminiW}%` }} />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
            {error}
          </div>
        )}

        {/* Enter Harness Primary Button */}
        <form onSubmit={handleEnterHarness}>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-sans font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/25 active:scale-[0.99] cursor-pointer"
          >
            <span>{isLoading ? 'Connecting Workspace...' : 'Launch AntiHarness Workspace'}</span>
            <ArrowRight className="w-4 h-4 text-indigo-200" />
          </button>
        </form>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Localhost Bridge Active</span>
          </div>
          <button
            type="button"
            onClick={() => checkStatus(true)}
            className="hover:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer text-slate-400"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Status</span>
          </button>
        </div>

      </div>
    </div>
  );
}



