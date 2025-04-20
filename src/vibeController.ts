/**
 * File: src/vibeController.ts
 * Location: src/vibeController.ts
 * Description: Central controller for the VibeCoding extension, coordinating all components.
 * Manages LLM client selection, hardware detection, dependency checks, and WebView integration.
 * NOTE: When adding new providers or changing controller logic, update this header accordingly.
 *
 * Purpose:
 * - Central coordinator: picks LLM client, sets up hardware/dependency checks, telemetry, and the WebView + AutoCoder flows.
 *
 * Constructor:
 * - Reads provider from `SettingsManager`, instantiates the correct `LLMClient` (Ollama, OpenAI, etc.).
 * - Creates `FileManager`, `UIManager`, `HardwareDetector`, `DependencyManager`, `TerminalManager`, `TaskParser`, `ErrorRecovery`, and `AutoCoder`.
 * - Detects hardware → updates WebView → validates environment → checks/install dependencies → pulls default model → starts telemetry.
 *
 * Methods:
 * - `start()`: Creates or reveals the WebView and logs/resumes last project context.
 * - `stop()`, `generateDocumentation()`, `backupProject()`: Proxy to `AutoCoder`.
 * - Provider/endpoint/key/model update handlers: write back to `SettingsManager`.
 * - `startAuto()`, `stopAuto()`: Track last task in `projectContexts`, then call into `AutoCoder`.
 *
 * Modification Points:
 * - To add a new LLM provider: update the switch in the constructor.
 * - To change telemetry logic: wrap calls in `settings.isTelemetryEnabled()`.
 */

import * as vscode from 'vscode';
import { createLLMClient, LLMClient } from './AIClients';
import { AutoCoder, AutoCoderConfig } from './autoCoder';
import { DependencyManager } from './dependencyManager';
import { ErrorRecovery } from './errorRecovery';
import { FileManager } from './fileManager';
import { HardwareDetector, HardwareInfo } from './hardwareDetector';
import { Logger } from './logger';
import { SettingsManager } from './settingsManager';
import { TaskParser } from './taskParser';
import { TerminalManager } from './terminalManager';
import { UIManager } from './uiManager';
import { VibeCodingWebview, WebviewHandlers } from './vibeCodingWebview';

/**
 * Record of project context for persistence
 */
interface ProjectContext {
  lastTask?: string;
  lastModel?: string;
  lastPerformance?: string;
  lastLanguage?: string;
}

/**
 * Main controller for the VibeCoding extension
 */
export class VibeController {
  private llm: LLMClient;
  private fileManager: FileManager;
  private uiManager: UIManager;
  private hardwareDetector: HardwareDetector;
  private dependencyManager: DependencyManager;
  private terminalManager: TerminalManager;
  private taskParser: TaskParser;
  private errorRecovery: ErrorRecovery;
  private autoCoder: AutoCoder;
  private webview: VibeCodingWebview | undefined;
  private hardwareInfo: HardwareInfo | undefined;
  private monitoringActive = false;

  /**
   * Creates the controller and initializes all components
   */
  constructor(
    private context: vscode.ExtensionContext,
    private logger: Logger,
    private workspaceIndex: Record<string, string[]>,
    private projectContexts: Record<string, ProjectContext>,
    private settings: SettingsManager
  ) {
    // 1. Create the LLM client based on settings
    this.llm = createLLMClient(settings, logger);

    // 2. Initialize all components
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceRoot) {
      throw new Error('No workspace folder open');
    }

    this.fileManager = new FileManager(workspaceRoot, logger);
    this.uiManager = new UIManager();
    this.hardwareDetector = new HardwareDetector(logger);
    this.terminalManager = new TerminalManager(context, logger);
    this.dependencyManager = new DependencyManager(this.terminalManager, logger);
    this.taskParser = new TaskParser(logger);
    this.errorRecovery = new ErrorRecovery(this.llm, logger, settings, context);

    // 3. Create AutoCoder with config from settings
    const autoCoderConfig: AutoCoderConfig = {
      performance: settings.getPerformanceMode(),
      autoSave: settings.isAutoSaveEnabled()
    };

    this.autoCoder = new AutoCoder(
      this.llm,
      this.terminalManager,
      this.taskParser,
      this.errorRecovery,
      this.fileManager,
      this.uiManager,
      this.logger,
      autoCoderConfig
    );

