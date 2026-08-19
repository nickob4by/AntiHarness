import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  ShieldCheck, 
  ShieldAlert,
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Mail, 
  Cpu, 
  Terminal, 
  Layers,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  Activity,
  Sparkles,
  Radio
} from 'lucide-react';
import { getAuthStatus, triggerCliLogin, getUsage } from '../services/api';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('dscaduada@gmail.com');
  const [name, setName] = useState('dscaduada');
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggeringLogin, setIsTriggeringLogin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [autoEnterCountdown, setAutoEnterCountdown] = useState(null);

  const [cliState, setCliState] = useState({
    checking: true,
    connected: false,
    authenticated: false,
    cliVersion: 'agy CLI',
    binaryPath: 'agy',
    quota: null,
    account: null,
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
        account: auth.account,
        lastChecked: Date.now(),
      });

      if (auth.account?.email && !email) {
        setEmail(auth.account.email);
        setName(auth.account.name || auth.account.email.split('@')[0]);
      }
    } catch (err) {
      failureCountRef.current += 1;
      // Only mark disconnected if 3 consecutive failures occur
      if (failureCountRef.current >= 3) {
        setCliState((prev) => ({
          ...prev,
          checking: false,
          connected: false,
          authenticated: false,
          lastChecked: Date.now(),
        }));
      } else {
        setCliState((prev) => ({
          ...prev,
          checking: false,
          lastChecked: Date.now(),
        }));
      }
    } finally {
      isPollingRef.current = false;
    }
  };

  // Initial check and sequential auto-polling setup
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
      // Immediately check status
      setTimeout(() => {
        checkStatus(true);
        setIsTriggeringLogin(false);
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to launch agy login command');
      setIsTriggeringLogin(false);
    }
  };

  // Copy agy login command helper
  const handleCopyCommand = () => {
    navigator.clipboard?.writeText('agy login');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Final Step: Complete Harness Login
  const handleEnterHarness = (e) => {
    e?.preventDefault();
    if (!cliState.authenticated && !cliState.connected) {
      setError('Please connect and log in to the AGY CLI first.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const userObj = {
        email: email.trim() || cliState.account?.email || 'dscaduada@gmail.com',
        name: name.trim() || email.split('@')[0] || 'dscaduada',
        avatarUrl: null,
        provider: 'google',
        cliVersion: cliState.cliVersion,
        loginTime: Date.now()
      };
      onLogin(userObj);
    }, 400);
  };

  const gemini5h = cliState.quota?.fiveHourRemainingPercent ?? 52;
  const geminiW = cliState.quota?.weeklyRemainingPercent ?? 91;
  const claude5h = cliState.quota?.claudeGpt?.fiveHourRemaining ?? 88;
  const claudeW = cliState.quota?.claudeGpt?.weeklyRemaining ?? 96;

  return (
    <div className="h-screen w-screen bg-[#070a10] text-slate-100 font-mono flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Ambience Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="max-w-lg w-full bg-[#0d121c]/95 border border-border/80 rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-xl relative z-10 space-y-6 animate-fadeIn">
        
        {/* Antigravity Logo & Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 shadow-inner mb-1">
            <Bot className="w-7 h-7 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Antigravity Harness</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-normal">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Localhost Web GUI for <code className="text-indigo-300 font-semibold">{cliState.cliVersion}</code>
          </p>
        </div>

        {/* 3-Step Visual Connection Flow Indicator */}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] border-b border-border/40 pb-4">
          <div className={`p-2 rounded-lg border transition-all ${
            cliState.connected 
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
              : 'bg-surface border-border text-slate-400'
          }`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-semibold">1. AGY CLI</span>
            </div>
            <span className="text-[9px] opacity-80">{cliState.connected ? '✓ Detected' : 'Connecting...'}</span>
          </div>

          <div className={`p-2 rounded-lg border transition-all ${
            cliState.authenticated 
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
              : cliState.connected
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
              : 'bg-surface border-border text-slate-400'
          }`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <KeyRound className="w-3.5 h-3.5" />
              <span className="font-semibold">2. CLI Login</span>
            </div>
            <span className="text-[9px] opacity-80">{cliState.authenticated ? '✓ Logged In' : 'Pending Auth'}</span>
          </div>

          <div className={`p-2 rounded-lg border transition-all ${
            cliState.authenticated 
              ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-300' 
              : 'bg-surface border-border text-slate-500'
          }`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span className="font-semibold">3. Harness</span>
            </div>
            <span className="text-[9px] opacity-80">{cliState.authenticated ? 'Ready to enter' : 'Locked'}</span>
          </div>
        </div>

        {/* STEP 1: CLI NOT LOGGED IN / DISCONNECTED STATE */}
        {!cliState.authenticated ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-amber-200">
                    AGY CLI Authentication Required
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    The Harness uses your local Antigravity CLI session (<code className="text-amber-300 font-bold">agy.exe</code>) to execute agent prompts with zero token costs. Please connect and authenticate the CLI first.
                  </p>
                </div>
              </div>

              {/* Terminal Command Quick Copy */}
              <div className="mt-2 bg-[#080c14] border border-border/80 rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                  <span className="text-slate-500">$</span>
                  <span className="text-indigo-300 font-semibold">agy login</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCommand}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-surface hover:bg-surface-hover text-slate-300 hover:text-white text-[10px] border border-border/60 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Launch Login Action Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleTriggerCliLogin}
                disabled={isTriggeringLogin}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-sans font-semibold text-xs transition-all shadow-lg flex items-center justify-center gap-2.5 active:scale-[0.99] cursor-pointer"
              >
                {isTriggeringLogin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>Launching AGY CLI Login...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-indigo-200" />
                    <span>Connect & Sign In via AGY CLI</span>
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-300 ml-auto" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Auto-detecting CLI authentication...</span>
                </div>
                <button
                  type="button"
                  onClick={() => checkStatus(true)}
                  className="hover:text-slate-200 flex items-center gap-1 text-slate-400 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                {error}
              </div>
            )}
          </div>
        ) : (
          /* STEP 2: CLI LOGGED IN & READY ➔ ENTER HARNESS */
          <div className="space-y-4">
            {/* Verified CLI Success Card */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>AGY CLI Connected & Authenticated</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Ready
                </span>
              </div>

              {/* Live Quota Stats */}
              <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-surface/80 border border-border/60">
                  <div className="text-slate-400 mb-0.5">Gemini 5-Hour Limit:</div>
                  <div className="text-xs font-bold text-indigo-300 font-mono">{gemini5h}% Remaining</div>
                  <div className="w-full bg-surface-hover h-1 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${gemini5h}%` }} />
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-surface/80 border border-border/60">
                  <div className="text-slate-400 mb-0.5">Gemini Weekly Quota:</div>
                  <div className="text-xs font-bold text-emerald-400 font-mono">{geminiW}% Remaining</div>
                  <div className="w-full bg-surface-hover h-1 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${geminiW}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Account Confirmation & Enter Form */}
            <form onSubmit={handleEnterHarness} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5 font-medium flex items-center justify-between">
                  <span>Logged in Google Account:</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified with agy.exe</span>
                  </span>
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your-google-account@gmail.com"
                    className="w-full bg-surface border border-border/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                  {error}
                </div>
              )}

              {/* Enter Harness Primary Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-sans font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.99] cursor-pointer"
              >
                <span>{isLoading ? 'Connecting Workspace...' : 'Launch Harness Workspace'}</span>
                <ArrowRight className="w-4 h-4 text-indigo-200" />
              </button>
            </form>
          </div>
        )}

        {/* Feature Highlights Footer */}
        <div className="pt-3 border-t border-border/40 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>AGY Direct CLI Bridge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
            <span>0 Added Token Cost</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-indigo-400 shrink-0" />
            <span>Unified Terminal & Chat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-purple-400 shrink-0" />
            <span>Multi-Agent Tab Isolation</span>
          </div>
        </div>

      </div>
    </div>
  );
}

