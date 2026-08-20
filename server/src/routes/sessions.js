import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = express.Router();

function buildSessionSummary(steps, transcriptMtime) {
  const userPrompts = [];
  const toolCounts = {};
  const filesModified = [];
  const commandsRun = [];
  const bulletPoints = [];

  for (const step of steps) {
    const timestampStr = step.timestamp 
      ? new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : null;

    if (step.type === 'USER_INPUT' && step.content) {
      userPrompts.push({
        content: step.content,
        timestamp: timestampStr || 'Recent',
        stepIndex: step.step_index,
      });

      bulletPoints.push({
        type: 'user',
        label: 'Request',
        text: step.content,
        timestamp: timestampStr || 'Recent',
      });
    }

    if (step.tool_calls && Array.isArray(step.tool_calls)) {
      for (const call of step.tool_calls) {
        const name = call.name || 'tool';
        toolCounts[name] = (toolCounts[name] || 0) + 1;

        if (name === 'write_to_file' || name === 'replace_file_content') {
          const target = call.args?.TargetFile ? path.basename(call.args.TargetFile) : 'file';
          const desc = call.args?.Description || `Updated ${target}`;
          filesModified.push({ file: target, desc, timestamp: timestampStr || 'Recent' });
          bulletPoints.push({
            type: 'change',
            label: 'Modified',
            text: `${target} — ${desc}`,
            timestamp: timestampStr || 'Recent',
          });
        } else if (name === 'run_command') {
          const cmd = call.args?.CommandLine ? call.args.CommandLine.slice(0, 70) : 'command';
          commandsRun.push({ cmd, timestamp: timestampStr || 'Recent' });
          bulletPoints.push({
            type: 'action',
            label: 'Executed',
            text: cmd,
            timestamp: timestampStr || 'Recent',
          });
        }
      }
    }
  }

  return {
    totalSteps: steps.length,
    lastUpdated: transcriptMtime ? new Date(transcriptMtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString(),
    userPromptCount: userPrompts.length,
    recentUserPrompt: userPrompts[userPrompts.length - 1]?.content || 'None',
    toolCounts,
    bulletPoints,
    filesModified,
    commandsRun,
  };
}

// Get list of all conversation sessions from Antigravity brain
router.get('/', (req, res) => {
  try {
    const brainPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain');
    
    if (!fs.existsSync(brainPath)) {
      return res.json({ sessions: [], currentConversationId: null });
    }

    const entries = fs.readdirSync(brainPath, { withFileTypes: true });
    const sessions = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const conversationId = entry.name;
        const logsDir = path.join(brainPath, conversationId, '.system_generated', 'logs');
        const transcriptPath = path.join(logsDir, 'transcript.jsonl');
        
        let lastModified = null;
        let preview = '';
        let stepCount = 0;
        let matchedWorkspace = false;

        if (fs.existsSync(transcriptPath)) {
          const stats = fs.statSync(transcriptPath);
          lastModified = stats.mtime;

          try {
            const raw = fs.readFileSync(transcriptPath, 'utf-8');
            const lines = raw.trim().split('\n').filter(Boolean);
            stepCount = lines.length;

            for (const line of lines) {
              const parsed = JSON.parse(line);
              if (parsed.type === 'USER_INPUT' && parsed.content && !preview) {
                preview = parsed.content.slice(0, 120);
              }
              if (parsed.content && (parsed.content.includes('D:\\AntiG') || parsed.content.includes('D:/AntiG'))) {
                matchedWorkspace = true;
              }
            }
          } catch (e) {
            // ignore parsing errors
          }
        }

        sessions.push({
          id: conversationId,
          lastModified,
          stepCount,
          matchedWorkspace,
          preview: preview || `Session ${conversationId.slice(0, 8)}`,
        });
      }
    }

    sessions.sort((a, b) => (b.lastModified ? new Date(b.lastModified).getTime() : 0) - (a.lastModified ? new Date(a.lastModified).getTime() : 0));

    const currentSession = sessions.find((s) => s.matchedWorkspace) || sessions[0] || null;

    res.json({
      sessions,
      currentConversationId: currentSession?.id || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transcript and aggregated summary for a specific session
router.get('/:id/transcript', (req, res) => {
  const { id } = req.params;
  try {
    const brainPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain');
    const logsDir = path.join(brainPath, id, '.system_generated', 'logs');
    const transcriptPath = path.join(logsDir, 'transcript.jsonl');

    if (!fs.existsSync(transcriptPath)) {
      return res.status(404).json({ error: 'Session transcript not found' });
    }

    const stats = fs.statSync(transcriptPath);
    const raw = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const steps = lines.map((l) => {
      try {
        return JSON.parse(l);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    const summary = buildSessionSummary(steps, stats.mtime);

    res.json({
      sessionId: id,
      lastModified: stats.mtime,
      steps,
      summary,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Load session converted to AntiHarness tab messages format
router.get('/:id/messages', (req, res) => {
  const { id } = req.params;
  try {
    const brainPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain');
    const logsDir = path.join(brainPath, id, '.system_generated', 'logs');
    const transcriptPath = path.join(logsDir, 'transcript.jsonl');

    if (!fs.existsSync(transcriptPath)) {
      return res.status(404).json({ error: 'Session transcript not found' });
    }

    const raw = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const messages = [];

    let currentAssistant = null;

    for (const line of lines) {
      try {
        const step = JSON.parse(line);

        if (step.type === 'USER_INPUT' && step.content) {
          if (currentAssistant) {
            messages.push(currentAssistant);
            currentAssistant = null;
          }
          messages.push({
            role: 'user',
            content: step.content,
            timestamp: step.timestamp || Date.now(),
          });
        } else if (step.type === 'PLANNER_RESPONSE') {
          if (!currentAssistant) {
            currentAssistant = {
              role: 'assistant',
              content: '',
              thoughts: '',
              tools: [],
            };
          }

          if (step.content) {
            currentAssistant.content = (currentAssistant.content ? currentAssistant.content + '\n\n' : '') + step.content;
          }

          if (step.tool_calls && Array.isArray(step.tool_calls)) {
            for (const tool of step.tool_calls) {
              currentAssistant.tools.push({
                toolId: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: tool.name,
                toolSummary: tool.args?.toolSummary || tool.name,
                toolAction: tool.args?.toolAction || 'Running tool',
                status: 'success',
                args: tool.args,
                output: tool.args?.Description || 'Completed',
              });
            }
          }
        }
      } catch (e) {}
    }

    if (currentAssistant) {
      messages.push(currentAssistant);
    }

    res.json({
      sessionId: id,
      messages,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export session to formatted Markdown report
router.get('/:id/export', (req, res) => {
  const { id } = req.params;
  try {
    const brainPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain');
    const logsDir = path.join(brainPath, id, '.system_generated', 'logs');
    const transcriptPath = path.join(logsDir, 'transcript.jsonl');

    if (!fs.existsSync(transcriptPath)) {
      return res.status(404).json({ error: 'Session transcript not found' });
    }

    const raw = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    
    let md = `# 🤖 AntiHarness Session Report\n\n- **Session ID**: \`${id}\`\n- **Export Date**: ${new Date().toLocaleString()}\n- **Total Steps**: ${lines.length}\n\n---\n\n`;

    for (const line of lines) {
      try {
        const step = JSON.parse(line);
        const time = step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : '';

        if (step.type === 'USER_INPUT' && step.content) {
          md += `### 👤 User (${time})\n\n${step.content}\n\n`;
        } else if (step.type === 'PLANNER_RESPONSE') {
          if (step.tool_calls && step.tool_calls.length > 0) {
            md += `> **🛠️ Tools Executed:**\n`;
            for (const t of step.tool_calls) {
              md += `> - \`${t.name}\`: ${t.args?.toolAction || t.args?.Description || JSON.stringify(t.args || {})}\n`;
            }
            md += `\n`;
          }
          if (step.content) {
            md += `### 🤖 Antigravity Assistant\n\n${step.content}\n\n---\n\n`;
          }
        }
      } catch (e) {}
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="antiharness-session-${id.slice(0, 8)}.md"`);
    res.send(md);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a session log
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const brainPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain');
    const sessionDir = path.join(brainPath, id);

    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    res.json({ success: true, deletedSessionId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