    // 4. Initialize hardware detection and environment
    this.initializeEnvironment();
  }

  /**
   * Initializes the environment: hardware detection, dependency checks, model setup
   */
  private async initializeEnvironment(): Promise<void> {
    try {
      // Detect hardware
      this.hardwareInfo = await this.hardwareDetector.detectHardware();
      this.logger.info('Hardware detected', this.hardwareInfo);

      // Validate environment and dependencies
      const validation = await this.dependencyManager.validateEnvironment();
      if (!validation.success) {
        this.logger.warn('Dependency validation failed', { conflicts: validation.conflicts });
        const choice = await this.uiManager.showInformationMessage(
          'Some dependencies are missing. Attempt to resolve?',
          'Yes', 'No'
        );

        if (choice === 'Yes' && validation.conflicts) {
          await this.dependencyManager.resolveConflicts(validation.conflicts);
        }
      }

      // Setup default model if using Ollama
      if (this.settings.getProvider() === 'ollama') {
        try {
          // Check if we have an OllamaClient with setupDefaultModel
          const ollamaClient = this.llm as any;
          if (ollamaClient.setupDefaultModel) {
            await ollamaClient.setupDefaultModel();
          }
        } catch (err) {
          this.logger.warn('Failed to setup default model', err);
        }
      }

      // Start telemetry if enabled
      if (this.settings.isTelemetryEnabled()) {
        this.logger.info('Telemetry enabled', {
          provider: this.settings.getProvider(),
          hardware: this.hardwareInfo
        });
      }
    } catch (err) {
      this.logger.error('Environment initialization failed', err);
      throw err;
    }
  }

  /**
   * Starts the VibeCoding UI and shows the WebView
   */
  public async start(): Promise<void> {
    if (!this.webview) {
      // Create WebView with handlers
      const handlers: WebviewHandlers = {
        updateProvider: this.updateProvider.bind(this),
        updateEndpoint: this.updateEndpoint.bind(this),
        updateOpenAIKey: this.updateOpenAIKey.bind(this),
        updateOpenAIModel: this.updateOpenAIModel.bind(this),
        updateHFToken: this.updateHFToken.bind(this),
        updateHFModel: this.updateHFModel.bind(this),
        startAuto: this.startAuto.bind(this),
        stopAuto: this.stopAuto.bind(this),
        downloadModels: this.downloadModels.bind(this),
        updatePerformance: this.updatePerformance.bind(this),
        selectLanguage: this.selectLanguage.bind(this),
        generateDocs: this.generateDocumentation.bind(this),
        backupProject: this.backupProject.bind(this),
        skipSetup: this.skipSetup.bind(this)
      };

      this.webview = new VibeCodingWebview(this.context.extensionUri, handlers);

      // Update WebView with hardware info
      if (this.hardwareInfo) {
        this.webview.updateHardwareInfo(this.hardwareInfo);
      }

      // Start hardware monitoring
      if (!this.monitoringActive) {
        this.monitoringActive = true;
        this.hardwareDetector.startMonitoring(info => {
          if (this.webview) {
            this.webview.updateMonitoringInfo(info);
          }
        });
      }

      // Resume last project context if available
      const workspaceKey = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (workspaceKey && this.projectContexts[workspaceKey]) {
        const context = this.projectContexts[workspaceKey];
        this.logger.info('Resuming project context', context);
      }
    }
  }

  /**
   * Stops the VibeCoding UI and monitoring
   */
  public stop(): void {
    if (this.monitoringActive) {
      this.hardwareDetector.stopMonitoring();
      this.monitoringActive = false;
    }

    if (this.webview) {
      this.webview.dispose();
      this.webview = undefined;
    }

    this.logger.info('VibeCoding stopped');
  }

  /**
   * Updates the LLM provider
   */
  private async updateProvider(provider: string): Promise<void> {
    await this.settings.updateConfiguration('provider', provider);
    this.llm = createLLMClient(this.settings, this.logger);
    this.logger.info('Provider updated', { provider });
  }

  /**
   * Updates the endpoint for the current provider
   */
  private async updateEndpoint(endpoint: string): Promise<void> {
    const provider = this.settings.getProvider();
    let key = '';

    switch (provider) {
      case 'ollama':
        key = 'ollamaUrlCustom';
        break;
      case 'huggingface':
        key = 'huggingfaceEndpoint';
        break;
      default:
        this.logger.warn('Endpoint update not supported for provider', { provider });
        return;
    }

    await this.settings.updateConfiguration(key, endpoint);
    this.llm = createLLMClient(this.settings, this.logger);
    this.logger.info('Endpoint updated', { provider, endpoint });
  }

  /**
   * Updates the OpenAI API key
   */
  private async updateOpenAIKey(key: string): Promise<void> {
    await this.settings.updateConfiguration('openaiApiKey', key);

    // Update client if it has setApiKey method
    const client = this.llm as any;
    if (client.setApiKey) {
      client.setApiKey(key);
    } else {
      // Recreate client
      this.llm = createLLMClient(this.settings, this.logger);
    }

    this.logger.info('OpenAI API key updated');
  }

  /**
   * Updates the OpenAI model
   */
  private async updateOpenAIModel(model: string): Promise<void> {
    await this.settings.updateConfiguration('openaiModel', model);

    // Update client if it has setModel method
    const client = this.llm as any;
    if (client.setModel) {
      client.setModel(model);
    } else {
      // Recreate client
      this.llm = createLLMClient(this.settings, this.logger);
    }

    this.logger.info('OpenAI model updated', { model });
  }

  /**
   * Updates the Hugging Face token
   */
  private async updateHFToken(token: string): Promise<void> {
    await this.settings.updateConfiguration('huggingfaceToken', token);

    // Update client if it has setToken method
    const client = this.llm as any;
    if (client.setToken) {
      client.setToken(token);
    } else {
      // Recreate client
      this.llm = createLLMClient(this.settings, this.logger);
    }

    this.logger.info('Hugging Face token updated');
  }

  /**
   * Updates the Hugging Face model
   */
  private async updateHFModel(model: string): Promise<void> {
    await this.settings.updateConfiguration('huggingfaceModel', model);

    // Update client if it has setModel method
    const client = this.llm as any;
    if (client.setModel) {
      client.setModel(model);
    } else {
      // Recreate client
      this.llm = createLLMClient(this.settings, this.logger);
    }

    this.logger.info('Hugging Face model updated', { model });
  }

  /**
   * Starts the auto coding process
   */
  public async startAuto(
    specs: string,
    model: string,
    performance: string,
    language: string,
    logCallback: (message: string) => void
  ): Promise<void> {
    // Save context for persistence
    const workspaceKey = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceKey) {
      this.projectContexts[workspaceKey] = {
        lastTask: specs,
        lastModel: model,
        lastPerformance: performance,
        lastLanguage: language
      };

      await this.context.globalState.update('vibecoding.projectContexts', this.projectContexts);
    }

    // Start the auto coding process
    await this.autoCoder.startAutoMode(specs, model, performance, language, logCallback);
  }

  /**
   * Stops the auto coding process
   */
  public async stopAuto(logCallback: (message: string) => void): Promise<void> {
    logCallback('Stopping the coding vibe...');
    // The AutoCoder class should handle this internally
    this.logger.info('Auto coding stopped');
    logCallback('Coding vibe paused. Resume when ready!');
  }

  /**
   * Downloads available models
   */
  public async downloadModels(): Promise<string[]> {
    try {
      // Check if client supports getAvailableModels
      const client = this.llm as any;
      if (client.getAvailableModels) {
        return await client.getAvailableModels();
      }
      return [];
    } catch (err) {
      this.logger.error('Failed to download models', err);
      return [];
    }
  }

  /**
   * Updates the performance mode
   */
  public async updatePerformance(mode: string): Promise<void> {
    await this.settings.updateConfiguration('performance', mode);

    // Update client if it supports setPerformanceMode
    const client = this.llm as any;
    if (client.setPerformanceMode) {
      client.setPerformanceMode(mode);
    }

    this.logger.info('Performance mode updated', { mode });
  }

  /**
   * Shows a language selection dialog
   */
  public async selectLanguage(): Promise<string | undefined> {
    return this.uiManager.showQuickPick(
      ['python', 'javascript', 'java'],
      'Select programming language'
    );
  }

  /**
   * Generates project documentation
   */
  public async generateDocumentation(): Promise<void> {
    await this.autoCoder.generateDocumentation();
  }

  /**
   * Creates a backup of the project
   */
  public async backupProject(): Promise<void> {
    await this.autoCoder.backupProject();
  }

  /**
   * Skips the setup wizard
   */
  public skipSetup(): void {
    this.logger.info('Setup wizard skipped');
  }

  /**
   * Shows the history of changes for a file
   */
  public async viewHistory(filePath: string): Promise<void> {
    const history = this.fileManager.getChangeHistory(filePath);
    if (history.length === 0) {
      this.uiManager.showInformationMessage(`No history found for ${filePath}`);
      return;
    }

    // Format history for display
    const items = history.map(record => {
      return {
        label: `Version ${record.version} (${record.timestamp})`,
        description: record.action,
        detail: record.filePath,
        record
      };
    });

    // Show quick pick with history items
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a version to view or restore'
    });

    if (selected) {
      const choice = await this.uiManager.showQuickPick(
        ['View', 'Restore'],
        `Version ${selected.record.version} of ${selected.record.filePath}`
      );

      if (choice === 'View') {
        // Open the backup file
        const doc = await vscode.workspace.openTextDocument(selected.record.originalPath);
        await vscode.window.showTextDocument(doc);
      } else if (choice === 'Restore') {
        // Restore the file to this version
        await this.fileManager.revertToVersion(selected.record.filePath, selected.record.version);
        this.uiManager.showInformationMessage(
          `Restored ${selected.record.filePath} to version ${selected.record.version}`
        );
      }
    }
  }

  /**
   * Disposes resources when the extension is deactivated
   */
  public dispose(): void {
    this.stop();

    // Save project contexts
    this.context.globalState.update('vibecoding.projectContexts', this.projectContexts);

    this.logger.info('VibeController disposed');
  }
}
