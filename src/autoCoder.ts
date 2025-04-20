/**
 * File: src/autoCoder.ts
 * Location: src/autoCoder.ts
 * Description: Handles automated coding workflows: project setup, code generation,
 * testing, quality/security scans, documentation, backups, and integrates with project memory/state.
 * Uses the configured LLMClient to generate code and ErrorRecovery for fixes.
 * NOTE: When modifying workflow steps or adding new features, update this header accordingly.
 *
 * Purpose:
 * - Drives the full "vibe" workflow:
 *   1. Project scaffolding
 *   2. Task parsing
 *   3. Code generation via LLM
 *   4. File writes & backups
 *   5. Test execution & auto‑fix via `ErrorRecovery`
 *   6. Quality/security scans
 *   7. Git & CI/CD setup
 *   8. Documentation & backups
 *
 * Public Methods:
 * - `startAutoMode(specs, model, performance, language, logCb)`
 * - `generateDocumentation()`
 * - `backupProject()`
 *
 * Helper Methods:
 * - `setupStructure()`, `testAndFix()`, `runQualityChecks()`, `setupGit()`, `generateCICD()`, `createProjectConfig()`, `generateConfigContent()`.
 *
 * Modification Points:
 * - To add new pipeline stages, insert steps in `startAutoMode`.
 * - To change scaffolding, update `createProjectConfig`.
 * - To add metrics, inject calls to a new `MetricsCollector` service.
 */

import * as vscode from 'vscode';
import { LLMClient } from './AIClients';
import { TerminalManager } from './terminalManager';
import { TaskParser, Task, ProjectConfig } from './taskParser';
import { ErrorRecovery } from './errorRecovery';
import { FileManager } from './fileManager';
import { UIManager } from './uiManager';
import { Logger } from './logger';

export interface AutoCoderConfig {
  performance: string;
  autoSave: boolean;
}

/**
 * Main class orchestrating the automated coding process.
 * - setupStructure: scaffolds project directories and config files
 * - parseSpecifications: turns user specs into Task objects
 * - startAutoMode: runs generation, testing, and quality checks
 * - generateDocumentation / backupProject: auxiliary project tasks
 */
export class AutoCoder {
  private isRunning = false;

  constructor(
    private llm: LLMClient,
    private terminal: TerminalManager,
    private parser: TaskParser,
    private recovery: ErrorRecovery,
    private files: FileManager,
    private ui: UIManager,
    private logger: Logger,
    private config: AutoCoderConfig
  ) {}

  /**
   * Start the full automated workflow.
   * @param specs – natural‑language project description
   * @param model – LLM model name to use
   * @param performance – performance mode ("high", "balanced", "efficient")
   * @param language – target programming language
   * @param log – callback to stream progress messages
   */
  public async startAutoMode(
    specs: string,
    model: string,
    performance: string,
    language: string,
    log: (msg: string) => void
  ): Promise<void> {
    if (this.isRunning) {
      log('Already running a coding vibe — please wait!');
      return;
    }
    this.isRunning = true;
    log('Starting your coding vibe...');

    if (this.llm.setModel) this.llm.setModel(model);

    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath!;
    try {
      await this.ui.showProgress('Vibing on your project...', async progress => {
        // 1. Scaffold project structure
        const projectConfig = this.createProjectConfig(language);
        progress.report({ message: 'Setting up project structure...' });
        await this.setupStructure(projectConfig, log);

        // 2. Parse user specs into tasks
        log('Parsing tasks...');
        const tasks: Task[] = await this.parser.parseSpecifications(specs, projectConfig, log);

        // 3. Execute each task: generate, write, test, fix, quality
        for (const task of tasks) {
          if (!this.isRunning) break;

          log(`Generating code for ${task.file}...`);
          const code = await this.llm.generateCode(task.prompt, { temperature: performance === 'efficient' ? 0.5 : 0.7 });
          await this.files.writeFile(task.file, code);

          log(`Testing ${task.file}...`);
          await this.testAndFix(task, log, ws);

          log(`Running quality checks on ${task.file}...`);
          await this.runQualityChecks(task.file, language, log, ws);
        }

        // 4. Initialize Git and CI/CD
        progress.report({ message: 'Initializing Git & CI/CD...' });
        await this.setupGit(log, ws);
        await this.generateCICD(log, ws);

        log('Coding vibe complete! 🎉');
      });
    } catch (err) {
      this.logger.error('AutoCoder workflow error', err);
      log(`Error: ${(err as Error).message}`);
      throw err;
    } finally {
      this.isRunning = false;
      if (this.config.autoSave) {
        await vscode.commands.executeCommand('workbench.action.files.saveAll');
        log('All files saved.');
      }
    }
  }

