# VibeCoding VS Code Extension

VibeCoding is an AI-powered coding assistant for VS Code that integrates multiple LLM backends (Ollama, OpenAI, Hugging Face, and more) to automate code generation, documentation, and project management—all with a musical "vibe" theme.

## Features

- **Multiple LLM Providers**: Support for Ollama (local/Docker), OpenAI, Hugging Face, and many others
- **Automated Coding**: Generate code from natural language specifications
- **Project Scaffolding**: Automatically set up project structure based on language/framework
- **Testing & Error Recovery**: Run tests and automatically fix errors
- **Documentation Generation**: Create project documentation with a single click
- **Version History**: Track file changes with full history and restore capabilities
- **Hardware-Aware**: Detects system capabilities and recommends performance settings

## Repository Contents

- `src/` — TypeScript source files
- `media/` — WebView assets (CSS, JavaScript)
- `package.json` & `package-lock.json` — Dependency and script definitions
- `tsconfig.json` — TypeScript compiler configuration
- `.gitignore` — Ignore rules
- `README.md` — This file

## Getting Started (Developer)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/vibe-coding.git
   cd vibe-coding
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   This pulls down all runtime and dev dependencies as listed in `package.json`.

3. **Compile the extension**
   ```bash
   npm run compile
   ```
   Transpiles TypeScript from `src/` into `dist/`.

4. **Run in VS Code**
   - Open the folder in VS Code:
     ```bash
     code .
     ```
   - Press **F5** to launch the Extension Development Host with VibeCoding loaded.

## Usage

1. Open a workspace in VS Code
2. Run the "VibeCoding: Start Coding" command from the command palette
3. Select your preferred LLM provider and configure settings
4. Enter a natural language description of what you want to build
5. Watch as VibeCoding generates code, tests it, and fixes any issues

## Supported Languages

- Python (Flask, general)
- JavaScript/TypeScript (Express, general)
- Java (Spring, general)

## Contributing

- Add or update `.ts` files in `src/` and assets in `media/`.
- Update `package.json` for any new dependencies.
- Use the provided scripts:
  - `npm run compile` — build
  - `npm run watch` — build on file changes

## Publishing

- Ensure `vscode:prepublish` script compiles the code.
- Bump `version` in `package.json`.
- Run `vsce package` or use GitHub Actions to build a `.vsix`.
- Publish to the VS Code Marketplace or attach to GitHub Releases.

---

All you need in version control are the source (`src/`), assets (`media/`), and configuration files. Anyone cloning the repo only needs to run `npm install` to fetch dependencies automatically.
