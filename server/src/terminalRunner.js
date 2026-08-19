import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

export class TerminalRunner {
  constructor(ws, cwd = process.cwd()) {
    this.ws = ws;
    this.cwd = cwd;
    this.shellProcess = null;
    this.init();
  }

  init() {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'powershell.exe' : (process.env.SHELL || 'bash');
    const args = isWindows ? ['-NoLogo'] : [];

    try {
      this.shellProcess = spawn(shell, args, {
        cwd: this.cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.shellProcess.stdout.on('data', (chunk) => {
        this.sendOutput(chunk.toString('utf-8'));
      });

      this.shellProcess.stderr.on('data', (chunk) => {
        this.sendOutput(chunk.toString('utf-8'));
      });

      this.shellProcess.on('close', (code) => {
        this.sendOutput(`\r\n\x1b[33m[Process exited with code ${code}]\x1b[0m\r\n`);
      });

      this.shellProcess.on('error', (err) => {
        this.sendOutput(`\r\n\x1b[31m[Terminal Error: ${err.message}]\x1b[0m\r\n`);
      });

      // Welcome Banner in terminal
      setTimeout(() => {
        this.sendOutput(`\x1b[1;34m╔════════════════════════════════════════════════════════════════╗\x1b[0m\r\n`);
        this.sendOutput(`\x1b[1;34m║\x1b[0m  \x1b[1;36mAntigravity Localhost Harness — Interactive Shell Terminal\x1b[0m    \x1b[1;34m║\x1b[0m\r\n`);
        this.sendOutput(`\x1b[1;34m║\x1b[0m  \x1b[90mWorkspace: ${this.cwd.padEnd(50)}\x1b[0m\x1b[1;34m║\x1b[0m\r\n`);
        this.sendOutput(`\x1b[1;34m╚════════════════════════════════════════════════════════════════╝\x1b[0m\r\n\r\n`);
      }, 100);
    } catch (err) {
      console.error('Failed to spawn terminal shell:', err);
      this.sendOutput(`\r\n\x1b[31m[Failed to start shell: ${err.message}]\x1b[0m\r\n`);
    }
  }

  write(data) {
    if (this.shellProcess && this.shellProcess.stdin.writable) {
      this.shellProcess.stdin.write(data);
    }
  }

  setCwd(newCwd) {
    if (this.cwd !== newCwd) {
      this.cwd = newCwd;
      if (this.shellProcess) {
        try {
          this.shellProcess.kill();
        } catch (e) {
          // ignore
        }
      }
      this.init();
    }
  }

  sendOutput(data) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({
        type: 'TERMINAL_OUTPUT',
        payload: { data },
      }));
    }
  }

  destroy() {
    if (this.shellProcess) {
      try {
        this.shellProcess.kill();
      } catch (e) {
        // ignore
      }
      this.shellProcess = null;
    }
  }
}
