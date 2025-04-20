/**
 * File: src/AIClients.ts
 * Location: src/AIClients.ts
 * Description: Consolidates all supported LLM client implementations behind a single factory.
 * Each client implements LLMClient and accepts (settings, logger) in its constructor.
 * NOTE: When adding or removing providers, update this header and the factory switch.
 *
 * Purpose:
 * - Defines `LLMClient` interface (generateCode, optional getAvailableModels, setModel, setApiKey).
 * - Implements a client class for each provider:
 *   - **OllamaClient**: local or Docker, auto‑discovers reachable endpoint.
 *   - **OpenAIClient**: `/v1/chat/completions`.
 *   - **HuggingFaceClient**: `/models/{id}`, handles array vs. object response.
 *   - **GrokClient**, **DeepSeekClient**, **SurferAIClient**, **YouChatClient**, **SemrushClient**, **PiAIClient**, **MistralAIClient**.
 *   - **Stub classes** for Copilot, Gemini, Claude, Llama, Perplexity, Jasper, ChatSonic, Undetectable, CharacterAI, ClickUp, Writesonic, CodeWhisperer.
 *
 * - Exports `createLLMClient(settings, logger)` factory that
 *   reads `vibecoding.provider` and returns the matching client (or falls back to Ollama).
 *
 * Modification Points:
 * - To add a real implementation for a stub: replace stub's `generateCode` with actual API calls and update its import.
 * - To add a new provider: implement `LLMClient` + update the factory switch.
 */

import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';
import { SettingsManager } from './settingsManager';
import { Logger } from './logger';
import { OpenAIClient } from './openAIClient';

/**
 * Common interface for all LLM clients.
 */
export interface LLMClient {
  generateCode(prompt: string, opts?: Record<string, any>): Promise<string>;
  getAvailableModels?(): Promise<string[]>;
  setModel?(model: string): void;
  setApiKey?(key: string): void;
}

//////////////////////////////
// Ollama (local/Docker)     //
//////////////////////////////
class OllamaClient implements LLMClient {
  private api: AxiosInstance;
  private model = 'codellama:7b';
  private perf: string;

  constructor(private settings: SettingsManager, private logger: Logger) {
    const urls = [
      settings.getConfiguration<string>('vibecoding.ollamaUrlCustom',''),
      settings.getConfiguration<string>('vibecoding.ollamaUrlLocal','http://localhost:11434'),
      settings.getConfiguration<string>('vibecoding.ollamaUrlDocker','http://host.docker.internal:11434')
    ].filter(u => u);
    let base = '';
    for (const u of urls) {
      try { axios.get(`${u}/api/tags`, { timeout: 500 }); base = u; break; }
      catch { logger.warn(`Ollama unreachable at ${u}`); }
    }
    this.api = axios.create({ baseURL: base });
    this.perf = settings.getConfiguration<string>('vibecoding.performance','balanced');
    this.logger.info(`OllamaClient @${base} perf=${this.perf}`);
  }

  async generateCode(prompt: string): Promise<string> {
    const opts = { num_ctx: this.perf === 'efficient' ? 2048 : 4096, temperature: 0.7 };
    const res = await this.api.post('/api/generate', { model: this.model, prompt, stream: false, options: opts });
    return res.data.response;
  }

  async getAvailableModels(): Promise<string[]> {
    const res = await this.api.get('/api/tags');
    return res.data.models.map((m: any) => m.name);
  }

  setModel(m: string) { this.model = m; this.logger.info(`Ollama model set to ${m}`); }
}

// OpenAI client is now imported from './openAIClient'

//////////////////////////////
// Hugging Face             //
//////////////////////////////
class HuggingFaceClient implements LLMClient {
  private api: AxiosInstance;
  private model: string;

