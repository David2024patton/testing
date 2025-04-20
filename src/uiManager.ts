/**
 * File: src/uiManager.ts
 * Location: src/uiManager.ts
 * Description: Provides wrapper methods for VS Code UI interactions:
 * - Progress notifications
 * - Information and error messages
 * - Quick pick dialogs
 * NOTE: When adding new UI patterns (input boxes, custom pickers), update this header.
 *
 * Purpose:
 * - Wrapper for VS Code UI calls:
 *   - `showProgress(title, task)`
 *   - `showInformationMessage()`
 *   - `showErrorMessage()`
 *   - `showQuickPick()`
 *
 * Modification Points:
 * - To add custom dialogs or input boxes, extend this helper.
 */

import * as vscode from 'vscode';

export class UIManager {
  /**
   * Show a cancellable progress notification.
   * @param title Title of the progress UI
   * @param task  Async callback receiving a Progress reporter and a CancellationToken
   */
  public async showProgress<T>(
    title: string,
    task: (progress: vscode.Progress<{ message?: string }>, token: vscode.CancellationToken) => Promise<T>
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
      },
      task
    );
  }

  /**
   * Show an information message with optional action buttons.
   * @param message Text to display
   * @param items   Labels for action buttons
   */
  public showInformationMessage(
    message: string,
    ...items: string[]
  ): vscode.Thenable<string | undefined> {
    return vscode.window.showInformationMessage(message, ...items);
  }

  /**
   * Show an error message with optional action buttons.
   * @param message Text to display
   * @param items   Labels for action buttons
   */
  public showErrorMessage(
    message: string,
    ...items: string[]
  ): vscode.Thenable<string | undefined> {
    return vscode.window.showErrorMessage(message, ...items);
  }

  /**
   * Present a quick pick list for the user to choose one item.
   * @param items      Array of strings to pick from
   * @param placeHolder Placeholder text displayed in the picker
   */
  public async showQuickPick(
    items: string[],
    placeHolder: string
  ): Promise<string | undefined> {
    return vscode.window.showQuickPick(items, { placeHolder });
  }
}
