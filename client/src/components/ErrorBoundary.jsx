import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AntiHarness caught error in React component tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#070a10] text-slate-200 flex flex-col items-center justify-center p-6 font-mono select-none">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0d121c] border border-rose-500/40 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-white">Application Render Error</h2>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                A component encountered an issue during startup.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-border/60 text-left overflow-x-auto text-[11px] text-rose-300 font-mono max-h-40">
              {this.state.error?.toString() || 'Unknown Error'}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleReset}
                className="py-2 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-border/80 text-slate-400 hover:text-white text-xs transition-all"
                title="Clear local state & hard reload"
              >
                Clear Storage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
