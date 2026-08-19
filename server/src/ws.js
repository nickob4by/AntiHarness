import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import path from 'path';
import { AgentEngine, stopSession } from './agentEngine.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket harness');

    let currentAgent = null;
    const activeShellCommands = new Map();

    ws.send(
      JSON.stringify({
        type: 'SYSTEM_STATUS',
        payload: {
          message: 'Connected to Antigravity Localhost Harness Engine',
          timestamp: new Date().toISOString(),
        },
      })
    );

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'PING':
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            break;

          case 'RUN_AGENT_PROMPT': {
            const { prompt, workspacePath, sessionId, model } = data.payload || {};
            if (!prompt) return;

            currentAgent = new AgentEngine(ws, sessionId);
            await currentAgent.runPrompt(prompt, workspacePath, model);
            break;
          }

          case 'STOP_AGENT_PROMPT': {
            const { sessionId } = data.payload || {};
            if (sessionId) {
              stopSession(sessionId);
            }
            if (currentAgent) {
              currentAgent.abort();
            }
            ws.send(
              JSON.stringify({
                type: 'AGENT_STREAM_STOPPED',
                payload: { sessionId, timestamp: Date.now() },
              })
            );
            break;
          }

          case 'EXEC_SHELL_COMMAND': {
            const { commandId, command, workspacePath, sessionId } = data.payload || {};
            if (!command) return;

            const isWindows = process.platform === 'win32';
            const shell = isWindows ? 'powershell.exe' : (process.env.SHELL || 'bash');
            const shellArgs = isWindows ? ['-NoLogo', '-Command', command] : ['-c', command];
            const startTime = Date.now();

            try {
              const child = spawn(shell, shellArgs, {
                cwd: workspacePath || process.cwd(),
                env: {
                  ...process.env,
                  TERM: 'xterm-256color',
                  COLORTERM: 'truecolor',
                },
              });

              activeShellCommands.set(commandId, child);

              child.stdout.on('data', (chunk) => {
                const text = chunk.toString('utf-8');
                ws.send(JSON.stringify({
                  type: 'SHELL_COMMAND_OUTPUT',
                  sessionId,
                  payload: { commandId, data: text },
                }));
              });

              child.stderr.on('data', (chunk) => {
                const text = chunk.toString('utf-8');
                ws.send(JSON.stringify({
                  type: 'SHELL_COMMAND_OUTPUT',
                  sessionId,
                  payload: { commandId, data: text },
                }));
              });

              child.on('close', (code) => {
                activeShellCommands.delete(commandId);
                const durationMs = Date.now() - startTime;
                const formattedDuration = durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`;

                ws.send(JSON.stringify({
                  type: 'SHELL_COMMAND_END',
                  sessionId,
                  payload: {
                    commandId,
                    exitCode: code,
                    duration: formattedDuration,
                  },
                }));
              });

              child.on('error', (err) => {
                activeShellCommands.delete(commandId);
                ws.send(JSON.stringify({
                  type: 'SHELL_COMMAND_END',
                  sessionId,
                  payload: {
                    commandId,
                    exitCode: 1,
                    error: err.message,
                    duration: `${Date.now() - startTime}ms`,
                  },
                }));
              });
            } catch (err) {
              ws.send(JSON.stringify({
                type: 'SHELL_COMMAND_END',
                sessionId,
                payload: {
                  commandId,
                  exitCode: 1,
                  error: err.message,
                  duration: '0ms',
                },
              }));
            }
            break;
          }

          default:
            ws.send(
              JSON.stringify({
                type: 'UNKNOWN_COMMAND',
                payload: { originalType: data.type },
              })
            );
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket harness');
      if (currentAgent) {
        currentAgent.abort();
      }
      activeShellCommands.forEach((child) => {
        try {
          child.kill('SIGINT');
        } catch (e) {}
      });
      activeShellCommands.clear();
    });
  });

  return wss;
}
