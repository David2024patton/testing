# docs/AIClients.md - Current Location
# src/AIClients.ts - File Source

**Purpose**  
- Defines `LLMClient` interface (generateCode, optional getAvailableModels, setModel, setApiKey).  
- Implements a client class for each provider:  
  - **OllamaClient**: local or Docker, auto‑discovers reachable endpoint.  
  - **OpenAIClient**: `/v1/chat/completions`.  
  - **HuggingFaceClient**: `/models/{id}`, handles array vs. object response.  
  - **GrokClient**, **DeepSeekClient**, **SurferAIClient**, **YouChatClient**, **SemrushClient**, **PiAIClient**, **MistralAIClient**.  
  - **Stub classes** for Copilot, Gemini, Claude, Llama, Perplexity, Jasper, ChatSonic, Undetectable, CharacterAI, ClickUp, Writesonic, CodeWhisperer.

- Exports `createLLMClient(settings, logger)` factory that  
  reads `vibecoding.provider` and returns the matching client (or falls back to Ollama).

**Modification Points**  
- To add a real implementation for a stub: replace stub’s `generateCode` with actual API calls and update its import.  
- To add a new provider: implement `LLMClient` + update the factory switch.  
