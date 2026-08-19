import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

export class TerminalRunner {
  constructor(ws, cwd = process.cwd()) {
    this.ws = ws;
    this.cwd = cwd;
    this.inputBuffer = '';
    this.history = [];
    this.historyIndex = -1;
    this.activeChild = null;
    this.init();
  }

  getPrompt() {
    return `\x1b[1;36mPS ${this.cwd}>\x1b[0m `;
  }

  init() {
    // Send Welcome Banner & initial prompt
    setTimeout(() => {
      this.sendOutput(`\x1b[1;34m╔════════════════════════════════════════════════════════════════╗\x1b[0m\r\n`);
      this.sendOutput(`\x1b[1;34m║\x1b[0m  \x1b[1;36mAntigravity Localhost Harness — Interactive Shell Terminal\x1b[0m    \x1b[1;34m║\x1b[0m\r\n`);
      this.sendOutput(`\x1b[1;34m║\x1b[0m  \x1b[90mWorkspace: ${this.cwd.padEnd(50)}\x1b[0m\x1b[1;34m║\x1b[0m\r\n`);
      this.sendOutput(`\x1b[1;34m╚════════════════════════════════════════════════════════════════╝\x1b[0m\r\n\r\n`);
      this.sendOutput(this.getPrompt());
    }, 100);
  }

  handleInput(data) {
    // If a child command is actively executing and reading input
    if (this.activeChild && this.activeChild.stdin.writable) {
      if (data === '\x03') { // Ctrl+C
        try {
          this.activeChild.kill('SIGINT');
        } catch (e) {}
        this.sendOutput(`^C\r\n`);
        this.activeChild = null;
        this.sendOutput(this.getPrompt());
      } else {
        this.activeChild.stdin.write(data);
      }
      return;
    }

    // Handle interactive command line editing
    // 1. Backspace (\x7f or \x08)
    if (data === '\x7f' || data === '\x08') {
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.sendOutput('\b \b');
      }
      return;
    }

    // 2. Ctrl+C (\x03)
    if (data === '\x03') {
      this.inputBuffer = '';
      this.sendOutput(`^C\r\n${this.getPrompt()}`);
      return;
    }

    // 3. Ctrl+L (\x0c) - Clear Screen
    if (data === '\x0c') {
      this.sendOutput(`\x1b[2J\x1b[3J\x1b[H${this.getPrompt()}${this.inputBuffer}`);
      return;
    }

    // 4. Up Arrow (\x1b[A) - Command History Prev
    if (data === '\x1b[A') {
      if (this.history.length > 0) {
        const newIndex = this.historyIndex === -1 ? this.history.length - 1 : Math.max(0, this.historyIndex - 1);
        this.historyIndex = newIndex;
        this.replaceInputLine(this.history[newIndex]);
      }
      return;
    }

    // 5. Down Arrow (\x1b[B) - Command History Next
    if (data === '\x1b[B') {
      if (this.historyIndex !== -1) {
        const newIndex = this.historyIndex + 1;
        if (newIndex >= this.history.length) {
          this.historyIndex = -1;
          this.replaceInputLine('');
        } else {
          this.historyIndex = newIndex;
          this.replaceInputLine(this.history[newIndex]);
        }
      }
      return;
    }

    // 6. Enter (\r or \n) - Execute Command
    if (data === '\r' || data === '\n') {
      this.sendOutput('\r\n');
      const cmd = this.inputBuffer.trim();
      this.inputBuffer = '';
      this.historyIndex = -1;

      if (!cmd) {
        this.sendOutput(this.getPrompt());
        return;
      }

      this.history.push(cmd);
      this.executeCommand(cmd);
      return;
    }

    // 7. Regular characters / pasted text
    if (data.length > 0) {
      // Filter out unhandled escape sequences
      if (data.startsWith('\x1b') && data.length > 1) {
        return;
      }
      this.inputBuffer += data;
      this.sendOutput(data);
    }
  }

  replaceInputLine(newLine) {
    // Clear current line from cursor backwards
    let clearSeq = '';
    for (let i = 0; i < this.inputBuffer.length; i++) {
      clearSeq += '\b \b';
    }
    this.inputBuffer = newLine;
    this.sendOutput(clearSeq + newLine);
  }

  executeCommand(commandLine) {
    const isWindows = process.platform === 'win32';

    // Handle cd command internally
    if (commandLine.startsWith('cd ') || commandLine === 'cd') {
      const targetDir = commandLine.slice(3).trim();
      if (!targetDir) {
        this.sendOutput(`${this.cwd}\r\n${this.getPrompt()}`);
        return;
      }

      try {
        const resolved = path.resolve(this.cwd, targetDir);
        this.cwd = resolved;
        this.sendOutput(`${this.getPrompt()}`);
      } catch (err) {
        this.sendOutput(`\x1b[31mDirectory not found: ${targetDir}\x1b[0m\r\n${this.getPrompt()}`);
      }
      return;
    }

    // Handle clear / cls
    if (commandLine === 'clear' || commandLine === 'cls') {
      this.sendOutput(`\x1b[2J\x1b[3J\x1b[H${this.getPrompt()}`);
      return;
    }

    const shell = isWindows ? 'powershell.exe' : (process.env.SHELL || 'bash');
    const shellArgs = isWindows ? ['-NoLogo', '-Command', commandLine] : ['-c', commandLine];

    try {
      this.activeChild = spawn(shell, shellArgs, {
        cwd: this.cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
      });

      this.activeChild.stdout.on('data', (chunk) => {
        const text = chunk.toString('utf-8').replace(/\n/g, '\r\n');
        this.sendOutput(text);
      });

      this.activeChild.stderr.on('data', (chunk) => {
        const text = chunk.toString('utf-8').replace(/\n/g, '\r\n');
        this.sendOutput(text);
      });

      this.activeChild.on('close', (code) => {
        this.activeChild = null;
        this.sendOutput(this.getPrompt());
      });

      this.activeChild.on('error', (err) => {
        this.activeChild = null;
        this.sendOutput(`\x1b[31mCommand execution error: ${err.message}\x1b[0m\r\n${this.getPrompt()}`);
      });
    } catch (err) {
      this.activeChild = null;
      this.sendOutput(`\x1b[31mFailed to launch command: ${err.message}\x1b[0m\r\n${this.getPrompt()}`);
    }
  }

  write(data) {
    this.handleInput(data);
  }

  setCwd(newCwd) {
    this.cwd = newCwd;
    this.sendOutput(`\r\n\x1b[90mWorkspace changed to: ${this.cwd}\x1b[0m\r\n${this.getPrompt()}`);
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
    if (this.activeChild) {
      try {
        this.activeChild.kill('SIGINT');
      } catch (e) {}
      this.activeChild = null;
    }
  }
}
