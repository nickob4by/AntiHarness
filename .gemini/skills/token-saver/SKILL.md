---
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
   - Always specify `StartLine` and `EndLine` parameters when reading files. View only the relevant 50-100 line functions rather than entire 1,000+ line files.
   - Limit `grep_search` and command outputs to tight matches.

3. **Pruned Terminal Commands**:
   - Run terminal commands with targeted filters (e.g. `npm test -- -t "auth"`, `git status -s`, `git log -n 3`).
