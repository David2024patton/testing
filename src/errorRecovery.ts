/**
 * File: src/errorRecovery.ts
 * Location: src/errorRecovery.ts
 * Description: Analyzes runtime and test errors, backs up original code versions,
 * formulates context‑aware fix prompts, and requests patched code from the configured LLM client.
 * Uses FileManager to manage backups, Logger for structured telemetry, and optionally forwards
 * events when telemetry is enabled in SettingsManager.
 * NOTE: When adding new error patterns or altering recovery strategies, update this header accordingly.
 *
 * Purpose:
 * - Catches runtime/test errors, backs up original code, auto‑installs missing deps,
 *   crafts context‑aware prompts, and retrieves fixes from the LLM.
 * - Logs structured events and forwards telemetry when enabled.
 *
 * API:
 * - `analyzeAndFix(errorMsg, filePath): Promise<string>`
 *
 * Modification Points:
 * - To add new error patterns, update `errorPatterns`.
 * - To integrate vault/secret scanning, add pre‑prompt hooks.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { LLMClient } from './AIClients';
import { FileManager } from './fileManager';
import { Logger } from './logger';
import { TerminalManager } from './terminalManager';
import { SettingsManager } from './settingsManager';

export class ErrorRecovery {
  private fileManager: FileManager;
  private errorPatterns: Map<RegExp, string>;
  private terminal: TerminalManager;

  /**
   * @param llm        The LLM client used to generate fix suggestions
   * @param logger     Logger instance for structured logs
   * @param settings   SettingsManager to read telemetry flag
   */
  constructor(
    private llm: LLMClient,
    private logger: Logger,
    private settings: SettingsManager,
    private context: vscode.ExtensionContext
  ) {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!ws) {
      throw new Error('No workspace folder open');
    }
    this.fileManager = new FileManager(ws, logger);
    this.terminal = new TerminalManager(context, logger);

    // Define error patterns to targeted fix prompts
    this.errorPatterns = new Map<RegExp, string>([
      [/ModuleNotFoundError: No module named '(.+)'/,       "Install the missing Python module '$1' and adjust imports."],
      [/SyntaxError: (.+)/,                                 'Fix the syntax error: $1'],
      [/Cannot find module '(.+)'/,                         "Install or require the Node.js module '$1'."],
      [/TypeError: (.+) is not a function/,                 'Ensure $1 is a callable and imported correctly.'],
      [/ReferenceError: (\\w+) is not defined/,             'Define or import the missing variable/function $1.'],
      [/ImportError: (.+)/,                                  'Fix the import error: $1'],
      [/AttributeError: (.+)/,                              'Fix the attribute error: $1'],
      [/IndentationError: (.+)/,                            'Fix the indentation: $1']
    ]);
  }

  /**
   * Analyze the provided error message, back up the original file,
   * handle missing‑dependency errors automatically, generate a targeted prompt,
   * retrieve the corrected code, and forward telemetry if enabled.
   * @param errorMsg The error output or stack trace
   * @param filePath The relative path to the source file
   */
  public async analyzeAndFix(errorMsg: string, filePath: string): Promise<string> {
    // 1. Ensure backup folder exists
    await this.fileManager.createDirectory('.vibe/backups');

    // 2. Read original content
    const original = await this.getContext(filePath);

    // 3. Backup the original
    try {
      const backupName = `${path.basename(filePath)}.backup.${Date.now()}`;
      await this.fileManager.writeFile(`.vibe/backups/${backupName}`, original);
      this.logger.info('BackupCreated', { file: filePath, backup: backupName });
    } catch (e: any) {
      this.logger.warn('BackupFailed', { file: filePath, error: e.message });
    }

    // 4. Auto‑install missing dependencies if detected
    const depCmd = this.checkForDependencyError(errorMsg);
    if (depCmd) {
      await this.handleDependencyError(depCmd);
    }

    // 5. Build the fix prompt
    const pattern = this.findMatchingPattern(errorMsg);
    const prompt = pattern
      ? `${pattern}\n\nContext:\n${original}\n\nError:\n${errorMsg}`
      : `Fix this error: ${errorMsg}\n\nContext:\n${original}`;

    this.logger.info('ErrorRecoveryPrompt', { file: filePath, prompt });
    const fixed = await this.llm.generateCode(prompt);
    this.logger.info('ErrorRecoveryResult', { file: filePath });

    // 6. Forward telemetry if enabled
    if (this.settings.isTelemetryEnabled()) {
      this.logger.info('TelemetryEvent', { event: 'ErrorRecovery', file: filePath, error: errorMsg });
    }

    return fixed;
  }

  /** Detect and return a package‑install command for common dependency errors. */
  private checkForDependencyError(errorMsg: string): string | null {
    const py = errorMsg.match(/ModuleNotFoundError: No module named '(.+)'/);
    if (py) return `pip install ${py[1]}`;
    const nd = errorMsg.match(/Cannot find module '(.+)'/);
    if (nd) return `npm install ${nd[1]}`;
    return null;
  }

  /** Execute the install command in the workspace via TerminalManager. */
  private async handleDependencyError(command: string): Promise<void> {
    const wsPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!wsPath) throw new Error('No workspace folder open for dependency install');
    try {
      await this.terminal.runCommand(command, wsPath);
      this.logger.info('DependencyInstalled', { command });
      if (this.settings.isTelemetryEnabled()) {
        this.logger.info('TelemetryEvent', { event: 'DependencyInstalled', command });
      }
    } catch (e: any) {
      this.logger.error('DependencyInstallFailed', { command, error: e.message });
      throw e;
    }
  }

  /** Read current file content to supply context for the LLM. */
  private async getContext(filePath: string): Promise<string> {
    try {
      return await this.fileManager.readFile(filePath);
    } catch (e: any) {
      this.logger.warn('ContextReadFailed', { file: filePath, error: e.message });
      return '';
    }
  }

  /** Try each regex; on match, replace `$1` and return the tailored prompt. */
  private findMatchingPattern(errorMsg: string): string | null {
    for (const [regex, template] of this.errorPatterns) {
      const m = regex.exec(errorMsg);
      if (m) {
        return template.replace('$1', m[1] || '');
      }
    }
    return null;
  }
}
