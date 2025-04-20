/**
 * File: src/fileManager.ts
 * Location: src/fileManager.ts
 * Description: Manages workspace file operations with full versioned history and undo capabilities.
 * Stores each save as a new version under `/.vibe/history` and maintains a JSON log in `changeHistory.json`.
 * Provides methods to list change history and revert to any previous version.
 * NOTE: If history folder structure or backup logic changes, update this header to reflect those modifications.
 *
 * Purpose:
 * - Read/write files using VS Code FS API.
 * - Automatically back up existing files in `.vibe/`, with version‑numbered names.
 * - Directory creation helper and existence checks.
 *
 * API:
 * - `writeFile(relativePath, content): Promise<void>`
 * - `readFile(relativePath): Promise<string>`
 * - `createDirectory(relativePath): Promise<void>`
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { Logger } from './logger';

/**
 * Record of a single change event for a file
 */
interface ChangeRecord {
    filePath: string;
    version: number;
    timestamp: string;
    originalPath: string;
    action: 'created' | 'modified';
}

export class FileManager {
    private logger: Logger;
    private historyDir: vscode.Uri;
    private historyFile: vscode.Uri;
    private changeHistory: ChangeRecord[] = [];

    /**
     * @param workspaceRoot Root URI of the workspace
     * @param logger Logger instance for logging operations
     */
    constructor(private workspaceRoot: vscode.Uri, logger: Logger) {
        this.logger = logger;
        this.historyDir = vscode.Uri.joinPath(this.workspaceRoot, '.vibe', 'history');
        this.historyFile = vscode.Uri.joinPath(this.workspaceRoot, '.vibe', 'changeHistory.json');
        this.initialize();
    }

    /**
     * Initialize history folder and load existing history log
     */
    private async initialize(): Promise<void> {
        // Ensure history directory exists
        await vscode.workspace.fs.createDirectory(this.historyDir);

        // Load existing change history if present, else create new file
        try {
            const data = await vscode.workspace.fs.readFile(this.historyFile);
            this.changeHistory = JSON.parse(new TextDecoder().decode(data));
            this.logger.info('Loaded existing change history', { count: this.changeHistory.length });
        } catch {
            this.changeHistory = [];
            await this.saveHistory();
            this.logger.info('Initialized new change history');
        }
    }

    /**
     * Persist the in-memory changeHistory array to the JSON log file
     */
    private async saveHistory(): Promise<void> {
        const encoded = new TextEncoder().encode(JSON.stringify(this.changeHistory, null, 2));
        await vscode.workspace.fs.writeFile(this.historyFile, encoded);
    }

    /**
     * Write content to a file, versioning existing content before overwrite
     * @param relativePath Path relative to workspaceRoot
     * @param content New file content
     */
    public async writeFile(relativePath: string, content: string): Promise<void> {
        const fileUri = vscode.Uri.joinPath(this.workspaceRoot, relativePath);

        // Determine version number
        const existing = this.changeHistory.filter(r => r.filePath === relativePath);
        const version = existing.length > 0 ? Math.max(...existing.map(r => r.version)) + 1 : 1;
        const timestamp = new Date().toISOString();
        const safeName = relativePath.replace(/[\/:]/g, '_');
        const historyFileName = `${safeName}_v${version}_${timestamp.replace(/[:.]/g,'-')}`;
        const historyUri = vscode.Uri.joinPath(this.historyDir, historyFileName);

        // Backup existing content if file exists
        let action: 'created' | 'modified' = 'created';
        if (await this.fileExists(fileUri)) {
            action = 'modified';
            const oldContent = await this.readFile(relativePath);
            await vscode.workspace.fs.writeFile(historyUri, new TextEncoder().encode(oldContent));
            this.logger.info(`Backed up ${relativePath} version ${version}`, { historyFileName });
        }

        // Record change
        this.changeHistory.push({
            filePath: relativePath,
            version,
            timestamp,
            originalPath: historyUri.fsPath,
            action
        });
        await this.saveHistory();

        // Apply new content
        const edit = new vscode.WorkspaceEdit();
        edit.createFile(fileUri, { overwrite: true });
        edit.insert(fileUri, new vscode.Position(0, 0), content);
        const success = await vscode.workspace.applyEdit(edit);
        if (!success) {
            this.logger.error(`Failed to write file ${relativePath}`);
            throw new Error(`Failed to write file: ${relativePath}`);
        }
        this.logger.info(`Wrote file ${relativePath}`, { version });
    }

    /**
     * Read the content of a workspace file
     * @param relativePath Path relative to workspaceRoot
     */
    public async readFile(relativePath: string): Promise<string> {
        const uri = vscode.Uri.joinPath(this.workspaceRoot, relativePath);
        const bytes = await vscode.workspace.fs.readFile(uri);
        return new TextDecoder().decode(bytes);
    }

    /**
     * Create a directory under the workspace
     * @param relativePath Path relative to workspaceRoot
     */
    public async createDirectory(relativePath: string): Promise<void> {
        const uri = vscode.Uri.joinPath(this.workspaceRoot, relativePath);
        await vscode.workspace.fs.createDirectory(uri);
        this.logger.info(`Created directory ${relativePath}`);
    }

    /**
     * Check if a URI exists
     */
    private async fileExists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get the change history for all files or a specific file
     * @param filePath Optional relative path to filter history
     */
    public getChangeHistory(filePath?: string): ChangeRecord[] {
        return filePath
            ? this.changeHistory.filter(r => r.filePath === filePath)
            : [...this.changeHistory];
    }

    /**
     * Revert a file to a specific version from history
     * @param filePath Relative path of the target file
     * @param version Version number to revert to
     */
    public async revertToVersion(filePath: string, version: number): Promise<void> {
        const record = this.changeHistory.find(r => r.filePath === filePath && r.version === version);
        if (!record) {
            throw new Error(`Version ${version} of ${filePath} not found`);
        }
        const content = await fs.readFile(record.originalPath, 'utf-8');
        await this.writeFile(filePath, content);
        this.logger.info(`Reverted ${filePath} to version ${version}`);
    }
}
