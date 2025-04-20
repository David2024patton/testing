/**
 * File: src/logger.ts
 * Location: src/logger.ts
 * Description: Advanced logging interface for VibeCoding.
 * Features:
 *  - Configurable log levels (debug, info, warn, error)
 *  - Structured JSON entries with ISO timestamps and optional metadata
 *  - Correlation ID per session for traceability
 *  - Output to VS Code OutputChannel and daily rotating log file in globalStorageUri
 *  - Performance timing support via `time()` and `timeEnd()`
 * NOTE: If adding new log levels or changing storage paths, update this header accordingly.
 *
 * Purpose:
 * - Structured logging via Winston:
 *   - Timestamps, JSON, file (`vibecoding.log`), console.
 * - Honors telemetry flags at call sites.
 *
 * API:
 * - `info(msg, meta?)`, `warn(msg, meta?)`, `error(msg, meta?)`
 *
 * Modification Points:
 * - To forward logs to a remote service, add a custom Winston transport.
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SettingsManager } from './settingsManager';

/**
 * Log levels in order of severity
 */
const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = typeof LEVELS[number];

export class Logger {
  private channel: vscode.OutputChannel;
  private minLevel: LogLevel;
  private logFilePath: string;
  private correlationId: string;
  private timers = new Map<string, number>();

  constructor(
    private context: vscode.ExtensionContext,
    private settings: SettingsManager
  ) {
    this.channel = vscode.window.createOutputChannel('VibeCoding');
    this.minLevel = settings.getConfiguration<LogLevel>('logLevel', 'info');

    // Generate a correlation ID for this session
    this.correlationId = vscode.env.sessionId || this.generateUUID();

    // Prepare daily log file in globalStorage
    const storagePath = context.globalStorageUri.fsPath;
    const date = new Date().toISOString().slice(0, 10);
    const logDir = path.join(storagePath, 'logs');
    fs.mkdir(logDir, { recursive: true }).catch(() => {});
    this.logFilePath = path.join(logDir, `${date}.log.json`);
  }

  /**
   * Start a named timer
   */
  public time(label: string): void {
    this.timers.set(label, Date.now());
  }

  /**
   * End a named timer and log its duration
   */
  public timeEnd(label: string): void {
    const start = this.timers.get(label);
    if (start !== undefined) {
      const duration = Date.now() - start;
      this.info(`Timer '${label}' ended`, { durationMs: duration });
      this.timers.delete(label);
    }
  }

  /**
   * Log at DEBUG level
   */
  public debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  /**
   * Log at INFO level
   */
  public info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  /**
   * Log at WARN level
   */
  public warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  /**
   * Log at ERROR level
   */
  public error(message: string, meta?: any): void {
    this.log('error', message, meta);
    if (this.settings.isTelemetryEnabled()) {
      // TODO: send to a telemetry service
    }
  }

  /**
   * Internal log routine: filters by level, writes JSON line to OutputChannel and file
   */
  private async log(level: LogLevel, message: string, meta?: any): Promise<void> {
    if (LEVELS.indexOf(level) < LEVELS.indexOf(this.minLevel)) {
      return;
    }
    const entry = {
      time: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      meta
    };
    const line = JSON.stringify(entry);

    // Output to VS Code channel
    this.channel.appendLine(line);

    // Append to log file
    try {
      await fs.appendFile(this.logFilePath, line + '\n');
    } catch {
      // ignore file write errors
    }
  }

  /**
   * Generate a UUID v4
   */
  private generateUUID(): string {
    // simple RFC4122 v4 UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
