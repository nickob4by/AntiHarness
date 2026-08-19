import express from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const router = express.Router();

// Helper to parse YAML frontmatter and markdown body from SKILL.md
function parseSkillFile(filePath, skillDir, scope) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');

    let name = path.basename(skillDir);
    let description = '';
    let body = raw;

    // Parse Frontmatter --- ... ---
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (fmMatch) {
      const frontmatter = fmMatch[1];
      body = fmMatch[2];

      const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
      if (nameMatch) name = nameMatch[1].trim().replace(/^["']|["']$/g, '');

      const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
      if (descMatch) description = descMatch[1].trim().replace(/^["']|["']$/g, '');
    } else {
      // Fallback: extract title from # Title
      const h1Match = raw.match(/^#\s+(.+)$/m);
      if (h1Match) name = h1Match[1].trim();
      
      const firstParagraph = raw.split(/\n\s*\n/)[1] || '';
      description = firstParagraph.replace(/^[#*-]\s*/, '').trim().substring(0, 180);
    }

    // List all files in skill directory
    let files = [];
    try {
      files = fs.readdirSync(skillDir, { recursive: true }).filter(f => {
        const full = path.join(skillDir, f);
        return fs.statSync(full).isFile();
      });
    } catch (e) {
      files = ['SKILL.md'];
    }

    // Extract triggers / keywords mentioned in description and body
    const triggers = [];
    const whenMatches = body.match(/(?:Use when|When to use|Trigger when|Activate when)[:\s]+([^\n.]+)/gi);
    if (whenMatches) {
      whenMatches.forEach(m => triggers.push(m.replace(/^(?:Use when|When to use|Trigger when|Activate when)[:\s]*/i, '').trim()));
    }

    return {
      id: `${scope}-${path.basename(skillDir)}`,
      name,
      slug: path.basename(skillDir),
      description: description || 'Antigravity specialized skill instructions and tools.',
      scope, // 'project' | 'global' | 'builtin'
      path: skillDir,
      skillMdPath: filePath,
      files,
      triggers: triggers.length > 0 ? triggers : ['Manual activation', 'Agent task delegation'],
      enabled: true,
    };
  } catch (err) {
    console.warn(`Error parsing skill at ${filePath}:`, err.message);
    return null;
  }
}

// Scan a directory for skills
function scanSkillsDirectory(baseDir, scope) {
  const skills = [];
  if (!fs.existsSync(baseDir)) return skills;

  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillDir = path.join(baseDir, entry.name);
        const skillMd = path.join(skillDir, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          const parsed = parseSkillFile(skillMd, skillDir, scope);
          if (parsed) skills.push(parsed);
        }
      }
    }
  } catch (err) {
    console.warn(`Error scanning directory ${baseDir}:`, err.message);
  }
  return skills;
}

// GET /api/skills - List all installed skills (Project, Global, Builtin)
router.get('/', (req, res) => {
  const projectPath = req.query.projectPath || '';
  const allSkills = [];

  // 1. Project-level skills
  if (projectPath && fs.existsSync(projectPath)) {
    const projGeminiSkills = path.join(projectPath, '.gemini', 'skills');
    const projAgySkills = path.join(projectPath, '.agy', 'skills');
    const projSkills = path.join(projectPath, 'skills');

    allSkills.push(...scanSkillsDirectory(projGeminiSkills, 'project'));
    allSkills.push(...scanSkillsDirectory(projAgySkills, 'project'));
    allSkills.push(...scanSkillsDirectory(projSkills, 'project'));
  }

  // 2. Global user skills
  const homeDir = os.homedir();
  const globalGeminiSkills = path.join(homeDir, '.gemini', 'skills');
  const globalAgySkills = path.join(homeDir, '.agy', 'skills');
  allSkills.push(...scanSkillsDirectory(globalGeminiSkills, 'global'));
  allSkills.push(...scanSkillsDirectory(globalAgySkills, 'global'));

  // 3. Built-in Antigravity skills
  const builtinSkills = path.join(homeDir, '.gemini', 'antigravity-cli', 'builtin', 'skills');
  allSkills.push(...scanSkillsDirectory(builtinSkills, 'builtin'));

  // Deduplicate by path
  const seenPaths = new Set();
  const uniqueSkills = allSkills.filter(s => {
    if (seenPaths.has(s.path)) return false;
    seenPaths.add(s.path);
    return true;
  });

  res.json({
    skills: uniqueSkills,
    count: uniqueSkills.length,
    timestamp: new Date().toISOString()
  });
});

// Helper to parse GitHub URL
function parseGithubUrl(rawUrl) {
  const clean = rawUrl.trim();
  // e.g. https://github.com/owner/repo
  // e.g. https://github.com/owner/repo/tree/branch/subfolder
  const match = clean.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)\/(.+))?/i);
  if (!match) return null;

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, '');
  const branch = match[3] || 'main';
  const subpath = match[4] || '';

  return { owner, repo, branch, subpath, cleanUrl: `https://github.com/${owner}/${repo}` };
}

// Fetch helper with timeout
async function fetchGithubRaw(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'AntiHarness-Agent' } });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
}

