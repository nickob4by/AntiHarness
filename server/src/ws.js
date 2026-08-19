import { WebSocketServer } from 'ws';
import { AgentEngine, stopSession } from './agentEngine.js';
import { TerminalRunner } from './terminalRunner.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket harness');

    let currentAgent = null;
    let terminalRunner = null;

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

          case 'TERMINAL_INIT': {
            const { workspacePath } = data.payload || {};
            if (!terminalRunner) {
              terminalRunner = new TerminalRunner(ws, workspacePath || process.cwd());
            } else if (workspacePath) {
              terminalRunner.setCwd(workspacePath);
            }
            break;
          }

          case 'TERMINAL_INPUT': {
            const { input } = data.payload || {};
            if (terminalRunner && input !== undefined) {
              terminalRunner.write(input);
            }
            break;
          }

          case 'TERMINAL_RESTART': {
            const { workspacePath } = data.payload || {};
            if (terminalRunner) {
              terminalRunner.destroy();
            }
            terminalRunner = new TerminalRunner(ws, workspacePath || process.cwd());
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
      if (terminalRunner) {
        terminalRunner.destroy();
        terminalRunner = null;
      }
    });
  });

  return wss;
}
