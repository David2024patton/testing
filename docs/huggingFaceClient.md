# docs/huggingFaceClient.md - Current Location
# src/huggingFaceClient.ts - File Source

**Purpose**  
- Client for interacting with the Hugging Face Inference API.
- Retrieves inference endpoint and model settings from configuration.
- Sends prompts and returns generated text.
- Supports authentication via token and model switching.

**API**  
- `generateCode(prompt: string): Promise<string>` - Generates text/code using the configured model.
- `setModel(model: string): void` - Updates the model identifier for subsequent requests.
- `setToken(token: string): void` - Updates the token for authentication.

**Modification Points**  
- To support additional Hugging Face API features, extend the generateCode method.
- To handle different response formats, update the response parsing logic.