  constructor(private settings: SettingsManager, private logger: Logger) {
    const ep = settings.getConfiguration<string>('vibecoding.huggingfaceEndpoint','https://api-inference.huggingface.co/models');
    const tk = settings.getConfiguration<string>('vibecoding.huggingfaceToken','');
    this.model = settings.getConfiguration<string>('vibecoding.huggingfaceModel','');
    this.api = axios.create({ baseURL: ep, headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
    this.logger.info(`HuggingFaceClient model=${this.model}`);
  }

  async generateCode(prompt: string): Promise<string> {
    const r = await this.api.post(`/${this.model}`, { inputs: prompt, options: { wait_for_model: true } });
    const d = r.data;
    return Array.isArray(d) ? d[0].generated_text : d.generated_text;
  }

  setModel(m: string) { this.model = m; this.logger.info(`HF model set to ${m}`); }
}

//////////////////////////////
// Grok (xAI)               //
//////////////////////////////
class GrokClient implements LLMClient {
  private api: AxiosInstance;

  constructor(private settings: SettingsManager, private logger: Logger) {
    const key = settings.getConfiguration<string>('vibecoding.grokApiKey','');
    const ep = settings.getConfiguration<string>('vibecoding.grokEndpoint','https://api.grok.ai/chat/completions');
    this.api = axios.create({ baseURL: ep, headers: { Authorization: `Bearer ${key}` } });
    this.logger.info('GrokClient initialized');
  }

  async generateCode(prompt: string): Promise<string> {
    const r = await this.api.post('', { model: 'grok-3-beta', messages: [{ role: 'user', content: prompt }] });
    return r.data.choices[0].message.content;
  }
}

//////////////////////////////
// DeepSeek                 //
//////////////////////////////
class DeepSeekClient implements LLMClient {
  private api: AxiosInstance;

  constructor(private settings: SettingsManager, private logger: Logger) {
    const key = settings.getConfiguration<string>('vibecoding.deepseekApiKey','');
    const ep = settings.getConfiguration<string>('vibecoding.deepseekEndpoint','https://api.deepseek.com/v1/chat/completions');
    this.api = axios.create({ baseURL: ep, headers: { Authorization: `Bearer ${key}` } });
    this.logger.info('DeepSeekClient initialized');
  }

  async generateCode(prompt: string): Promise<string> {
    const r = await this.api.post('', { model: 'deepseek-1', prompt });
    return r.data.choices[0].text;
  }
}

//////////////////////////////
// Surfer AI                //
//////////////////////////////
class SurferAIClient implements LLMClient {
  private api: AxiosInstance;

  constructor(private settings: SettingsManager, private logger: Logger) {
    const key = settings.getConfiguration<string>('vibecoding.surferApiKey','');
    const ep = settings.getConfiguration<string>('vibecoding.surferEndpoint','https://api.surferseo.com/v1/content/create');
    this.api = axios.create({ baseURL: ep, headers: { Authorization: `Bearer ${key}` } });
    this.logger.info('SurferAIClient initialized');
  }

  async generateCode(prompt: string): Promise<string> {
    const r = await this.api.post('', { title: '', content: prompt });
    return r.data.content;
  }
}

//////////////////////////////
// YouChat                  //
//////////////////////////////
class YouChatClient implements LLMClient {
  private api: AxiosInstance;

  constructor(private settings: SettingsManager, private logger: Logger) {
    const key = settings.getConfiguration<string>('vibecoding.youChatApiKey','');
    const ep = settings.getConfiguration<string>('vibecoding.youChatEndpoint','https://api.you.com/public_api/v1/chat');
    this.api = axios.create({ baseURL: ep, headers: { Authorization: `Bearer ${key}` } });
    this.logger.info('YouChatClient initialized');
  }

  async generateCode(prompt: string): Promise<string> {
    const r = await this.api.post('', { query: prompt });
    return r.data.answers?.[0] || r.data.response;
  }
}

//////////////////////////////
// Semrush                  //
//////////////////////////////
class SemrushClient implements LLMClient {
  private api: AxiosInstance;

  constructor(private settings: SettingsManager, private logger: Logger) {
    const key = settings.getConfiguration<string>('vibecoding.semrushApiKey','');
    const ep = settings.getConfiguration<string>('vibecoding.semrushEndpoint','https://api.semrush.com/');
    this.api = axios.create({ baseURL: ep, params: { key } });
    this.logger.info('SemrushClient initialized');
  }

  async generateCode(prompt: string): Promise<string> {
    const r = await this.api.get('', { params: { type: 'generate', text: prompt } });
    return r.data;
  }
}

//////////////////////////////
// Pi.ai                    //
//////////////////////////////
class PiAIClient implements LLMClient {
  private api: AxiosInstance;

  constructor(private settings: SettingsManager, private logger: Logger) {
    const key = settings.getConfiguration<string>('vibecoding.piApiKey','');
    const ep = settings.getConfiguration<string>('vibecoding.piEndpoint','https://api.piapi.ai/v1/generate');
    this.api = axios.create({ baseURL: ep, headers: { Authorization: `Bearer ${key}` } });
    this.logger.info('PiAIClient initialized');
  }

  async generateCode(prompt: string): Promise<string> {
    const r = await this.api.post('', { inputs: prompt });
    return r.data.output;
  }
}

//////////////////////////////
// Mistral.ai               //
//////////////////////////////
class MistralAIClient implements LLMClient {
  private api: AxiosInstance;

  constructor(private settings: SettingsManager, private logger: Logger) {
    const key = settings.getConfiguration<string>('vibecoding.mistralApiKey','');
    const ep = settings.getConfiguration<string>('vibecoding.mistralEndpoint','https://api.mistral.ai/v1/models/generation');
    this.api = axios.create({ baseURL: ep, headers: { Authorization: `Bearer ${key}` } });
    this.logger.info('MistralAIClient initialized');
  }

  async generateCode(prompt: string): Promise<string> {
    const r = await this.api.post('', { model: 'mistral-7b', prompt });
    return r.data.output;
  }
}

//////////////////////////////
// Additional Provider Stubs //
//////////////////////////////
class CopilotClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('CopilotClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}
class GeminiClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('GeminiClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}
class ClaudeClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('ClaudeClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}
class LlamaClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('LlamaClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}
class PerplexityClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('PerplexityClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}
class JasperClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('JasperClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}
class ChatSonicClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('ChatSonicClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}
class UndetectableClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('UndetectableClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}
class CharacterAIClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('CharacterAIClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}
class ClickUpClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('ClickUpClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}
class WritesonicClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('WritesonicClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}
class CodeWhispererClient implements LLMClient { constructor(settings: SettingsManager, logger: Logger){ logger.info('CodeWhispererClient stub'); } async generateCode(): Promise<string>{ throw new Error('Not implemented'); }}

/**
 * Factory: instantiate the configured provider.
 */
export function createLLMClient(
  settings: SettingsManager,
  logger: Logger
): LLMClient {
  const provider = settings.getConfiguration<string>('vibecoding.provider', 'ollama').toLowerCase();
  switch (provider) {
    case 'ollama':       return new OllamaClient(settings, logger);
    case 'openai':       return new OpenAIClient(settings, logger);
    case 'huggingface':  return new HuggingFaceClient(settings, logger);
    case 'grok':         return new GrokClient(settings, logger);
    case 'deepseek':     return new DeepSeekClient(settings, logger);
    case 'surferai':     return new SurferAIClient(settings, logger);
    case 'youchat':      return new YouChatClient(settings, logger);
    case 'semrush':      return new SemrushClient(settings, logger);
    case 'pi.ai':        return new PiAIClient(settings, logger);
    case 'mistral.ai':   return new MistralAIClient(settings, logger);
    case 'copilot':      return new CopilotClient(settings, logger);
    case 'gemini':       return new GeminiClient(settings, logger);
    case 'claude':       return new ClaudeClient(settings, logger);
    case 'llama':        return new LlamaClient(settings, logger);
    case 'perplexity':   return new PerplexityClient(settings, logger);
    case 'jasper':       return new JasperClient(settings, logger);
    case 'chatsonic':    return new ChatSonicClient(settings, logger);
    case 'undetectable': return new UndetectableClient(settings, logger);
    case 'character.ai': return new CharacterAIClient(settings, logger);
    case 'clickup':      return new ClickUpClient(settings, logger);
    case 'writesonic':   return new WritesonicClient(settings, logger);
    case 'codewhisperer':return new CodeWhispererClient(settings, logger);
    default:
      logger.warn(`Provider '${provider}' not supported; falling back to Ollama.`);
      return new OllamaClient(settings, logger);
  }
}
