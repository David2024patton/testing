# docs/vibeController.md - Current Location
# src/vibeController.ts - File Source

vibeCodingWebview

**Purpose**  
- Central coordinator: picks LLM client, sets up hardware/dependency checks, telemetry, and the WebView + AutoCoder flows.

**Constructor**  
- Reads provider from `SettingsManager`, instantiates the correct `LLMClient` (Ollama, OpenAI, etc.).  
- Creates `FileManager`, `UIManager`, `HardwareDetector`, `DependencyManager`, `TerminalManager`, `TaskParser`, `ErrorRecovery`, and `AutoCoder`.  
- Detects hardware → updates WebView → validates environment → checks/install dependencies → pulls default model → starts telemetry.

**Methods**  
- `start()`: Creates or reveals the WebView and logs/resumes last project context.  
- `stop()`, `generateDocumentation()`, `backupProject()`: Proxy to `AutoCoder`.  
- Provider/endpoint/key/model update handlers: write back to `SettingsManager`.  
- `startAuto()`, `stopAuto()`: Track last task in `projectContexts`, then call into `AutoCoder`.

**Modification Points**  
- To add a new LLM provider: update the switch in the constructor.  
- To change telemetry logic: wrap calls in `settings.isTelemetryEnabled()`.  