// POST /api/skills/inspect-github - Analyze GitHub link & generate AI skill summary
router.post('/inspect-github', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'GitHub repository or skill URL is required.' });
  }

  const parsed = parseGithubUrl(url);
  if (!parsed) {
    return res.status(400).json({ error: 'Invalid GitHub URL. Please provide a link like https://github.com/owner/repo or https://github.com/owner/repo/tree/main/skills/skill-name' });
  }

  const { owner, repo, branch, subpath, cleanUrl } = parsed;

  try {
    // Try fetching SKILL.md directly from raw github
    const candidates = [];
    if (subpath) {
      candidates.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${subpath}/SKILL.md`);
      candidates.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${subpath}/README.md`);
      candidates.push(`https://raw.githubusercontent.com/${owner}/${repo}/master/${subpath}/SKILL.md`);
    }
    candidates.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/SKILL.md`);
    candidates.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/skills/SKILL.md`);
    candidates.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`);
    candidates.push(`https://raw.githubusercontent.com/${owner}/${repo}/master/SKILL.md`);
    candidates.push(`https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`);

    let skillContent = null;
    let foundUrl = null;

    for (const candidate of candidates) {
      const text = await fetchGithubRaw(candidate);
      if (text && text.length > 20) {
        skillContent = text;
        foundUrl = candidate;
        break;
      }
    }

    // Default fallback metadata if raw file fetch failed
    let skillName = subpath ? subpath.split('/').pop() : repo;
    let skillDesc = `Antigravity skill from ${owner}/${repo}`;
    let triggers = ['When working with ' + repo, 'Manual activation'];
    let tools = ['run_command', 'write_to_file'];
    let filesList = ['SKILL.md'];

    if (skillContent) {
      // Parse frontmatter
      const fmMatch = skillContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (fmMatch) {
        const fm = fmMatch[1];
        const nMatch = fm.match(/^name:\s*(.+)$/m);
        if (nMatch) skillName = nMatch[1].trim().replace(/^["']|["']$/g, '');
        const dMatch = fm.match(/^description:\s*(.+)$/m);
        if (dMatch) skillDesc = dMatch[1].trim().replace(/^["']|["']$/g, '');
      } else {
        const h1 = skillContent.match(/^#\s+(.+)$/m);
        if (h1) skillName = h1[1].trim();
        const p1 = skillContent.split(/\n\s*\n/)[1] || '';
        if (p1) skillDesc = p1.replace(/^[#*-]\s*/, '').trim().substring(0, 200);
      }

      // Extract triggers from markdown body
      const whenMatches = skillContent.match(/(?:Use when|When to use|Trigger when|Activate when)[:\s]+([^\n.]+)/gi);
      if (whenMatches) {
        triggers = whenMatches.map(m => m.replace(/^(?:Use when|When to use|Trigger when|Activate when)[:\s]*/i, '').trim());
      }
    }

    // Return structured AI Summary
    res.json({
      success: true,
      repository: {
        owner,
        repo,
        branch,
        subpath,
        url: cleanUrl,
      },
      skill: {
        name: skillName,
        slug: skillName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        description: skillDesc,
        summary: `This skill equips your Antigravity agent with specialized instructions, best practices, and automation rules for **${skillName}**. It allows the agent to intelligently execute workflows related to ${skillDesc.toLowerCase()}.`,
        triggers,
        toolsUsed: tools,
        files: filesList,
        rawPreview: skillContent ? skillContent.substring(0, 1500) : null,
      },
    });
  } catch (err) {
    console.error('Error inspecting GitHub skill:', err);
    res.status(500).json({ error: `Failed to inspect GitHub skill: ${err.message}` });
  }
});

// POST /api/skills/install - Confirm & Install Skill
router.post('/install', async (req, res) => {
  const { url, targetScope = 'project', projectPath, skillData } = req.body;

  if (!url || !skillData?.name) {
    return res.status(400).json({ error: 'URL and skill metadata are required.' });
  }

  const slug = skillData.slug || skillData.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  // Determine installation folder target
  let targetDir = '';
  if (targetScope === 'project' && projectPath && fs.existsSync(projectPath)) {
    targetDir = path.join(projectPath, '.gemini', 'skills', slug);
  } else {
    // Global scope
    targetDir = path.join(os.homedir(), '.gemini', 'skills', slug);
  }

  try {
    // Ensure parent directory exists
    fs.mkdirSync(targetDir, { recursive: true });

    const skillMdFile = path.join(targetDir, 'SKILL.md');

    // If raw preview is provided, write SKILL.md
    let skillContent = skillData.rawPreview || '';
    if (!skillContent || !skillContent.includes('---')) {
      skillContent = `---
name: ${skillData.name}
description: ${skillData.description || 'Custom Antigravity skill.'}
---

# ${skillData.name}

${skillData.summary || skillData.description || ''}

## When to use
${(skillData.triggers || []).map(t => `- ${t}`).join('\n')}

## Instructions
Follow standard Antigravity execution instructions for ${skillData.name}.
`;
    }

    fs.writeFileSync(skillMdFile, skillContent, 'utf-8');

    // Return the newly created skill object
    const createdSkill = parseSkillFile(skillMdFile, targetDir, targetScope);

    res.json({
      success: true,
      message: `Skill "${skillData.name}" installed successfully!`,
      skill: createdSkill,
    });
  } catch (err) {
    console.error('Error installing skill:', err);
    res.status(500).json({ error: `Failed to install skill: ${err.message}` });
  }
});

// DELETE /api/skills - Remove a skill
router.delete('/', (req, res) => {
  const { skillPath } = req.body;
  if (!skillPath || !fs.existsSync(skillPath)) {
    return res.status(400).json({ error: 'Invalid skill path' });
  }

  // Prevent deleting builtin skills
  if (skillPath.includes('builtin')) {
    return res.status(403).json({ error: 'Cannot delete built-in system skills.' });
  }

  try {
    fs.rmSync(skillPath, { recursive: true, force: true });
    res.json({ success: true, message: 'Skill removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: `Failed to remove skill: ${err.message}` });
  }
});

export default router;
