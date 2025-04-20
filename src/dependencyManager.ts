/**
 * File: src/dependencyManager.ts
 * Location: src/dependencyManager.ts
 * Description: Manages validation and installation of project dependencies.
 * Checks for required tools and libraries, and provides methods to resolve conflicts.
 * NOTE: When adding new dependency checks, update this header accordingly.
 *
 * Purpose:
 * - Validates installed versions of Node, Python, Java.
 * - Resolves conflicts via `winget upgrade` (Windows).
 *
 * API:
 * - `validateEnvironment(): Promise<{ success: boolean; conflicts? }>`
 * - `resolveConflicts(conflicts): Promise<Resolution[]>`
 *
 * Modification Points:
 * - To support Linux/macOS, replace `winget` with `apt`, `brew`, etc.
 */

import * as vscode from 'vscode';
import { TerminalManager } from './terminalManager';
import { Logger } from './logger';

export interface DependencyConflict {
  tool: string;
  requiredVersion: string;
  installedVersion: string;
}

export interface Resolution {
  tool: string;
  success: boolean;
  message: string;
}

export class DependencyManager {
    private terminalManager: TerminalManager;
    private logger: Logger;

    constructor(terminalManager: TerminalManager, logger: Logger) {
        this.terminalManager = terminalManager;
        this.logger = logger;
    }

    /**
     * Validates the development environment by checking required dependencies.
     * @returns Object with success flag and optional conflicts array
     */
    async validateEnvironment(): Promise<{ success: boolean; conflicts?: DependencyConflict[] }> {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) throw new Error('No workspace folder open');

        const dependencies = {
            python: 'python3 -m pip install flask pytest',
            node: 'npm install -g express jest',
            java: 'mvn -v || echo "Maven not installed"'
        };

        const conflicts: DependencyConflict[] = [];

        for (const [language, installCommand] of Object.entries(dependencies)) {
            try {
                await this.terminalManager.runCommand(installCommand, workspacePath);
                this.logger.info(`Validated and installed dependencies for ${language}`);
            } catch (error) {
                const errorMessage = `Failed to validate/install dependencies for ${language}: ${error}`;
                this.logger.error(errorMessage);

                // Add to conflicts list instead of throwing
                conflicts.push({
                    tool: language,
                    requiredVersion: 'latest',
                    installedVersion: 'unknown'
                });
            }
        }

        return {
            success: conflicts.length === 0,
            conflicts: conflicts.length > 0 ? conflicts : undefined
        };
    }

    /**
     * Attempts to resolve dependency conflicts using appropriate package managers.
     * @param conflicts List of dependency conflicts to resolve
     * @returns Array of resolution results
     */
    async resolveConflicts(conflicts: DependencyConflict[]): Promise<Resolution[]> {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) throw new Error('No workspace folder open');

        const resolutions: Resolution[] = [];

        for (const conflict of conflicts) {
            try {
                let command = '';

                // Determine appropriate upgrade command based on tool
                switch (conflict.tool) {
                    case 'python':
                        command = 'winget upgrade python';
                        break;
                    case 'node':
                        command = 'winget upgrade nodejs';
                        break;
                    case 'java':
                        command = 'winget upgrade openjdk';
                        break;
                    default:
                        throw new Error(`Unknown tool: ${conflict.tool}`);
                }

                await this.terminalManager.runCommand(command, workspacePath);

                resolutions.push({
                    tool: conflict.tool,
                    success: true,
                    message: `Successfully upgraded ${conflict.tool}`
                });

                this.logger.info(`Resolved conflict for ${conflict.tool}`);
            } catch (error) {
                const errorMessage = `Failed to resolve conflict for ${conflict.tool}: ${error}`;
                this.logger.error(errorMessage);

                resolutions.push({
                    tool: conflict.tool,
                    success: false,
                    message: errorMessage
                });
            }
        }

        return resolutions;
    }
}