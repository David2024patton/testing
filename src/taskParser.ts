/**
 * File: src/taskParser.ts
 * Location: src/taskParser.ts
 * Description: Parses natural‑language specifications into structured tasks for AutoCoder.
 * Defines ProjectConfig (with buildTool and projectStructure) and Task (with prompt, file, testCommand).
 * NOTE: If you update ProjectConfig or Task shapes, update this header accordingly.
 *
 * Purpose:
 * - Converts free‑form specs into a `Task[]` with `prompt`, `file`, and `testCommand`.
 * - Handles Python (Flask or generic), JavaScript (Express or generic), Java.
 *
 * API:
 * - `parseSpecifications(specs, config, logCb): Promise<Task[]>`
 *
 * Modification Points:
 * - To support new languages or frameworks, add cases to the switch.
 * - To parse more complex specs (multiple endpoints), integrate an NLP step.
 */

import { Logger } from './logger';

export interface ProjectConfig {
  language: string;
  framework?: string;
  testFramework?: string;
  buildTool?: string;
  projectStructure: {
    sourceDir: string;
    testDir: string;
    configFiles: string[];
  };
}

export interface Task {
  prompt: string;
  file: string;
  testCommand: string;
}

export class TaskParser {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Turn a free‑form specs string into an ordered list of Tasks.
   * @param specs Natural language description of desired features.
   * @param config ProjectConfig describing language, dirs, etc.
   * @param logCallback Callback to emit progress messages.
   */
  public async parseSpecifications(
    specs: string,
    config: ProjectConfig,
    logCallback: (message: string) => void
  ): Promise<Task[]> {
    logCallback('Parsing your coding vibe... 🧠');
    this.logger.info('Parsing specifications', { specs, config });

    const tasks: Task[] = [];
    const lines = specs
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    for (const line of lines) {
      let prompt = line;
      let file: string;
      let testCommand: string;

      switch (config.language.toLowerCase()) {
        case 'python':
          if (line.toLowerCase().includes('flask')) {
            // Flask app + test
            tasks.push(
              {
                prompt: 'Generate a Flask app with a /hello endpoint',
                file: `${config.projectStructure.sourceDir}/app.py`,
                testCommand: `python ${config.projectStructure.sourceDir}/app.py`
              },
              {
                prompt: 'Generate pytest tests for the Flask app',
                file: `${config.projectStructure.testDir}/test_app.py`,
                testCommand: `pytest ${config.projectStructure.testDir}/test_app.py`
              }
            );
            continue;
          }
          file = `${config.projectStructure.sourceDir}/main.py`;
          testCommand = `python ${file}`;
          break;

        case 'javascript':
          if (line.toLowerCase().includes('express')) {
            tasks.push(
              {
                prompt: 'Generate an Express server with a /hello route',
                file: `${config.projectStructure.sourceDir}/server.js`,
                testCommand: `node ${config.projectStructure.sourceDir}/server.js`
              },
              {
                prompt: 'Generate Jest tests for the Express server',
                file: `${config.projectStructure.testDir}/server.test.js`,
                testCommand: `npm test`
              }
            );
            continue;
          }
          file = `${config.projectStructure.sourceDir}/index.js`;
          testCommand = `node ${file}`;
          break;

        case 'java':
          file = `${config.projectStructure.sourceDir}/Main.java`;
          testCommand = `mvn test`;
          break;

        default:
          this.logger.error(`Unsupported language: ${config.language}`);
          throw new Error(`Unsupported language: ${config.language}`);
      }

      tasks.push({ prompt, file, testCommand });
      logCallback(`Parsed task: "${prompt}" → ${file}`);
      this.logger.info('Parsed task', { prompt, file, testCommand });
    }

    if (tasks.length === 0) {
      this.logger.warn('No tasks parsed from specifications');
      throw new Error('No tasks parsed from specifications');
    }

    return tasks;
  }
}
