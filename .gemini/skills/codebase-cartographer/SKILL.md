---
name: codebase-cartographer
description: "Token-optimized Codebase Cartography & Architecture Graph mapping. Generates ultra-dense structural maps and dependency trees to eliminate blind tool exploration and save up to 85% discovery tokens."
triggers:
  - "graph"
  - "cartography"
  - "map project"
  - "codebase structure"
  - "where are files located"
---

# Codebase Cartographer & Architecture Graphify

This skill provides immediate, token-efficient workspace mapping, ensuring you know the exact location of every module, config, entry point, and component without running dozens of costly exploratory tool calls.

## Core Rules for Token-Efficient Navigation

1. **Rely on Cartography Index**:
   - Use the pre-computed `<codebase_cartography>` index provided at session start.
   - Do NOT run broad `list_dir` or recursive `find_by_name` commands if the file path is already indexed.

2. **Direct File Targeting**:
   - When asked to modify or inspect code, jump straight to the specific file path from the cartography map.
   - Use targeted slice line ranges (`StartLine`/`EndLine`) when viewing files instead of loading entire large documents into context.

3. **Architecture Mapping (`/graph`)**:
   - When the user asks for a project map, return a concise Mermaid dependency diagram with clear node labels.
