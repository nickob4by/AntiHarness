import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { recordPromptUsage } from './routes/system.js';
import { getRootWorkspace } from './routes/workspace.js';
import { generateWorkspaceMap } from './services/graphEngine.js';
import { getAutoInjectedSlugs } from './routes/skills.js';
import { recordProjectUsage } from './services/projectUsage.js';

// Store active agent stream runners and mapped sessions
const activeRuns = new Map();
const mappedSessions = new Set();

// Helper to retrieve concise skill instructions for prompt injection
function loadSkillInstructions(slug, workspacePath) {
  const homeDir = os.homedir();
  const candidatePaths = [
    path.join(workspacePath, '.gemini', 'skills', slug, 'SKILL.md'),
    path.join(workspacePath, '.agy', 'skills', slug, 'SKILL.md'),
    path.join(homeDir, '.gemini', 'skills', slug, 'SKILL.md'),
    path.join(homeDir, '.gemini', 'antigravity-cli', 'builtin', 'skills', slug, 'SKILL.md'),
    path.join(homeDir, '.agy', 'skills', slug, 'SKILL.md'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        // Extract body or clean instructions (up to 800 chars per skill)
        const clean = raw.replace(/^---[\s\S]*?---\s*/, '').trim();
        return clean.substring(0, 800);
      } catch (e) {}
    }
  }
  return null;
}

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

    const isChatMode = options.mode === 'chat';
    const resolvedWorkspace = path.resolve(workspacePath || getRootWorkspace());
    console.log(`[AgentEngine] Spawning agy for session ${this.sessionId} (mode: ${isChatMode ? 'chat' : 'agent'}) in cwd: ${resolvedWorkspace}`);

    this.send('AGENT_STREAM_START', {
      prompt,
      model,
      mode: isChatMode ? 'chat' : 'agent',
      workspacePath: resolvedWorkspace,
      timestamp: Date.now(),
    });

    // Notify client of initial thinking phase with initial status
    this.send('AGENT_THOUGHT_START', { timestamp: Date.now() });

    let finalPrompt = prompt;

    if (isChatMode) {
      this.send('AGENT_THOUGHT_CHUNK', { 
        text: `> 💬 Gemini Chat Mode: Direct conversational stream (zero workspace scan overhead).\n` 
      });
    } else {
      this.send('AGENT_THOUGHT_CHUNK', { 
        text: `> 🤖 Antigravity Agent Mode: Analyzing workspace: \`${resolvedWorkspace}\`...\n` 
      });

      // Auto-inject Token-Saving Workspace Map & Auto-Injected Skills for this session
      if (!mappedSessions.has(this.sessionId)) {
        const promptSections = [];
        const injectedSkillNames = [];

        try {
          const wsMap = await generateWorkspaceMap(resolvedWorkspace, 4);
          if (wsMap?.compressedMap) {
            promptSections.push(`[WORKSPACE STRUCTURE & FILE TREE (TOKEN-OPTIMIZED)]:\n${wsMap.compressedMap}`);
            this.send('AGENT_THOUGHT_CHUNK', {
              text: `> 📁 Injected Workspace Map: ${wsMap.totalFiles} files indexed (~${wsMap.tokenStats.savingsPercent} exploratory token savings).\n`
            });
          }
        } catch (e) {
          console.error('[AgentEngine] Failed to generate workspace map:', e);
        }

        // Load and inject all enabled auto-injected skills
        try {
          const autoSlugs = getAutoInjectedSlugs();
          const activeSkillChunks = [];

          for (const slug of autoSlugs) {
            const instructions = loadSkillInstructions(slug, resolvedWorkspace);
            if (instructions) {
              injectedSkillNames.push(slug);
              activeSkillChunks.push(`### [SKILL: ${slug}]\n${instructions}`);
            }
          }

          if (activeSkillChunks.length > 0) {
            promptSections.push(`[ACTIVE SPECIALIZED SKILLS & AUTOMATION RULES]:\n${activeSkillChunks.join('\n\n')}`);
            this.send('AGENT_THOUGHT_CHUNK', {
              text: `> ⚡ Injected Auto-Skills: ${injectedSkillNames.join(', ')} (${injectedSkillNames.length} active).\n`
            });
          }
        } catch (e) {
          console.error('[AgentEngine] Failed to load auto-injected skills:', e);
        }

        if (promptSections.length > 0) {
          finalPrompt = `${promptSections.join('\n\n')}\n\n[USER INSTRUCTION]:\n${prompt}`;
        }

        mappedSessions.add(this.sessionId);
      }
    }

    // Caveman Output Compression
    if (options.cavemanMode || prompt.includes('/caveman')) {
      const cavemanRule = `[TOKEN OPTIMIZATION RULE: CAVEMAN OUTPUT COMPRESSION ACTIVE]\nRespond terse like smart caveman. All technical substance stays. Drop all pleasantries, filler, articles, and conversational narration. Code blocks, syntax, file paths, and CLI commands stay 100% byte-for-byte exact. Pattern: [thing] [action] [reason]. [next step].`;
      finalPrompt = `${cavemanRule}\n\n${finalPrompt}`;
      this.send('AGENT_THOUGHT_CHUNK', {
        text: `> 🪨 Caveman Output Compression Active (Cuts ~70% output token consumption).\n`
      });
    }

    // Map UI model names to agy CLI arguments with stream-json format
    const args = [
      '-p', finalPrompt,
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions'
    ];

    if (!isChatMode) {
      args.push('--add-dir', resolvedWorkspace);
    }

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
    let isThinking = true;
    let lineBuffer = '';
    const startTime = Date.now();

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
        lineBuffer += chunk.toString('utf-8');
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);

            // 1. Initial tools and environment loaded
            if (parsed.event === 'init') {
              const tools = parsed.init?.tools || [];
              this.send('AGENT_THOUGHT_CHUNK', {
                text: `> Context initialized: loaded ${tools.length} workspace tools.\n`,
              });
            }

            // 2. Step updates: planning, thinking, tool calls, text deltas
            if (parsed.event === 'step_update' && parsed.step_update) {
              const step = parsed.step_update;

              if (step.step_type === 'checkpoint') {
                this.send('AGENT_THOUGHT_CHUNK', {
                  text: `> Checkpointing step index ${step.step_index}...\n`,
                });
              }

              // Tool execution
              if (step.step_type === 'tool_call' || step.step_type === 'tool_execution') {
                const toolName = step.tool_name || step.name || 'tool';
                const toolArgs = step.tool_args || step.args || {};
                
                this.send('AGENT_TOOL_START', {
                  toolId: `tool-${step.step_index}`,
                  name: toolName,
                  args: toolArgs,
                });

                this.send('AGENT_THOUGHT_CHUNK', {
                  text: `> Executing tool \`${toolName}\`...\n`,
                });
              }

              // Agent response text delta
              if (step.text_delta) {
                if (isThinking) {
                  isThinking = false;
                  this.send('AGENT_THOUGHT_END', { timestamp: Date.now() });
                }
                accumulatedOutput += step.text_delta;
                this.send('AGENT_STREAM_CHUNK', { text: step.text_delta });
              }
            }

            // 3. Final Result
            if (parsed.event === 'result' && parsed.result) {
              if (parsed.result.response && !accumulatedOutput) {
                accumulatedOutput = parsed.result.response;
              }
            }
          } catch (e) {
            // If output was raw text fallback
            if (trimmed.length > 0) {
              if (isThinking) {
                isThinking = false;
                this.send('AGENT_THOUGHT_END', { timestamp: Date.now() });
              }
              accumulatedOutput += trimmed + '\n';
              this.send('AGENT_STREAM_CHUNK', { text: trimmed + '\n' });
            }
          }
        }
      });

      this.childProcess.stderr.on('data', (chunk) => {
        if (this.isAborted) return;
        const errText = chunk.toString('utf-8');
        if (isThinking) {
          this.send('AGENT_THOUGHT_CHUNK', { text: errText });
        }
      });

      this.childProcess.on('close', (code) => {
        this.childProcess = null;
        if (this.isAborted) return;

        if (isThinking) {
          this.send('AGENT_THOUGHT_END', { timestamp: Date.now() });
        }

        // Record real global usage update
        recordPromptUsage();

        const finalContent = accumulatedOutput.trim() || `(Response completed, exit code ${code})`;
        const durationMs = Date.now() - startTime;

        // Calculate token usage metrics
        const inputTokens = Math.max(1, Math.round(finalPrompt.length / 3.8));
        const outputTokens = Math.max(1, Math.round(finalContent.length / 3.8));
        const totalTokens = inputTokens + outputTokens;
        const isCaveman = !!(options.cavemanMode || prompt.includes('/caveman'));

        const tokenUsage = {
          inputTokens,
          outputTokens,
          totalTokens,
          durationMs,
          cavemanActive: isCaveman,
          estimatedSavingsPercent: isCaveman ? 70 : 0,
        };

        // Record persistent project token usage
        const projectStats = recordProjectUsage(resolvedWorkspace, tokenUsage);

        this.send('AGENT_STREAM_END', {
          completeResponse: finalContent,
          timestamp: Date.now(),
          tokenUsage,
          projectUsage: projectStats,
        });

        activeRuns.delete(this.sessionId);
      });

      this.childProcess.on('error', (err) => {
        this.childProcess = null;
        if (this.isAborted) return;

        console.error('Failed to spawn agy process:', err);
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
