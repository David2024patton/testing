/**
 * File: src/ollamaClient.ts
 * Location: src/ollamaClient.ts
 * Description: Client for interacting with the Ollama LLM API.
 * Supports multiple endpoints (local HTTP, Docker/Podman internal), attempts fallback,
 * and pulls/generates code with configurable performance mode.
 * NOTE: If Ollama API endpoints or auth change, update constructor logic and options.
 *
 * Purpose:
 * - Client for interacting with the Ollama LLM API.
 * - Supports multiple endpoints (local HTTP, Docker/Podman internal).
 * - Attempts connection fallback between endpoints.
 * - Pulls/generates code with configurable performance mode.
 *
 * API:
 * - `setupDefaultModel(): Promise<void>` - Pulls and caches the default model.
 * - `getAvailableModels(): Promise<string[]>` - Lists available models.
 * - `generateCode(prompt: string, customConfig?: Record<string, any>): Promise<string>` - Generates code.
 * - `setPerformanceMode(mode: string): void` - Updates performance settings.
 * - `setModel(model: string): void` - Selects a different model.
 *
 * Modification Points:
 * - To add new endpoints, update the constructor's endpoint list.
 * - To change performance settings, modify the `num_ctx` and `temperature` values.
 */

import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';
import { Logger } from './logger';
import { SettingsManager } from './settingsManager';

export class OllamaClient {
  private api: AxiosInstance;
  private currentModel: string = 'codellama:7b';
  private performanceMode: string;
  private logger: Logger;

  /**
   * Attempts to connect to Ollama using configured endpoints in order:
   * 1) Local URL (e.g. http://localhost:11434)
   * 2) Docker/Podman internal URL (e.g. http://host.docker.internal:11434)
   * 3) Custom endpoint if provided
   * @param settings SettingsManager for retrieving endpoint configs
   * @param logger   Logger instance
   */
  constructor(settings: SettingsManager, logger: Logger) {
    this.logger = logger;
    // Retrieve user-configured endpoints
    const localUrl = settings.getConfiguration<string>('ollamaUrlLocal', 'http://localhost:11434');
    const dockerUrl = settings.getConfiguration<string>('ollamaUrlDocker', 'http://host.docker.internal:11434');
    const custom = settings.getConfiguration<string>('ollamaUrlCustom', '');
    const endpoints = [localUrl, dockerUrl];
    if (custom) endpoints.unshift(custom);

    // Determine working endpoint by pinging /api/tags
    let chosen = endpoints[0];
    for (const url of endpoints) {
      try {
        axios.get(`${url}/api/tags`, { timeout: 2000 });
        chosen = url;
        break;
      } catch {
        this.logger.warn(`Ollama endpoint unreachable: ${url}`);
      }
    }

    this.api = axios.create({ baseURL: chosen });
    this.logger.info(`OllamaClient using endpoint: ${chosen}`);

    // Default performance mode is 'high', but user can override
    this.performanceMode = settings.getConfiguration<string>('performance', 'high');
    this.logger.info(`OllamaClient performance mode: ${this.performanceMode}`);
  }

  /**
   * Pulls and caches the default model on the local Ollama server.
   */
  public async setupDefaultModel(): Promise<void> {
    try {
      const res = await this.api.post('/api/pull', { name: this.currentModel });
      if (res.status === 200) {
        this.logger.info('Default model pulled', { model: this.currentModel });
        vscode.window.showInformationMessage(`Default model ${this.currentModel} ready! 🎉`);
      }
    } catch (err: any) {
      this.logger.error('Failed to pull default model', err);
      throw new Error(`Ollama pull failed: ${err.message}`);
    }
  }

  /**
   * Retrieves a list of available model names.
   */
  public async getAvailableModels(): Promise<string[]> {
    try {
      const res = await this.api.get('/api/tags');
      return (res.data.models || []).map((m: any) => m.name);
    } catch (err: any) {
      this.logger.error('Failed to list models', err);
      throw new Error(`Ollama list tags failed: ${err.message}`);
    }
  }

  /**
   * Generates code using the current model and performance settings.
   */
  public async generateCode(prompt: string, customConfig: Record<string, any> = {}): Promise<string> {
    try {
      const payload = {
        model: this.currentModel,
        prompt,
        stream: false,
        options: {
          num_ctx: this.performanceMode === 'efficient' ? 2048 : 4096,
          temperature: 0.7,
          ...customConfig
        }
      };
      const res = await this.api.post('/api/generate', payload);
      this.logger.info('Generated code from Ollama', { prompt });
      return res.data.response;
    } catch (err: any) {
      this.logger.error('Code generation failed', err);
      throw new Error(`Ollama generate failed: ${err.message}`);
    }
  }

  /**
   * Updates performance mode; persists for future requests.
   */
  public setPerformanceMode(mode: string): void {
    this.performanceMode = mode;
    this.logger.info(`Performance mode set to ${mode}`);
  }

  /**
   * Selects a different model for generation.
   */
  public setModel(model: string): void {
    this.currentModel = model;
    this.logger.info(`Model set to ${model}`);
  }
}
