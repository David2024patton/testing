# docs/dependencyManager.md - Current Location
# src/dependencyManager.ts - File Source

**Purpose**  
- Validates installed versions of Node, Python, Java.  
- Resolves conflicts via `winget upgrade` (Windows).

**API**  
- `validateEnvironment(): Promise<{ success: boolean; conflicts? }>`  
- `resolveConflicts(conflicts): Promise<Resolution[]>`

**Modification Points**  
- To support Linux/macOS, replace `winget` with `apt`, `brew`, etc.  
