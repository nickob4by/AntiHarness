import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Store active agent stream runners
const activeRuns = new Map();

export class AgentEngine {
  constructor(ws, sessionId) {
    this.ws = ws;
    this.sessionId = sessionId || `session-${Date.now()}`;
    this.isAborted = false;
  }

  abort() {
    this.isAborted = true;
    if (activeRuns.has(this.sessionId)) {
      const run = activeRuns.get(this.sessionId);
      if (run.process) {
        try {
          run.process.kill();
        } catch (e) {
          // ignore
        }
      }
      activeRuns.delete(this.sessionId);
    }
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === 1 && !this.isAborted) {
      this.ws.send(JSON.stringify({ type, sessionId: this.sessionId, payload }));
    }
  }

  async runPrompt(prompt, workspacePath = process.cwd(), model = 'Gemini 3.7 Flash') {
    activeRuns.set(this.sessionId, this);
    this.isAborted = false;

    this.send('AGENT_STREAM_START', {
      prompt,
      model,
      timestamp: Date.now(),
    });

    try {
      // Step 1: Emit thinking / reasoning stream
      this.send('AGENT_THOUGHT_START', { timestamp: Date.now() });

      const thoughts = [
        `Analyzing user instruction: "${prompt}"...`,
        `Inspecting workspace context at ${workspacePath}...`,
        `Formulating execution plan and identifying necessary tool operations...`,
      ];

      for (const thought of thoughts) {
        if (this.isAborted) return;
        await new Promise((r) => setTimeout(r, 200));
        this.send('AGENT_THOUGHT_CHUNK', { text: `${thought}\n` });
      }

      this.send('AGENT_THOUGHT_END', { timestamp: Date.now() });

      // Step 2: Determine if tool invocation is simulated or matched
      const lowerPrompt = prompt.toLowerCase();
      let toolToRun = null;

      if (lowerPrompt.includes('file') || lowerPrompt.includes('list') || lowerPrompt.includes('dir')) {
        toolToRun = {
          toolId: `tool-${Date.now()}-1`,
          name: 'list_dir',
          args: { DirectoryPath: workspacePath },
        };
      } else if (lowerPrompt.includes('health') || lowerPrompt.includes('status') || lowerPrompt.includes('system')) {
        toolToRun = {
          toolId: `tool-${Date.now()}-2`,
          name: 'check_system_health',
          args: { platform: process.platform, arch: process.arch },
        };
      } else if (lowerPrompt.includes('search') || lowerPrompt.includes('find')) {
        toolToRun = {
          toolId: `tool-${Date.now()}-3`,
          name: 'grep_search',
          args: { Query: prompt.split(' ').pop() || 'index', SearchPath: workspacePath },
        };
      }

      if (toolToRun) {
        if (this.isAborted) return;
        this.send('AGENT_TOOL_START', toolToRun);
        await new Promise((r) => setTimeout(r, 600));

        let toolOutput = '';
        if (toolToRun.name === 'list_dir') {
          try {
            const files = fs.readdirSync(workspacePath);
            toolOutput = JSON.stringify({ files, total: files.length }, null, 2);
          } catch (e) {
            toolOutput = JSON.stringify({ error: e.message });
          }
        } else if (toolToRun.name === 'check_system_health') {
          toolOutput = JSON.stringify({
            node: process.version,
            memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
            uptime: `${Math.round(process.uptime())}s`,
            status: 'HEALTHY'
          }, null, 2);
        } else {
          toolOutput = JSON.stringify({ matches: [], count: 0, status: 'DONE' }, null, 2);
        }

        this.send('AGENT_TOOL_RESULT', {
          toolId: toolToRun.toolId,
          name: toolToRun.name,
          output: toolOutput,
          status: 'SUCCESS',
        });
      }

      // Step 3: Stream main response tokens
      const fullResponse = this.generateResponse(prompt, workspacePath, toolToRun);
      const chunks = fullResponse.match(/.{1,12}/g) || [fullResponse];

      for (const chunk of chunks) {
        if (this.isAborted) return;
        await new Promise((r) => setTimeout(r, 25));
        this.send('AGENT_STREAM_CHUNK', { text: chunk });
      }

      this.send('AGENT_STREAM_END', {
        completeResponse: fullResponse,
        timestamp: Date.now(),
      });
    } catch (err) {
      if (!this.isAborted) {
        this.send('AGENT_STREAM_ERROR', { error: err.message });
      }
    } finally {
      activeRuns.delete(this.sessionId);
    }
  }

  generateResponse(prompt, workspacePath, toolRun) {
    if (toolRun && toolRun.name === 'list_dir') {
      return `I have inspected your workspace directory at \`${workspacePath}\`.\n\n### Workspace Overview\n- Directory is active and synced with the localhost harness.\n- All changes made in the harness will immediately reflect in your local filesystem.\n\nYou can ask me to create components, edit configuration files, or run commands anytime!`;
    }

    if (toolRun && toolRun.name === 'check_system_health') {
      return `### System & Harness Status\n\n- **Runtime**: Node.js \`${process.version}\`\n- **Platform**: \`${process.platform} (${process.arch})\`\n- **Gateway**: WebSocket Live on \`ws://localhost:3001/ws\`\n\nEverything is operating smoothly. What would you like to build next?`;
    }

    return `### Response\n\nI have processed your instruction: **"${prompt}"**.\n\nThe Antigravity Localhost Harness is streaming real-time tokens, tool cards, and reasoning directly to your browser interface.\n\n\`\`\`javascript\n// Real-time Agent Streaming Active\nconsole.log("Antigravity Harness Phase 2 is online!");\n\`\`\`\n\nFeel free to enter another instruction or inspect the files on the sidebar!`;
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
