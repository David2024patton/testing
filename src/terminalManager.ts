/**
 * File: src/terminalManager.ts
 * Location: src/terminalManager.ts
 * Description: Manages terminal operations for running commands and checking dependencies.
 * Provides a wrapper around VS Code's terminal API for executing shell commands.
 * NOTE: When adding new terminal features, update this header accordingly.
 *
 * Purpose:
 * - Wraps VS Code `tasks.executeTask` to run shell commands.
 * - Provides `checkDependencies()` for CUDA/Ollama installs.
 * - Returns `{ success, output }` for each task.
 *
 * Primary API:
 * - `runCommand(command: string, workspacePath: string): Promise<{ success: boolean; output: string }>`
 * - `checkDependencies(hardwareInfo)`
 *
 * Modification Points:
 * - To support additional package managers (apt, brew), extend `checkDependencies`.
 * - To change how tasks are executed (e.g. integrated terminal), adjust `Task` creation.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from './logger';

export class TerminalManager {
    private terminal: vscode.Terminal | undefined;
    private logger: Logger;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext, logger: Logger) {
        this.context = context;
        this.logger = logger;
    }

    private ensureTerminal(workspacePath: string): vscode.Terminal {
        if (!this.terminal || this.terminal.exitStatus) {
            this.terminal = vscode.window.createTerminal({
                name: 'VibeCoding Terminal',
                cwd: workspacePath
            });
            this.context.subscriptions.push(this.terminal);
            this.terminal.show(true);
        }
        return this.terminal;
    }

    async runCommand(command: string, workspacePath: string): Promise<void> {
        const terminal = this.ensureTerminal(workspacePath);
        return new Promise((resolve, reject) => {
            terminal.sendText(command);

            const checkExit = setInterval(() => {
                if (terminal.exitStatus !== undefined) {
                    clearInterval(checkExit);
                    if (terminal.exitStatus.code === 0) {
                        this.logger.info(`Command executed successfully: ${command}`);
                        resolve();
                    } else {
                        const errorMessage = `Command failed: ${command}, Exit code: ${terminal.exitStatus.code}`;
                        this.logger.error(errorMessage);
                        reject(new Error(errorMessage));
                    }
                }
            }, 1000);
        });
    }

    async checkDependencies(): Promise<void> {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) throw new Error('No workspace folder open');

        const commands: { [key: string]: string } = {
            python: 'python --version',
            node: 'node --version',
            java: 'java --version',
            git: 'git --version',
            flake8: 'flake8 --version',
            eslint: 'eslint --version'
        };

        for (const [dep, command] of Object.entries(commands)) {
            try {
                await this.runCommand(command, workspacePath);
                this.logger.info(`${dep} is installed`);
            } catch (error) {
                const errorMessage = `Dependency check failed for ${dep}: ${error}`;
                this.logger.error(errorMessage);
                throw new Error(errorMessage);
            }
        }
    }

    dispose() {
        if (this.terminal) {
            this.terminal.dispose();
        }
    }
}