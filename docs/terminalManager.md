# docs/terminalManager.md - Current Location
# src/terminalManager.ts - File Source

**Purpose**  
- Wraps VS Code `tasks.executeTask` to run shell commands.  
- Provides `checkDependencies()` for CUDA/Ollama installs.  
- Returns `{ success, output }` for each task.

**Primary API**  
- `runCommand(command: string, workspacePath: string): Promise<{ success: boolean; output: string }>`  
- `checkDependencies(hardwareInfo)`

**Modification Points**  
- To support additional package managers (apt, brew), extend `checkDependencies`.  
- To change how tasks are executed (e.g. integrated terminal), adjust `Task` creation.  
