# docs/autoCoder.md - Current Location
# src/autoCoder.ts - File Source

**Purpose**  
- Drives the full “vibe” workflow:  
  1. Project scaffolding  
  2. Task parsing  
  3. Code generation via LLM  
  4. File writes & backups  
  5. Test execution & auto‑fix via `ErrorRecovery`  
  6. Quality/security scans  
  7. Git & CI/CD setup  
  8. Documentation & backups

**Public Methods**  
- `startAutoMode(specs, model, performance, language, logCb)`  
- `generateDocumentation()`  
- `backupProject()`

**Helper Methods**  
- `setupStructure()`, `testAndFix()`, `runQualityChecks()`, `setupGit()`, `generateCICD()`, `createProjectConfig()`, `generateConfigContent()`.

**Your 30‑point roadmap**  
Persistent history, checkpoints, parallel tasks, streaming feedback, hooks, interactive mid‑flow, snippet insertion, refactoring passes, DI boilerplate, coverage enforcement, adaptive retries, metrics, multi‑language, dry‑run, rollback, branching, debug sessions, code reviews, external docs, infra provisioning, secret management, collaboration, refactoring requests, plugin API, scheduling, file metadata, conflict resolution, adaptive modes, task graph visualization, cost dashboard.

**Modification Points**  
- To add new pipeline stages, insert steps in `startAutoMode`.  
- To change scaffolding, update `createProjectConfig`.  
- To add metrics, inject calls to a new `MetricsCollector` service.  
