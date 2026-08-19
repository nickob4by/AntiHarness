import express from 'express';
import http from 'http';
import cors from 'cors';
import systemRoutes from './routes/system.js';
import workspaceRoutes from './routes/workspace.js';
import sessionRoutes from './routes/sessions.js';
import authRoutes from './routes/auth.js';
import skillsRoutes from './routes/skills.js';
import { setupWebSocket } from './ws.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/api', (req, res) => {
  res.json({
    name: 'Antigravity Localhost Harness Gateway API',
    version: '1.0.0',
    endpoints: [
      '/api/system/health',
      '/api/workspace/info',
      '/api/workspace/file',
      '/api/sessions',
    ],
  });
});

const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Antigravity Harness Server running on:  `);
  console.log(` http://localhost:${PORT}               `);
  console.log(`=========================================`);
});
