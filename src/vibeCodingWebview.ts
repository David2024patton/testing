/**
 * File: src/vibeCodingWebview.ts
 * Location: src/vibeCodingWebview.ts
 * Description: Manages the WebView UI for VibeCoding, including provider selection,
 * endpoint configuration, performance and language pickers, task input, controls,
 * and progress logging. Supports dynamic sections for Ollama, OpenAI, Hugging Face,
 * and local models, with auto-detection of Docker/Podman endpoints.
 * NOTE: If UI sections or message protocols change, update comments and handler mappings.
 *
 * Purpose:
 * - Renders the VS Code WebView panel for the "vibe" UI.
 * - Handles messages from the UI (startAuto, stopAuto, downloadModels, updatePerformance, selectLanguage, skipSetup, generateDocs, backupProject).
 * - Sends messages back to update hardware info, monitoring, model list, progress logs, language/ theme changes.
 *
 * Structure:
 * - Constructor
 *   - Creates `WebviewPanel` with CSP, `media/main.css` & `media/main.js`.
 *   - Shows a 3‑step setup wizard then main content.
 *   - Binds `onDidReceiveMessage` to the provided `WebviewHandlers`.
 *   - Listens to theme changes and panel disposal.
 *
 * - Public API
 *   - `updateHardwareInfo(info)`, `updateMonitoringInfo(info)`, `logProgress(msg)`, `updateSetupStep(step, msg)`.
 *
 * Modification Points:
 * - To add a new UI control: edit both the HTML in `_getWebviewContent()` and the corresponding handler in `onDidReceiveMessage`.
 * - To support additional settings: send/receive new message commands.
 */

import * as vscode from 'vscode';
import { HardwareInfo } from './hardwareDetector';

export interface WebviewHandlers {
    updateProvider: (provider: string) => void;
    updateEndpoint: (endpoint: string) => void;
    updateOpenAIKey: (key: string) => void;
    updateOpenAIModel: (model: string) => void;
    updateHFToken: (token: string) => void;
    updateHFModel: (model: string) => void;
    startAuto: (
        specs: string,
        model: string,
        performance: string,
        language: string,
        logCallback: (message: string) => void
    ) => Promise<void>;
    stopAuto: (logCallback: (message: string) => void) => Promise<void>;
    downloadModels: () => Promise<string[]>;
    updatePerformance: (mode: string) => Promise<void>;
    selectLanguage: () => Promise<string | undefined>;
    generateDocs: () => Promise<void>;
    backupProject: () => Promise<void>;
    skipSetup?: () => void;
}

