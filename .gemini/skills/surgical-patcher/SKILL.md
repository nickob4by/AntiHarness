---
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
   - Use `replace_file_content` with precise `StartLine` and `EndLine` parameters.
   - Replace only the function or block that needs changing (e.g. 5-20 lines).
   - NEVER overwrite a 500-line file when only 3 lines are changing.

2. **Preserve Surrounding Integrity**:
   - Maintain all unrelated comments, docstrings, imports, and formatting.
   - Avoid indiscriminate full-file replacements.
