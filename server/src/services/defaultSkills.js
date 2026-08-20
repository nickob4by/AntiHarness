import fs from 'fs';
import path from 'path';
import os from 'os';

export const DEFAULT_SKILLS = [
  {
    slug: 'codebase-cartographer',
    name: 'codebase-cartographer',
    content: `---
name: codebase-cartographer
description: "Token-optimized Codebase Cartography & Architecture mapping. Generates ultra-dense structural maps and file trees to eliminate blind tool exploration and save up to 85% discovery tokens."
triggers:
  - "graph"
  - "cartography"
  - "map project"
  - "codebase structure"
  - "where are files located"
---

# Codebase Cartographer & Workspace Mapping

This skill provides immediate, token-efficient workspace mapping, ensuring you know the exact location of every module, config, entry point, and component without running dozens of costly exploratory tool calls.

## Core Rules for Token-Efficient Navigation

1. **Rely on Workspace Index**:
   - Use the pre-computed workspace structure provided at session start.
   - Do NOT run broad \`list_dir\` or recursive \`find_by_name\` commands if the file path is already indexed.

2. **Direct File Targeting**:
   - When asked to modify or inspect code, jump straight to the specific file path from the workspace map.
   - Use targeted slice line ranges (\`StartLine\`/\`EndLine\`) when viewing files instead of loading entire large documents into context.
`
  },
  {
    slug: 'surgical-patcher',
    name: 'surgical-patcher',
    content: `---
name: surgical-patcher
description: "Precision Diff-Only File Editor. Modifies only the required contiguous blocks of code to eliminate generation latency and save up to 90% of output token generation budget."
triggers:
  - "patch"
  - "edit file"
  - "diff edit"
  - "surgical changes"
---

# Surgical Patcher & Precision Editor

Save massive output generation tokens by emitting only the exact modified lines in replacement chunks rather than rewriting entire files.

## Guidelines

1. **Targeted Replacements**:
   - Use \`replace_file_content\` with precise \`StartLine\` and \`EndLine\` parameters.
   - Replace only the function or block that needs changing (e.g. 5-20 lines).
   - NEVER overwrite a 500-line file when only 3 lines are changing.

2. **Preserve Surrounding Integrity**:
   - Maintain all unrelated comments, docstrings, imports, and formatting.
   - Avoid indiscriminate full-file replacements.
`
  },
  {
    slug: 'token-saver',
    name: 'token-saver',
    content: `---
name: token-saver
description: "Context window compressor and prompt token optimizer. Minimizes token consumption across conversation turns, prevents rate-limit exhaustion, and optimizes thinking budget."
triggers:
  - "save tokens"
  - "compress context"
  - "optimize quota"
  - "rate limit"
---

# Token Saver & Context Compressor

Optimize every prompt and tool interaction to maximize token throughput and extend 5-hour rate limits.

## Optimization Strategies

1. **Concise Responses**:
   - Give direct, high-signal explanations. Avoid generic introductory boilerplate or repeating unchanged files.
   - Do not re-summarize created artifacts or tool outputs in full.

2. **Surgical Context Retrieval**:
   - Always specify \`StartLine\` and \`EndLine\` parameters when reading files. View only the relevant 50-100 line functions rather than entire 1,000+ line files.
   - Limit \`grep_search\` and command outputs to tight matches.

3. **Pruned Terminal Commands**:
   - Run terminal commands with targeted filters (e.g. \`npm test -- -t "auth"\`, \`git status -s\`, \`git log -n 3\`).
`
  },
  {
    slug: 'caveman',
    name: 'caveman',
    content: `---
name: caveman
description: "Ultra-compressed communication mode. Cuts output tokens by 65% to 85% by speaking with high-density precision like smart caveman while keeping 100% technical accuracy, code syntax, and CLI commands exact."
triggers:
  - "caveman"
  - "caveman mode"
  - "ultra compressed"
  - "talk like caveman"
  - "fewer tokens"
  - "be brief"
  - "/caveman"
---

# Caveman Token Optimization Mode

Respond terse like smart caveman. All technical substance stay. Only fluff and filler die.

## Rules

1. **Drop Fluff**:
   - Drop articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/happy to).
   - Short synonyms (big not extensive, fix not "implement a solution for").
   - No tool-call narration or preambles.

2. **Preserve Code & Tech Substance**:
   - Code blocks, paths, syntax, and CLI commands stay 100% byte-for-byte exact.
   - Exact error lines quoted verbatim.
   - Never invent confusing non-standard acronyms.

3. **Pattern**:
   - \`[thing] [action] [reason]. [next step].\`
   - *Example:* "New object ref each render. Wrap in \`useMemo\`."
`
  }
];

/**
 * Ensures global skills are installed in the user's home directory (~/.gemini/skills and ~/.agy/skills)
 */
export function ensureGlobalSkills() {
  const homeDir = os.homedir();
  const targetDir = path.join(homeDir, '.gemini', 'skills');

  try {
    DEFAULT_SKILLS.forEach((skill) => {
      const skillDir = path.join(targetDir, skill.slug);
      const skillFile = path.join(skillDir, 'SKILL.md');
      if (!fs.existsSync(skillFile)) {
        fs.mkdirSync(skillDir, { recursive: true });
        fs.writeFileSync(skillFile, skill.content, 'utf-8');
      }
    });
  } catch (e) {
    console.warn(`[DefaultSkills] Could not seed global skills in ${targetDir}:`, e.message);
  }
}

/**
 * Automatically seeds the 3 default skills into any project directory (.gemini/skills)
 */
export function seedSkillsToProject(projectPath) {
  if (!projectPath || !fs.existsSync(projectPath)) return;

  const projectSkillsDir = path.join(projectPath, '.gemini', 'skills');
  try {
    DEFAULT_SKILLS.forEach((skill) => {
      const skillDir = path.join(projectSkillsDir, skill.slug);
      const skillFile = path.join(skillDir, 'SKILL.md');
      if (!fs.existsSync(skillFile)) {
        fs.mkdirSync(skillDir, { recursive: true });
        fs.writeFileSync(skillFile, skill.content, 'utf-8');
      }
    });
  } catch (e) {
    console.warn(`[DefaultSkills] Could not seed skills to project ${projectPath}:`, e.message);
  }
}