  /** Scaffold the source, test directories and initial config files. */
  private async setupStructure(config: ProjectConfig, log: (msg: string) => void) {
    const { sourceDir, testDir, configFiles } = config.projectStructure;
    await this.files.createDirectory(sourceDir);
    await this.files.createDirectory(testDir);
    for (const cfg of configFiles) {
      const content = this.generateConfigContent(cfg, config);
      await this.files.writeFile(cfg, content);
      log(`Created ${cfg}`);
    }
  }

  /**
   * Run tests; on failure, request a fix from the LLM and re‑write the file.
   */
  private async testAndFix(task: Task, log: (msg: string) => void, ws: string) {
    let attempt = 0;
    while (attempt < 3) {
      try {
        await this.terminal.runCommand(task.testCommand, ws);
        log(`✅ Test passed for ${task.file}`);
        return;
      } catch (e: any) {
        log(`❌ Test failed: ${e.message}`);
        const fixed = await this.recovery.analyzeAndFix(e.message, task.file);
        await this.files.writeFile(task.file, fixed);
        log(`Applied fix to ${task.file}`);
        attempt++;
      }
    }
    log(`⚠️ Could not auto‑fix ${task.file} after multiple attempts.`);
  }

  /** Invoke lint or style checks on the given file. */
  private async runQualityChecks(
    file: string,
    lang: string,
    log: (msg: string) => void,
    ws: string
  ) {
    let cmd: string | null = null;
    if (lang === 'javascript') cmd = `npx eslint ${file}`;
    if (lang === 'python') cmd = `flake8 ${file}`;
    if (cmd) {
      try {
        await this.terminal.runCommand(cmd, ws);
        log(`✅ Quality check passed: ${file}`);
      } catch (e: any) {
        log(`🛠️ Quality issues: ${e.message}`);
      }
    }
  }

  /** Initialize a Git repo and make the initial commit. */
  private async setupGit(log: (msg: string) => void, ws: string) {
    await this.terminal.runCommand('git init', ws);
    await this.terminal.runCommand('git add .', ws);
    await this.terminal.runCommand('git commit -m "Initial Vibe commit"', ws);
    log('Initialized Git repository');
  }

  /** Generate a basic GitHub Actions CI/CD workflow file. */
  private async generateCICD(log: (msg: string) => void, ws: string) {
    const workflow = [
      'name: CI',
      'on: [push]',
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v3',
      '      - run: npm install',
      '      - run: npm test'
    ].join('\n');
    await this.files.writeFile('.github/workflows/ci.yml', workflow);
    log('Created CI/CD workflow');
  }

  /** Generate a README.md via the LLM. */
  public async generateDocumentation(): Promise<void> {
    await this.ui.showProgress('Generating docs...', async () => {
      const docs = await this.llm.generateCode('Generate a README with installation and usage.');
      await this.files.writeFile('README.md', docs);
      this.logger.info('Documentation generated');
    });
  }

  /** Create a tarball backup of the project. */
  public async backupProject(): Promise<void> {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath!;
    await this.ui.showProgress('Backing up project...', async () => {
      await this.terminal.runCommand('tar -czf vibe_backup.tar.gz .', ws);
      this.logger.info('Project backup created');
    });
  }

  /** Return scaffold configuration based on target language. */
  private createProjectConfig(language: string): ProjectConfig {
    const base: Omit<ProjectConfig, 'language'> = {
      framework: '',
      testFramework: '',
      buildTool: '',
      projectStructure: { sourceDir: 'src', testDir: 'tests', configFiles: [] }
    };
    const map: Record<string, ProjectConfig> = {
      python: {
        ...base,
        language,
        framework: 'flask',
        testFramework: 'pytest',
        buildTool: 'pip',
        projectStructure: { sourceDir: 'src', testDir: 'tests', configFiles: ['requirements.txt', 'pyproject.toml'] }
      },
      javascript: {
        ...base,
        language,
        framework: 'express',
        testFramework: 'jest',
        buildTool: 'npm',
        projectStructure: { sourceDir: 'src', testDir: 'tests', configFiles: ['package.json', '.eslintrc.js'] }
      },
      java: {
        ...base,
        language,
        framework: 'spring',
        testFramework: 'junit',
        buildTool: 'maven',
        projectStructure: { sourceDir: 'src/main/java', testDir: 'src/test/java', configFiles: ['pom.xml'] }
      }
    };
    return map[language] || map.python;
  }

  /** Produce boilerplate content for common config files. */
  private generateConfigContent(file: string, cfg: ProjectConfig): string {
    if (file.endsWith('requirements.txt')) return 'flask==2.3.2\npytest==7.4.0';
    if (file.endsWith('pyproject.toml')) return '[tool.poetry]\nname = "vibe-project"';
    if (file === 'package.json') return JSON.stringify({ name: 'vibe-project', version: '1.0.0', scripts: { test: 'jest' } }, null, 2);
    if (file === '.eslintrc.js') return 'module.exports = { env: { node: true }, extends: ["eslint:recommended"] };';
    if (file === 'pom.xml') return `<project><modelVersion>4.0.0</modelVersion>...</project>`;
    return '';
  }
}
