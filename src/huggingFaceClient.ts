/**
 * File: src/huggingFaceClient.ts
 * Location: src/huggingFaceClient.ts
 * Description: Client for interacting with the Hugging Face Inference API.
 * Retrieves inference endpoint and model settings from configuration, sends prompts,
 * and returns generated text. Supports authentication via token and model switching.
 * NOTE: If Hugging Face API endpoints or auth schemes change, update constructor logic.
 *
 * Purpose:
 * - Client for interacting with the Hugging Face Inference API.
 * - Retrieves inference endpoint and model settings from configuration.
 * - Sends prompts and returns generated text.
 * - Supports authentication via token and model switching.
 *
 * API:
 * - `generateCode(prompt: string): Promise<string>` - Generates text/code using the configured model.
 * - `setModel(model: string): void` - Updates the model identifier for subsequent requests.
 * - `setToken(token: string): void` - Updates the token for authentication.
 *
 * Modification Points:
 * - To support additional Hugging Face API features, extend the generateCode method.
 * - To handle different response formats, update the response parsing logic.
 */

import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';
import { Logger } from './logger';
import { SettingsManager } from './settingsManager';

export class HuggingFaceClient {
  private api: AxiosInstance;
  private model: string;
  private logger: Logger;

  /**
   * @param settings SettingsManager for retrieving HF endpoint, token, and model
   * @param logger   Logger instance
   */
  constructor(settings: SettingsManager, logger: Logger) {
    this.logger = logger;
    // Retrieve configuration
    const baseUrl = settings.getConfiguration<string>(
      'huggingfaceEndpoint',
      'https://api-inference.huggingface.co/models'
    );
    const token = settings.getConfiguration<string>('huggingfaceToken', '');
    this.model = settings.getConfiguration<string>('huggingfaceModel', '');

    if (!this.model) {
      vscode.window.showWarningMessage(
        'Hugging Face model is not configured. Please set `huggingfaceModel` in settings.'
      );
    }
    if (!token) {
      vscode.window.showWarningMessage(
        'Hugging Face token is not configured. API calls may fail without authentication.'
      );
    }

    // Create axios instance with auth header
    this.api = axios.create({
      baseURL: baseUrl,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    this.logger.info(`HuggingFaceClient initialized for model: ${this.model}`);
  }

  /**
   * Generates text/code using the configured Hugging Face model.
   * @param prompt Natural-language prompt or code instruction
   * @returns Generated text response
   */
  public async generateCode(prompt: string): Promise<string> {
    if (!this.model) {
      throw new Error('Hugging Face model not set.');
    }
    try {
      // HF inference API expects POST to /models/{model}
      const response = await this.api.post(`/${this.model}`, {
        inputs: prompt,
        options: { wait_for_model: true }
      });
      // Response can vary; assume text is in response.data[0].generated_text or response.data
      const data = response.data;
      let generated = '';
      if (Array.isArray(data) && data[0]?.generated_text) {
        generated = data[0].generated_text;
      } else if (typeof data === 'object' && 'generated_text' in data) {
        generated = (data as any).generated_text;
      } else {
        generated = JSON.stringify(data);
      }
      this.logger.info('Hugging Face generate succeeded', { prompt, model: this.model });
      return generated;
    } catch (error: any) {
      this.logger.error('Hugging Face generation failed', error);
      throw new Error(`Hugging Face generate failed: ${error.message}`);
    }
  }

  /**
   * Updates the model identifier for subsequent requests.
   * @param model Full model name (e.g., 'facebook/opt-1.3b')
   */
  public setModel(model: string): void {
    this.model = model;
    this.logger.info(`Hugging Face model set to ${model}`);
  }

  /**
   * Updates the token for authentication.
   * @param token New HF API token
   */
  public setToken(token: string): void {
    this.api.defaults.headers['Authorization'] = `Bearer ${token}`;
    this.logger.info('Hugging Face token updated');
  }
}
