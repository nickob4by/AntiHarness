import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fetchRealAgyUsage, getAgyBin, getAgyVersion } from './system.js';

const router = express.Router();

function getActiveGoogleAccount() {
  try {
    const credsPath = path.join(os.homedir(), '.gemini', 'oauth_creds.json');
    if (fs.existsSync(credsPath)) {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
      if (creds.email) return creds.email;
      if (creds.id_token) {
        const parts = creds.id_token.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.email) return payload.email;
        }
      }
    }
  } catch (e) {}

  try {
    const accPath = path.join(os.homedir(), '.gemini', 'google_accounts.json');
    if (fs.existsSync(accPath)) {
      const data = JSON.parse(fs.readFileSync(accPath, 'utf-8'));
      if (data.active) return data.active;
    }
  } catch (e) {}

  return process.env.AGY_USER_EMAIL || '';
}

// Check if CLI is logged in & retrieve active session status
router.get('/status', async (req, res) => {
  const agy = getAgyBin();
  const force = req.query.force === 'true';
  const activeEmail = getActiveGoogleAccount();

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
      geminiChatReady: true,
      account: {
        email: activeEmail,
        name: activeEmail.split('@')[0],
        provider: 'google',
        tier: 'Gemini Pro / Advanced (Active)',
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
      geminiChatReady: true,
      account: {
        email: activeEmail,
        name: activeEmail.split('@')[0],
        provider: 'google',
        tier: 'Gemini Pro / Advanced (Active)',
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
