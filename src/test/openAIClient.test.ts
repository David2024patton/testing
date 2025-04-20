/**
 * Test file for OpenAIClient
 */

import * as assert from 'assert';
import { OpenAIClient } from '../openAIClient';
import { SettingsManager } from '../settingsManager';
import { Logger } from '../logger';

// Mock dependencies
class MockSettingsManager {
  getOpenAIKey() { return 'test-key'; }
  getOpenAIModel() { return 'gpt-3.5-turbo'; }
  getConfiguration(key: string, defaultValue: any) { 
    if (key === 'vibecoding.openaiApiKey') return 'test-key';
    if (key === 'vibecoding.openaiModel') return 'gpt-3.5-turbo';
    return defaultValue;
  }
  isTelemetryEnabled() { return false; }
}

class MockLogger {
  info(message: string, meta?: any) { console.log(message, meta); }
  warn(message: string, meta?: any) { console.warn(message, meta); }
  error(message: string, meta?: any) { console.error(message, meta); }
}

describe('OpenAIClient', () => {
  let client: OpenAIClient;
  let settings: any;
  let logger: any;

  beforeEach(() => {
    settings = new MockSettingsManager() as unknown as SettingsManager;
    logger = new MockLogger() as unknown as Logger;
    client = new OpenAIClient(settings, logger);
  });

  it('should initialize with settings', () => {
    assert.strictEqual((client as any).apiKey, 'test-key');
    assert.strictEqual((client as any).model, 'gpt-3.5-turbo');
  });

  it('should update API key', () => {
    client.setApiKey('new-key');
    assert.strictEqual((client as any).apiKey, 'new-key');
  });

  it('should update model', () => {
    client.setModel('gpt-4');
    assert.strictEqual((client as any).model, 'gpt-4');
  });

  it('should update performance mode', () => {
    (client as any).setPerformanceMode('high');
    assert.strictEqual((client as any).temperature, 0.8);
    assert.strictEqual((client as any).maxTokens, 8192);

    (client as any).setPerformanceMode('efficient');
    assert.strictEqual((client as any).temperature, 0.5);
    assert.strictEqual((client as any).maxTokens, 2048);
  });
});