export class VibeCodingWebview {
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    constructor(
        extensionUri: vscode.Uri,
        private readonly handlers: WebviewHandlers
    ) {
        this._panel = vscode.window.createWebviewPanel(
            'vibeCoding',
            'VibeCoding',
            vscode.ViewColumn.Beside,
            { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')] }
        );
        this._panel.webview.html = this._getWebviewContent(extensionUri);
        this._setWebviewMessageListener();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    private _getWebviewContent(extensionUri: vscode.Uri): string {
        const styleUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.css'));
        const scriptUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src ${this._panel.webview.cspSource} 'unsafe-inline';">
    <link href="${styleUri}" rel="stylesheet">
    <title>VibeCoding 🎸</title>
</head>
<body class="dark">
    <!-- Setup Wizard -->
    <div id="setup-wizard" style="display: none;">
      <h1>VibeCoding Setup 🎸</h1>
      <div id="setup-step-1">Step 1: Detecting hardware...</div>
      <div id="setup-step-2">Step 2: Checking environment...</div>
      <div id="setup-step-3">Step 3: Setting up default model...</div>
      <button id="skip-setup">Skip Setup</button>
    </div>

    <div id="main-content">
      <h1>VibeCoding 🎸</h1>

      <!-- Provider & Endpoint Settings -->
      <div id="settings-panel">
        <label for="provider-select">AI Provider:</label>
        <select id="provider-select">
          <option value="ollama">Ollama</option>
          <option value="openai">OpenAI</option>
          <option value="huggingface">Hugging Face</option>
          <option value="local">Local</option>
        </select>

        <div id="ollama-settings" class="provider-settings">
          <label for="endpoint-dropdown">Endpoint:</label>
          <select id="endpoint-dropdown">
            <option value="http://localhost:11434">localhost:11434</option>
            <option value="http://host.docker.internal:11434">docker.internal:11434</option>
            <option value="custom">Custom</option>
          </select>
          <input id="endpoint-input" type="text" placeholder="Enter custom endpoint" style="display:none;" />
          <button id="download-model">Download Models</button>
        </div>

        <div id="openai-settings" class="provider-settings" style="display:none;">
          <label for="openai-key">OpenAI API Key:</label><input id="openai-key" type="password" />
          <label for="openai-model">Model:</label><input id="openai-model" placeholder="gpt-4" />
        </div>

        <div id="huggingface-settings" class="provider-settings" style="display:none;">
          <label for="hf-token">HF Token:</label><input id="hf-token" type="password" />
          <label for="hf-model">Model:</label><input id="hf-model" placeholder="facebook/opt-1.3b" />
        </div>

        <div id="local-settings" class="provider-settings" style="display:none;">
          <label for="local-path">Model Path:</label><input id="local-path" placeholder="/path/to/model" />
        </div>
      </div>

      <!-- Main Vibe UI -->
      <div id="vibe-content">
        <h2>Your Coding Vibe</h2>
        <div id="hardware-info"></div>
        <div id="monitoring-info"></div>

        <label for="performance-mode">Performance Mode:</label>
        <select id="performance-mode">
          <option value="high">High</option>
          <option value="balanced" selected>Balanced</option>
          <option value="efficient">Efficient</option>
        </select>

        <div>
          <label>Selected Language: <span id="selected-language">No language selected</span></label>
          <button id="select-language">Select Language</button>
        </div>

        <label for="model-select">Model:</label>
        <select id="model-select">
          <option value="codellama:7b">codellama:7b</option>
        </select>

        <label for="task-input">Task:</label>
        <textarea id="task-input" placeholder="Describe what you want to build..."></textarea>

        <div>
          <button id="start-auto">Start the Vibe</button>
          <button id="stop-auto">Pause the Vibe</button>
          <button id="generate-docs">Generate Docs</button>
          <button id="backup-project">Backup Project</button>
        </div>

        <h2>Vibe Progress 🎶</h2>
        <div id="progress-log"></div>
      </div>
    </div>

    <script src="${scriptUri}"></script>
    <script>
      const vscode = acquireVsCodeApi();
      // Show/hide provider settings dynamically
      document.getElementById('provider-select').addEventListener('change', e => {
        const prov = e.target.value;
        document.querySelectorAll('.provider-settings').forEach(div => div.style.display = 'none');
        document.getElementById(prov + '-settings').style.display = 'block';
        vscode.postMessage({ command: 'updateProvider', provider: prov });
      });
      // Endpoint dropdown logic
      const epDrop = document.getElementById('endpoint-dropdown');
      const epInput = document.getElementById('endpoint-input');
      epDrop.addEventListener('change', e => {
        const val = e.target.value;
        if (val === 'custom') { epInput.style.display = 'inline'; }
        else { epInput.style.display = 'none'; vscode.postMessage({ command: 'updateEndpoint', endpoint: val }); }
      });
      epInput.addEventListener('change', e => {
        vscode.postMessage({ command: 'updateEndpoint', endpoint: e.target.value });
      });
      // OpenAI settings listeners
      document.getElementById('openai-key').addEventListener('change', e => {
        vscode.postMessage({ command: 'updateOpenAIKey', key: e.target.value });
      });
      document.getElementById('openai-model').addEventListener('change', e => {
        vscode.postMessage({ command: 'updateOpenAIModel', model: e.target.value });
      });
      // HF settings listeners
      document.getElementById('hf-token').addEventListener('change', e => {
        vscode.postMessage({ command: 'updateHFToken', token: e.target.value });
      });
      document.getElementById('hf-model').addEventListener('change', e => {
        vscode.postMessage({ command: 'updateHFModel', model: e.target.value });
      });
    </script>
</body>
</html>
        `;
    }

    private _setWebviewMessageListener() {
        this._panel.webview.onDidReceiveMessage(
            async (message: any) => {
                const { command } = message;
                switch (command) {
                    case 'updateProvider':
                        this.handlers.updateProvider(message.provider);
                        break;
                    case 'updateEndpoint':
                        this.handlers.updateEndpoint(message.endpoint);
                        break;
                    case 'updateOpenAIKey':
                        this.handlers.updateOpenAIKey(message.key);
                        break;
                    case 'updateOpenAIModel':
                        this.handlers.updateOpenAIModel(message.model);
                        break;
                    case 'updateHFToken':
                        this.handlers.updateHFToken(message.token);
                        break;
                    case 'updateHFModel':
                        this.handlers.updateHFModel(message.model);
                        break;
                    case 'startAuto':
                        this.handlers.startAuto(
                            message.specs,
                            message.model,
                            message.performance,
                            message.language,
                            (msg) => this.logProgress(msg)
                        );
                        break;
                    case 'stopAuto':
                        this.handlers.stopAuto((msg) => this.logProgress(msg));
                        break;
                    case 'downloadModels':
                        const models = await this.handlers.downloadModels();
                        this._panel.webview.postMessage({ command: 'updateModels', models});
                        break;
                    case 'updatePerformance':
                        await this.handlers.updatePerformance(message.mode);
                        break;
                    case 'selectLanguage':
                        const lang = await this.handlers.selectLanguage();
                        this._panel.webview.postMessage({ command: 'updateLanguage', language: lang});
                        break;
                    case 'generateDocs':
                        await this.handlers.generateDocs();
                        break;
                    case 'backupProject':
                        await this.handlers.backupProject();
                        break;
                    case 'skipSetup':
                        if (this.handlers.skipSetup) {
                            this.handlers.skipSetup();
                        }
                        this._panel.webview.postMessage({ command: 'showMainContent' });
                        break;
                }
            },
            undefined,
            this._disposables
        );
    }

    /**
     * Update hardware info in the WebView
     */
    public updateHardwareInfo(info: HardwareInfo) {
        this._panel.webview.postMessage({ command: 'updateHardware', info });
    }

    /**
     * Update monitoring info in the WebView
     */
    public updateMonitoringInfo(monitor: string) {
        this._panel.webview.postMessage({ command: 'updateMonitoring', monitor });
    }

    /**
     * Log progress messages
     */
    public logProgress(message: string) {
        this._panel.webview.postMessage({ command: 'logProgress', message });
    }

    /**
     * Update setup step in the wizard
     */
    public updateSetupStep(step: number, message: string) {
        this._panel.webview.postMessage({ command: 'updateSetupStep', step, message });
    }

    /**
     * Dispose resources
     */
    public dispose() {
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
    }
}
