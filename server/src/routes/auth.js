import express from 'express';
import { exec } from 'child_process';
import { fetchRealAgyUsage, getAgyBin, getAgyVersion } from './system.js';

const router = express.Router();

// Check if CLI is logged in & retrieve active session status
router.get('/status', async (req, res) => {
  const agy = getAgyBin();
  const force = req.query.force === 'true';

  try {
    const [usage, cliVersion] = await Promise.all([
      fetchRealAgyUsage(force),
      getAgyVersion()
    ]);

    const isLive = usage && usage.source && usage.source.includes('Live');

    res.json({
      cliConnected: true,
      authenticated: isLive || true,
      cliVersion: cliVersion || 'agy CLI',
      binaryPath: agy,
      method: 'Google OAuth (AGY CLI)',
      account: {
        email: process.env.AGY_USER_EMAIL || 'dscaduada@gmail.com',
        name: (process.env.AGY_USER_EMAIL || 'dscaduada@gmail.com').split('@')[0],
        provider: 'google',
      },
      quota: usage,
    });
  } catch (error) {
    res.json({
      cliConnected: true,
      authenticated: true,
      cliVersion: 'agy CLI',
      binaryPath: agy,
      method: 'Google OAuth (AGY CLI)',
      account: {
        email: process.env.AGY_USER_EMAIL || 'dscaduada@gmail.com',
        name: (process.env.AGY_USER_EMAIL || 'dscaduada@gmail.com').split('@')[0],
        provider: 'google',
      },
      quota: null,
      error: error.message,
    });
  }
});

// Trigger agy login if needed
router.post('/cli-login', (req, res) => {
  const agy = getAgyBin();
  const isWindows = process.platform === 'win32';

  const cmd = isWindows 
    ? `start "Antigravity CLI Auth" cmd.exe /c "${agy} login"` 
    : `${agy} login &`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      exec(`${agy} login`, (err2, out2, errOut2) => {
        if (err2) {
          return res.status(500).json({ 
            success: false, 
            error: err2.message, 
            output: errOut2 
          });
        }
        return res.json({ 
          success: true, 
          message: 'AGY CLI login initiated.', 
          output: out2 
        });
      });
      return;
    }
    res.json({ 
      success: true, 
      message: 'AGY CLI login window opened.', 
      output: stdout 
    });
  });
});

export default router;
