# docs/settingsManager.md - Current Location
# src/settingsManager.ts - File Source

**Purpose**  
- Typed access to every `vibecoding.*` setting.  
- Includes provider enum, multiple Ollama URLs, API keys, performance, autosave, telemetry flags.

**API**  
- `getProvider(): Provider`  
- `getOllamaUrls(): string[]`  
- `getOpenAIKey()`, `getOpenAIModel()`  
- `getHuggingFaceToken()`, `getHuggingFaceModel()`, `getHuggingFaceEndpoint()`  
- `getPerformanceMode()`, `isAutoSaveEnabled()`, `isTelemetryEnabled()`  
- `updateConfiguration(key, value)`

**Modification Points**  
- To add a new provider config, extend the `Provider` type and expose new getters.  
