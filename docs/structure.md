# docs/structure.md - Current Location
# src/structure.ts - File Source

# VibeCoding VS Code Extension — File Structure

VibeCoding/
├── 📄 package.json
├── 📄 package_schema.md
├── 📄 README.md
├── 📄 tsconfig.json
│
├── 📁 docs
│   ├── 📄 AIClients.md
│   ├── 📄 autoCoder.md
│   ├── 📄 dependencyManager.md
│   ├── 📄 errorRecovery.md
│   ├── 📄 fileManager.md
│   ├── 📄 hardwareDetector.md
│   ├── 📄 huggingFaceClient.md
│   ├── 📄 logger.md
│   ├── 📄 main.css.md
│   ├── 📄 main.js.md
│   ├── 📄 ollamaClient.md
│   ├── 📄 settingsManager.md
│   ├── 📄 structure.md
│   ├── 📄 taskParser.md
│   ├── 📄 terminalManager.md
│   ├── 📄 uiManager.md
│   ├── 📄 vibeCodingWebview.md
│   └── 📄 vibeController.md
│
├── 📁 media
│   ├── 📄 main.css
│   └── 📄 main.js
│
├── 📁 src
│   ├── 📄 AIClients.ts
│   ├── 📄 autoCoder.ts
│   ├── 📄 dependencyManager.ts
│   ├── 📄 errorRecovery.ts
│   ├── 📄 extension.ts
│   ├── 📄 fileManager.ts
│   ├── 📄 hardwareDetector.ts
│   ├── 📄 huggingFaceClient.ts
│   ├── 📄 logger.ts
│   ├── 📄 ollamaClient.ts
│   ├── 📄 openAIClient.ts
│   ├── 📄 settingsManager.ts
│   ├── 📄 taskParser.ts
│   ├── 📄 terminalManager.ts
│   ├── 📄 uiManager.ts
│   ├── 📄 vibeCodingWebview.ts
│   ├── 📄 vibeController.ts
│   │
│   └── 📁 test
│       └── 📄 openAIClient.test.ts



## Top‑Level

- **package.json**  
  Extension manifest: metadata, activation events, commands, configuration schema, dependencies.

## `/src`

- **extension.ts**  
  Entry point: `activate`/`deactivate`, workspace indexing, command registration, and factory instantiation.

- **vibeController.ts**  
  Core controller: picks the LLM client, wires up hardware detection, telemetry, project context, WebView, and AutoCoder.

- **vibeCodingWebview.ts**  
  Manages the VS Code WebView UI: setup wizard, performance/model/language selectors, task input, progress log, and message handling.

- **AIClients.ts**  
  Factory plus implementations for every supported provider (Ollama, OpenAI, Hugging Face, Grok, etc.), all behind a common `LLMClient` interface.

- **hardwareDetector.ts**  
  Detects CPU/RAM/GPU/storage, recommends performance mode, and optionally streams monitoring info.

- **autoCoder.ts**  
  Automates project scaffolding, code generation, testing, CI/CD, backups, and orchestrates the full “vibe” workflow.

- **terminalManager.ts**  
  Wraps VS Code’s Task API to run shell commands, checks or installs dependencies, and captures outputs.

- **taskParser.ts**  
  Parses the user’s natural‑language “vibe” specs into discrete tasks (`prompt`, `file`, `testCommand`).

- **errorRecovery.ts**  
  Catches runtime/test errors, backs up originals, formulates context‑aware prompts, and patches code via the LLM (with auto‑install for missing deps).

- **dependencyManager.ts**  
  Validates Node/Python/Java versions, resolves conflicts, and (optionally) automates upgrades.

- **fileManager.ts**  
  Reads and writes files via the VS Code FS API, keeps versioned backups in `.vibe/`, and provides history/revert support.

- **settingsManager.ts**  
  Typed accessor for every `vibecoding.*` setting, including provider, endpoints, API keys, performance, autosave, and telemetry flags.

- **uiManager.ts**  
  Helpers for `window.showProgress`, `showInformationMessage`, `showErrorMessage`, and `showQuickPick`.

- **logger.ts**  
  Structured logging (e.g. via Winston), writing both to console and to a `vibecoding.log` file, with telemetry toggles.

## `/media`

- **main.css**  
  WebView styling using VS Code theme variables plus custom “vibe” accents.

- **main.js**  
  WebView script: button listeners, posting messages to the extension, and updating the DOM on incoming messages.

---

## Per‑File READMEs

Below each section is the README for that file. Copy each into its own `.md` alongside the source if you like.

---

### `extension.md`

```markdown
# src/extension.ts

**Purpose**  
- Bootstraps the extension on activation.
- Checks workspace trust and prompts for indexing.
- Maintains a recursive index of `.py`, `.js`, and `.java` in `context.globalState`.
- Registers commands: startCoding, stopCoding, generateDocs, backupProject, viewHistory, reindexWorkspace.
- Wires up a diagnostic provider for FIXMEs/TODOs.

**Key Steps**  
1. **activate**  
   - Initialize `Logger`, `SettingsManager`, and retrieve persisted `workspaceIndex` & `projectContexts`.  
   - Prompt to index each folder not seen before.  
   - Listen to workspace, file‑change, creation, and deletion events to keep the index fresh.  
   - Instantiate `VibeController` with all dependencies.  
   - Register all commands with pre‑trust checks.  
   - Persist index & contexts at the end of activation.

2. **deactivate**  
   - Save or clear any needed state in `globalState`.

**Modification Points**  
- Add/remove commands: update activationEvents in `package.json` and this file’s command registrations.  
- Change indexing rules: update the `indexWorkspaceFolder` helper.  
- Extend diagnostics: modify the diagnostic collection logic.  
