/**
 * File: src/extension.ts
 * Location: src/extension.ts
 * Description: Entry point for VibeCoding extension; handles activation, deactivation,
 * state persistence, workspace indexing, and command registration (including viewing logs).
 * NOTE: When updating activation logic or commands, update this header accordingly.
 *
 * Purpose:
 * - Bootstraps the extension on activation.
 * - Checks workspace trust and prompts for indexing.
 * - Maintains a recursive index of `.py`, `.js`, and `.java` in `context.globalState`.
 * - Registers commands: startCoding, stopCoding, generateDocs, backupProject, viewHistory, reindexWorkspace.
 * - Wires up a diagnostic provider for FIXMEs/TODOs.
 *
 * Key Steps:
 * 1. activate
 *    - Initialize `Logger`, `SettingsManager`, and retrieve persisted `workspaceIndex` & `projectContexts`.
 *    - Prompt to index each folder not seen before.
 *    - Listen to workspace, file‑change, creation, and deletion events to keep the index fresh.
 *    - Instantiate `VibeController` with all dependencies.
 *    - Register all commands with pre‑trust checks.
 *    - Persist index & contexts at the end of activation.
 *
 * 2. deactivate
 *    - Save or clear any needed state in `globalState`.
 *
 * Modification Points:
 * - Add/remove commands: update activationEvents in `package.json` and this file's command registrations.
 * - Change indexing rules: update the `indexWorkspaceFolder` helper.
 * - Extend diagnostics: modify the diagnostic collection logic.
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SettingsManager } from './settingsManager';
import { Logger } from './logger';
import { VibeController } from './vibeController';

let contextGlobal: vscode.ExtensionContext;

export async function activate(context: vscode.ExtensionContext) {
  contextGlobal = context;

  // Initialize settings and logger
  const settings = new SettingsManager();
  const logger = new Logger(context, settings);
  logger.info('VibeCoding extension activated');

  // Load persisted state
  const workspaceIndex: Record<string, string[]> = context.globalState.get('vibecoding.workspaceIndex', {});
  const projectContexts: Record<string, any> = context.globalState.get('vibecoding.projectContexts', {});

  // Utility: recursively index .py/.js/.java files
  async function indexWorkspaceFolder(folder: vscode.WorkspaceFolder): Promise<string[]> {
    const root = folder.uri.fsPath;
    const result: string[] = [];
    async function walk(dir: string) {
      for (const dirent of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
          if (['node_modules', '.git', 'dist', '.vibe'].includes(dirent.name)) continue;
          await walk(full);
        } else if (full.match(/\.(py|js|java)$/i)) {
          result.push(full);
        }
      }
    }
    await walk(root);
    return result;
  }

  // Prompt to index on first activation per workspace
  if (vscode.workspace.workspaceFolders) {
    for (const folder of vscode.workspace.workspaceFolders) {
      if (!workspaceIndex[folder.uri.fsPath]) {
        const choice = await vscode.window.showInformationMessage(
          `VibeCoding: Index code in ${folder.name}?`, 'Yes', 'No'
        );
        if (choice === 'Yes') {
          const files = await indexWorkspaceFolder(folder);
          workspaceIndex[folder.uri.fsPath] = files;
          vscode.window.showInformationMessage(`Indexed ${files.length} files! 🎉`);
          logger.info(`Indexed ${files.length} files in ${folder.name}`);
        }
      }
    }
  }

  // Watch for workspace changes to re-index
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async evt => {
      for (const f of evt.added) {
        const files = await indexWorkspaceFolder(f);
        workspaceIndex[f.uri.fsPath] = files;
        logger.info(`Indexed ${files.length} files in ${f.name}`);
      }
      for (const f of evt.removed) {
        delete workspaceIndex[f.uri.fsPath];
        logger.info(`Removed index for ${f.name}`);
      }
    }),
    vscode.workspace.onDidChangeTextDocument(async event => {
      const docPath = event.document.uri.fsPath;
      const ws = vscode.workspace.workspaceFolders?.find(w => docPath.startsWith(w.uri.fsPath));
      if (ws) {
        workspaceIndex[ws.uri.fsPath] = await indexWorkspaceFolder(ws);
        logger.info(`Re-indexed ${ws.name} due to file change`);
      }
    }),
    vscode.workspace.onDidCreateFiles(async () => {
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (ws) {
        workspaceIndex[ws.uri.fsPath] = await indexWorkspaceFolder(ws);
        logger.info(`Re-indexed ${ws.name} due to file creation`);
      }
    }),
    vscode.workspace.onDidDeleteFiles(async () => {
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (ws) {
        workspaceIndex[ws.uri.fsPath] = await indexWorkspaceFolder(ws);
        logger.info(`Re-indexed ${ws.name} due to file deletion`);
      }
    })
  );

  // Instantiate main controller
  const vibeController = new VibeController(
    context,
    logger,
    workspaceIndex,
    projectContexts,
    settings
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('vibecoding.startCoding', async () => {
      if (!vscode.workspace.isTrusted) {
        const ok = await vscode.window.showWarningMessage(
          'Workspace not trusted. Continue?', 'Yes', 'No'
        );
        if (ok !== 'Yes') return;
      }
      await vibeController.start();
    }),
    vscode.commands.registerCommand('vibecoding.stopCoding', () => {
      vibeController.stop();
    }),
    vscode.commands.registerCommand('vibecoding.generateDocs', () => {
      vibeController.generateDocumentation();
    }),
    vscode.commands.registerCommand('vibecoding.backupProject', () => {
      vibeController.backupProject();
    }),
    vscode.commands.registerCommand('vibecoding.viewHistory', async () => {
      const filePath = await vscode.window.showInputBox({ prompt: 'Enter file path to view history' });
      if (filePath) {
        await vibeController.viewHistory(filePath);
      }
    }),
    vscode.commands.registerCommand('vibecoding.reindexWorkspace', async () => {
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (ws) {
        const files = await indexWorkspaceFolder(ws);
        workspaceIndex[ws.uri.fsPath] = files;
        await context.globalState.update('vibecoding.workspaceIndex', workspaceIndex);
        vscode.window.showInformationMessage(
          `Re-indexed ${files.length} files in ${ws.name}`
        );
      }
    }),
    vscode.commands.registerCommand('vibecoding.viewLogs', async () => {
      const logsDir = path.join(context.globalStorageUri.fsPath, 'logs');
      const date = new Date().toISOString().slice(0, 10);
      const logFile = path.join(logsDir, `${date}.log.json`);
      try {
        const data = await fs.readFile(logFile, 'utf-8');
        const filter = await vscode.window.showInputBox({ placeholder: 'Filter regex (optional)' });
        const lines = data.split('\n').filter(Boolean);
        const output = filter
          ? lines.filter(l => new RegExp(filter).test(l)).join('\n')
          : lines.join('\n');
        const doc = await vscode.workspace.openTextDocument({ content: output, language: 'json' });
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch (err) {
        logger.error('Could not read log file', err);
        vscode.window.showErrorMessage(`Failed to load logs: ${err.message}`);
      }
    })
  );

  logger.info('Commands registered and VibeCoding ready');
}

export function deactivate() {
  if (contextGlobal) {
    contextGlobal.globalState.update('vibecoding.workspaceIndex', {});
    // projectContexts saved by VibeController on dispose
  }
}
