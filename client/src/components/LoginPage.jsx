import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Bot, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Mail, 
  Lock, 
  Cpu, 
  Terminal, 
  Layers
} from 'lucide-react';
import { getSystemHealth, getUsage } from '../services/api';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('dscaduada@gmail.com');
  const [isLoading, setIsLoading] = useState(false);
  const [cliStatus, setCliStatus] = useState({ checking: true, connected: false, quota: null });
  const [error, setError] = useState('');

  // Check CLI connection & live quota on load
  useEffect(() => {
    async function checkCli() {
      try {
        const [health, usage] = await Promise.all([
          getSystemHealth().catch(() => null),
          getUsage().catch(() => null)
        ]);

        setCliStatus({
          checking: false,
          connected: health?.status === 'ok' || Boolean(usage),
          quota: usage
        });
      } catch (e) {
        setCliStatus({ checking: false, connected: false, quota: null });
      }
    }
    checkCli();
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your Gmail / Google account address.');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address (e.g. user@gmail.com).');
      return;
    }

    setIsLoading(true);

    // Simulate authenticating Google OAuth session with local agy CLI
    setTimeout(() => {
      setIsLoading(false);
      const userObj = {
        email: email.trim(),
        name: email.split('@')[0],
        avatarUrl: null,
        provider: 'google',
        loginTime: Date.now()
      };
      onLogin(userObj);
    }, 600);
  };

  const handleGoogleQuickSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const userObj = {
        email: email.trim() || 'dscaduada@gmail.com',
        name: (email.trim() || 'dscaduada@gmail.com').split('@')[0],
        avatarUrl: null,
        provider: 'google',
        loginTime: Date.now()
      };
      onLogin(userObj);
    }, 500);
  };

  const gemini5h = cliStatus.quota?.fiveHourRemainingPercent ?? 52;
  const geminiW = cliStatus.quota?.weeklyRemainingPercent ?? 91;

  return (
    <div className="h-screen w-screen bg-[#070a10] text-slate-100 font-mono flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="max-w-md w-full bg-[#0d121c]/90 border border-border/80 rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-xl relative z-10 space-y-6 animate-fadeIn">
        
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
            Localhost Web GUI & Multi-Agent Workspace for <code className="text-indigo-300 font-semibold">agy.exe</code>
          </p>
        </div>

        {/* Live CLI Connection & Quota Status Badge */}
        <div className="p-3 rounded-xl bg-surface/70 border border-border/60 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>CLI Engine:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cliStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-semibold text-slate-200">
                {cliStatus.checking ? 'Detecting CLI...' : cliStatus.connected ? 'agy.exe Ready' : 'Standby'}
              </span>
            </div>
          </div>

          {cliStatus.connected && (
            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-slate-400">
              <span>Remaining Quota:</span>
              <span className="text-indigo-300 font-semibold font-mono">
                {gemini5h}% (5h) • {geminiW}% (Weekly)
              </span>
            </div>
          )}
        </div>

        {/* Google One-Click Sign-In Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleQuickSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-sans font-semibold text-xs transition-all shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {/* Official Google 'G' Multi-Color SVG Logo */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google Account'}</span>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="h-px bg-border/60 flex-1" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">or sign in with email</span>
            <div className="h-px bg-border/60 flex-1" />
          </div>

          {/* Email / Gmail Input Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                Gmail / Workspace Account:
              </label>
              <div className="relative flex items-center">
                <Mail className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. your-account@gmail.com"
                  className="w-full bg-surface border border-border/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>
            </div>

            {error && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <span>{isLoading ? 'Authenticating...' : 'Access Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Feature Highlights Footer */}
        <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Local Session Auth</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
            <span>0 Added Token Cost</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-indigo-400 shrink-0" />
            <span>Unified Terminal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-purple-400 shrink-0" />
            <span>Multi-Agent Tabs</span>
          </div>
        </div>

      </div>
    </div>
  );
}
