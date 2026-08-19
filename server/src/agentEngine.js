import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { recordPromptUsage } from './routes/system.js';

import { getRootWorkspace } from './routes/workspace.js';

// Store active agent stream runners
const activeRuns = new Map();

export class AgentEngine {
  constructor(ws, sessionId) {
    this.ws = ws;
    this.sessionId = sessionId || `session-${Date.now()}`;
    this.isAborted = false;
    this.childProcess = null;
  }

  abort() {
    this.isAborted = true;
    if (this.childProcess) {
      try {
        this.childProcess.kill('SIGINT');
      } catch (e) {
        // ignore
      }
      this.childProcess = null;
    }
    activeRuns.delete(this.sessionId);
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === 1 && !this.isAborted) {
      this.ws.send(JSON.stringify({ type, sessionId: this.sessionId, payload }));
    }
  }

  async runPrompt(prompt, workspacePath, model = 'Gemini 3.7 Flash', options = {}) {
    activeRuns.set(this.sessionId, this);
    this.isAborted = false;

    const resolvedWorkspace = path.resolve(workspacePath || getRootWorkspace());
    console.log(`[AgentEngine] Spawning agy for session ${this.sessionId} in cwd: ${resolvedWorkspace}`);

    this.send('AGENT_STREAM_START', {
      prompt,
      model,
      workspacePath: resolvedWorkspace,
      timestamp: Date.now(),
    });

    // Notify client of initial thinking phase
    this.send('AGENT_THOUGHT_START', { timestamp: Date.now() });

    // Map UI model names to agy CLI arguments
    const args = ['-p', prompt, '--dangerously-skip-permissions'];

    const normalizedModel = (model || '').toLowerCase();
    if (normalizedModel.includes('thinking')) {
      args.push('--effort', 'high');
    } else if (options.thinkingEffort && options.thinkingEffort !== 'off') {
      const effortMap = { low: 'low', medium: 'medium', high: 'high' };
      if (effortMap[options.thinkingEffort]) {
        args.push('--effort', effortMap[options.thinkingEffort]);
      }
    }

    // Determine agy binary path
    const isWindows = process.platform === 'win32';
    const defaultAgyWindows = path.join(os.homedir(), 'AppData', 'Local', 'agy', 'bin', 'agy.exe');
    const agyBin = isWindows && fs.existsSync(defaultAgyWindows) ? defaultAgyWindows : 'agy';

    let accumulatedOutput = '';
    let thoughtBuffer = '';
    let isThinking = true;

    try {
      this.childProcess = spawn(agyBin, args, {
        cwd: resolvedWorkspace,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
        },
      });

      this.childProcess.stdout.on('data', (chunk) => {
        if (this.isAborted) return;
        const text = chunk.toString('utf-8');

        // End thinking indicator once real text starts arriving
        if (isThinking && text.trim().length > 0) {
          isThinking = false;
          this.send('AGENT_THOUGHT_END', { timestamp: Date.now() });
        }

        accumulatedOutput += text;
        this.send('AGENT_STREAM_CHUNK', { text });
      });

      this.childProcess.stderr.on('data', (chunk) => {
        if (this.isAborted) return;
        const errText = chunk.toString('utf-8');
        // If it's diagnostic info or thinking logs
        if (isThinking) {
          thoughtBuffer += errText;
          this.send('AGENT_THOUGHT_CHUNK', { text: errText });
        }
      });

      this.childProcess.on('close', (code) => {
        this.childProcess = null;
        if (this.isAborted) return;

        if (isThinking) {
          this.send('AGENT_THOUGHT_END', { timestamp: Date.now() });
        }

        // Record real usage update
        recordPromptUsage();

        const finalContent = accumulatedOutput.trim() || `(No output returned from agent, exit code ${code})`;

        this.send('AGENT_STREAM_END', {
          completeResponse: finalContent,
          timestamp: Date.now(),
        });

        activeRuns.delete(this.sessionId);
      });

      this.childProcess.on('error', (err) => {
        this.childProcess = null;
        if (this.isAborted) return;

        console.error('Failed to spawn agy process:', err);
        // Fallback response with helpful error
        const errorMsg = `⚠️ **Antigravity CLI Error**: Could not launch \`${agyBin}\`: ${err.message}\n\n*Make sure \`agy\` is installed and accessible on your system PATH.*`;
        this.send('AGENT_STREAM_ERROR', { error: errorMsg });
        activeRuns.delete(this.sessionId);
      });

    } catch (err) {
      activeRuns.delete(this.sessionId);
      this.send('AGENT_STREAM_ERROR', { error: err.message });
    }
  }
}

export function stopSession(sessionId) {
  if (activeRuns.has(sessionId)) {
    const run = activeRuns.get(sessionId);
    run.abort();
    activeRuns.delete(sessionId);
    return true;
  }
  return false;
}
