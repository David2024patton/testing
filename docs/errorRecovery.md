# docs/errorRecovery.md - Current Location
# src/errorRecovery.ts - File Source

**Purpose**  
- Catches runtime/test errors, backs up original code, auto‑installs missing deps,  
  crafts context‑aware prompts, and retrieves fixes from the LLM.  
- Logs structured events and forwards telemetry when enabled.

**API**  
- `analyzeAndFix(errorMsg, filePath): Promise<string>`

**Modification Points**  
- To add new error patterns, update `errorPatterns`.  
- To integrate vault/secret scanning, add pre‑prompt hooks.  
