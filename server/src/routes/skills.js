import express from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import { ensureGlobalSkills } from '../services/defaultSkills.js';

const execPromise = util.promisify(exec);
const router = express.Router();

// Ensure default global skills are initialized
ensureGlobalSkills();

// Persistent Auto-Inject configuration
function getAutoInjectConfigPath() {
  const dir = path.join(os.homedir(), '.gemini', 'antigravity');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'auto_inject_skills.json');
}

export function getAutoInjectedSlugs() {
  try {
    const p = getAutoInjectConfigPath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}
  return ['codebase-cartographer', 'surgical-patcher', 'token-saver'];
}

export function setAutoInjectedSlugs(slugs) {
  try {
    const p = getAutoInjectConfigPath();
    fs.writeFileSync(p, JSON.stringify(slugs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save auto-injected skills:', e);
  }
}

// Categorize skill based on usage domain
export function categorizeSkill(name = '', slug = '', description = '', triggers = []) {
  const text = `${name} ${slug} ${description} ${(triggers || []).join(' ')}`.toLowerCase();
  
  if (
    text.includes('token') || 
    text.includes('quota') || 
    text.includes('rate limit') || 
    text.includes('surgical') || 
    text.includes('patch') || 
    text.includes('cartograph') || 
    text.includes('compress') ||
    text.includes('optimization')
  ) {
    return 'Token & Optimization';
  }

  if (
    text.includes('refactor') || 
    text.includes('debug') || 
    text.includes('lint') || 
    text.includes('test') || 
    text.includes('clean code') || 
    text.includes('review') ||
    text.includes('security')
  ) {
    return 'Coding & Refactoring';
  }

  if (
    text.includes('architecture') || 
    text.includes('workflow') || 
    text.includes('git') || 
    text.includes('ci') || 
    text.includes('docker') || 
    text.includes('deploy') ||
    text.includes('guide') ||
    text.includes('customization')
  ) {
    return 'Architecture & Workflow';
  }

  if (
    text.includes('react') || 
    text.includes('vue') || 
    text.includes('node') || 
    text.includes('express') || 
    text.includes('tailwind') || 
    text.includes('python') || 
    text.includes('api') || 
    text.includes('database') || 
    text.includes('sql') ||
    text.includes('frontend') ||
    text.includes('backend')
  ) {
    return 'Framework & Stack';
  }

  return 'General & Automation';
}

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

    const slug = path.basename(skillDir);
    const category = categorizeSkill(name, slug, description, triggers);

    return {
      id: `${scope}-${slug}`,
      name,
      slug,
      description: description || 'Antigravity specialized skill instructions and tools.',
      scope, // 'project' | 'global' | 'builtin'
      category,
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

// GET /api/skills - List all installed skills (Project, Global, Builtin) with categories & auto-inject status
router.get('/', (req, res) => {
  const projectPath = req.query.projectPath || '';
  const allSkills = [];
  const autoInjectedSlugs = getAutoInjectedSlugs();

  // 1. Project-level skills
  const projectSkillSlugs = new Set();
  if (projectPath && fs.existsSync(projectPath)) {
    const projGeminiSkills = path.join(projectPath, '.gemini', 'skills');
    const projAgySkills = path.join(projectPath, '.agy', 'skills');
    const projSkills = path.join(projectPath, 'skills');

    const projectList = [
      ...scanSkillsDirectory(projGeminiSkills, 'project'),
      ...scanSkillsDirectory(projAgySkills, 'project'),
      ...scanSkillsDirectory(projSkills, 'project')
    ];
    projectList.forEach(s => projectSkillSlugs.add(s.slug.toLowerCase()));
    allSkills.push(...projectList);
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

  // Deduplicate by scope + slug so no scope tab ever contains duplicates
  const seenScopeSlug = new Set();
  const seenPaths = new Set();
  const uniqueSkills = allSkills.filter(s => {
    const slugKey = `${s.scope}:${(s.slug || s.name).toLowerCase().trim()}`;
    if (seenScopeSlug.has(slugKey) || seenPaths.has(s.path)) {
      return false;
    }
    seenScopeSlug.add(slugKey);
    seenPaths.add(s.path);
    return true;
  }).map(s => {
    const isAutoInject = autoInjectedSlugs.includes(s.slug);
    const isUsedInProject = s.scope === 'project' || isAutoInject || projectSkillSlugs.has(s.slug.toLowerCase());
    return {
      ...s,
      isAutoInject,
      isUsedInProject
    };
  });

  res.json({
    skills: uniqueSkills,
    count: uniqueSkills.length,
    autoInjectedSlugs,
    categories: [
      'All Categories',
      'Token & Optimization',
      'Coding & Refactoring',
      'Architecture & Workflow',
      'Framework & Stack',
      'General & Automation'
    ],
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

      // Clean markdown links, HTML tags, and non-alphanumeric noise from skillName and skillDesc
      skillName = skillName
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [title](url) -> title
        .replace(/<[^>]*>/g, '')                 // strip HTML
        .replace(/^["']|["']$/g, '')
        .trim();

      skillDesc = skillDesc
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/<[^>]*>/g, '')
        .replace(/^["']|["']$/g, '')
        .trim();

      // Extract triggers from markdown body
      const whenMatches = skillContent.match(/(?:Use when|When to use|Trigger when|Activate when)[:\s]+([^\n.]+)/gi);
      if (whenMatches) {
        triggers = whenMatches.map(m => m.replace(/^(?:Use when|When to use|Trigger when|Activate when)[:\s]*/i, '').trim());
      }
    }

    const cleanSlug = (skillName || repo)
      .toLowerCase()
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

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
        name: skillName || repo,
        slug: cleanSlug || repo.toLowerCase(),
        description: skillDesc || `Antigravity skill from ${owner}/${repo}`,
        summary: `This skill equips your Antigravity agent with specialized instructions, best practices, and automation rules for **${skillName || repo}**.`,
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

// POST /api/skills/auto-inject/toggle - Toggle auto-injection on session start
router.post('/auto-inject/toggle', (req, res) => {
  const { slug, enabled } = req.body;
  if (!slug) return res.status(400).json({ error: 'slug is required' });

  const current = getAutoInjectedSlugs();
  let updated;
  if (enabled !== undefined) {
    if (enabled) {
      updated = Array.from(new Set([...current, slug]));
    } else {
      updated = current.filter(s => s !== slug);
    }
  } else {
    if (current.includes(slug)) {
      updated = current.filter(s => s !== slug);
    } else {
      updated = [...current, slug];
    }
  }
  setAutoInjectedSlugs(updated);
  res.json({ success: true, autoInjectedSlugs: updated });
});

// POST /api/skills/copy-to-project - Copy a global skill to local project .gemini/skills
router.post('/copy-to-project', (req, res) => {
  const { slug, projectPath } = req.body;
  if (!slug || !projectPath) {
    return res.status(400).json({ error: 'slug and projectPath are required' });
  }

  const homeDir = os.homedir();
  const sourceCandidates = [
    path.join(homeDir, '.gemini', 'skills', slug),
    path.join(homeDir, '.gemini', 'antigravity-cli', 'builtin', 'skills', slug),
    path.join(homeDir, '.agy', 'skills', slug)
  ];

  const sourceDir = sourceCandidates.find(d => fs.existsSync(path.join(d, 'SKILL.md')));
  if (!sourceDir) {
    return res.status(404).json({ error: `Skill "${slug}" not found in global directory.` });
  }

  try {
    const targetDir = path.join(projectPath, '.gemini', 'skills', slug);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.cpSync(sourceDir, targetDir, { recursive: true });
    res.json({ success: true, message: `Skill "${slug}" copied to project .gemini/skills.` });
  } catch (err) {
    res.status(500).json({ error: `Failed to copy skill to project: ${err.message}` });
  }
});

// DELETE /api/skills - Remove a skill permanently
router.delete('/', (req, res) => {
  let { skillPath, slug, projectPath } = req.body;

  if (!skillPath && slug && projectPath) {
    skillPath = path.join(projectPath, '.gemini', 'skills', slug);
  }

  if (!skillPath || !fs.existsSync(skillPath)) {
    return res.status(400).json({ error: 'Invalid or non-existent skill path' });
  }

  // Prevent deleting builtin skills
  if (skillPath.includes('builtin')) {
    return res.status(403).json({ error: 'Cannot delete built-in system skills.' });
  }

  try {
    // 1. Remove skill folder on disk
    fs.rmSync(skillPath, { recursive: true, force: true });

    // 2. Also remove from auto-inject configuration if present
    const skillSlug = slug || path.basename(skillPath);
    if (skillSlug) {
      const current = getAutoInjectedSlugs();
      const updated = current.filter(s => s.toLowerCase() !== skillSlug.toLowerCase());
      if (updated.length !== current.length) {
        setAutoInjectedSlugs(updated);
      }
    }

    res.json({ success: true, message: `Skill removed successfully from ${skillPath}.` });
  } catch (err) {
    console.error('Failed to remove skill:', err);
    res.status(500).json({ error: `Failed to remove skill: ${err.message}` });
  }
});

export default router;
