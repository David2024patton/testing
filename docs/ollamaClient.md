# docs/ollamaClient.md - Current Location
# src/ollamaClient.ts - File Source

**Purpose**  
- Client for interacting with the Ollama LLM API.
- Supports multiple endpoints (local HTTP, Docker/Podman internal).
- Attempts connection fallback between endpoints.
- Pulls/generates code with configurable performance mode.

**API**  
- `setupDefaultModel(): Promise<void>` - Pulls and caches the default model.
- `getAvailableModels(): Promise<string[]>` - Lists available models.
- `generateCode(prompt: string, customConfig?: Record<string, any>): Promise<string>` - Generates code.
- `setPerformanceMode(mode: string): void` - Updates performance settings.
- `setModel(model: string): void` - Selects a different model.

**Modification Points**  
- To add new endpoints, update the constructor's endpoint list.
- To change performance settings, modify the `num_ctx` and `temperature` values.
