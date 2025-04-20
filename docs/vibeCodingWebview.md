# docs/vibeCodingWebview.md - Current Location
# src/vibeCodingWebview.ts - File Source

**Purpose**  
- Renders the VS Code WebView panel for the “vibe” UI.  
- Handles messages from the UI (startAuto, stopAuto, downloadModels, updatePerformance, selectLanguage, skipSetup, generateDocs, backupProject).  
- Sends messages back to update hardware info, monitoring, model list, progress logs, language/ theme changes.

**Structure**  
- **Constructor**  
  - Creates `WebviewPanel` with CSP, `media/main.css` & `media/main.js`.  
  - Shows a 3‑step setup wizard then main content.  
  - Binds `onDidReceiveMessage` to the provided `WebviewHandlers`.  
  - Listens to theme changes and panel disposal.

- **Public API**  
  - `updateHardwareInfo(info)`, `updateMonitoringInfo(info)`, `logProgress(msg)`, `updateSetupStep(step, msg)`.

**Modification Points**  
- To add a new UI control: edit both the HTML in `_getWebviewContent()` and the corresponding handler in `onDidReceiveMessage`.  
- To support additional settings: send/receive new message commands.  
