/**
 * File: src/settingsManager.ts
 * Location: src/settingsManager.ts
 * Description: Manages retrieval and validation of extension settings.
 * Provides typed accessors for all vibecoding.* properties, including logLevel.
 * NOTE: If adding new configuration keys, update this header accordingly.
 *
 * Purpose:
 * - Typed access to every `vibecoding.*` setting.
 * - Includes provider enum, multiple Ollama URLs, API keys, performance, autosave, telemetry flags.
 *
 * API:
 * - `getProvider(): Provider`
 * - `getOllamaUrls(): string[]`
 * - `getOpenAIKey()`, `getOpenAIModel()`
 * - `getHuggingFaceToken()`, `getHuggingFaceModel()`, `getHuggingFaceEndpoint()`
 * - `getPerformanceMode()`, `isAutoSaveEnabled()`, `isTelemetryEnabled()`
 * - `updateConfiguration(key, value)`
 *
 * Modification Points:
 * - To add a new provider config, extend the `Provider` type and expose new getters.
 */

import * as vscode from 'vscode';
import { LogLevel } from './logger';

/**
 * Supported LLM providers
 */
export type Provider =
  | 'ollama'
  | 'openai'
  | 'huggingface'
  | 'grok'
  | 'deepseek'
  | 'surferai'
  | 'youchat'
  | 'semrush'
  | 'pi.ai'
  | 'mistral.ai'
  | 'copilot'
  | 'gemini'
  | 'claude'
  | 'llama'
  | 'perplexity'
  | 'jasper'
  | 'chatsonic'
  | 'undetectable'
  | 'character.ai'
  | 'clickup'
  | 'writesonic'
  | 'codewhisperer';

/**
 * Wrapper around VS Code configuration for "vibecoding" section.
 */
export class SettingsManager {
  private readonly section = 'vibecoding';
  private cfg() {
    return vscode.workspace.getConfiguration(this.section);
  }

  /** Generic getter with optional default */
  public getConfiguration<T>(key: string, defaultValue?: T): T {
    const value = this.cfg().get<T>(key, defaultValue as T);
    if (value === undefined) {
      throw new Error(`Configuration '${this.section}.${key}' is undefined`);
    }
    return value;
  }

  /** Update a configuration key (workspace or global) */
  public updateConfiguration(
    key: string,
    value: any,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
  ): vscode.Thenable<void> {
    return this.cfg().update(key, value, target);
  }

  /** Retrieve the configured LLM provider */
  public getProvider(): Provider {
    return this.getConfiguration<Provider>('provider', 'ollama');
  }

  /** Retrieve the configured minimum log level */
  public getLogLevel(): LogLevel {
    return this.getConfiguration<LogLevel>('logLevel', 'info');
  }

  /** List of known Ollama endpoints: custom, local, docker */
  public getOllamaUrls(): string[] {
    return [
      this.getConfiguration<string>('ollamaUrlCustom',''),
      this.getConfiguration<string>('ollamaUrlLocal','http://localhost:11434'),
      this.getConfiguration<string>('ollamaUrlDocker','http://host.docker.internal:11434'),
    ].filter(u => !!u);
  }

  /** OpenAI specific */
  public getOpenAIKey(): string {
    return this.getConfiguration<string>('openaiApiKey','');
  }
  public getOpenAIModel(): string {
    return this.getConfiguration<string>('openaiModel','gpt-3.5-turbo');
  }

  /** Hugging Face specific */
  public getHuggingFaceToken(): string {
    return this.getConfiguration<string>('huggingfaceToken','');
  }
  public getHuggingFaceModel(): string {
    return this.getConfiguration<string>('huggingfaceModel','');
  }
  public getHuggingFaceEndpoint(): string {
    return this.getConfiguration<string>(
      'huggingfaceEndpoint',
      'https://api-inference.huggingface.co/models'
    );
  }

  /** Generic performance and autosave */
  public getPerformanceMode(): 'high' | 'balanced' | 'efficient' {
    return this.getConfiguration<'high' | 'balanced' | 'efficient'>('performance','balanced');
  }
  public isAutoSaveEnabled(): boolean {
    return this.getConfiguration<boolean>('autoSave', true);
  }
  public isTelemetryEnabled(): boolean {
    return this.getConfiguration<boolean>('enableTelemetry', false);
  }
}
