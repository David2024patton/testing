// File: media/main.js
// Location: media/main.js
// Docs: docs/main.js.md
// Description: Front-end scripting for the VibeCoding WebView UI.

const vscode = acquireVsCodeApi();

document.getElementById('start-auto').addEventListener('click', () => {
  const specs = document.getElementById('task-input').value;
  const model = document.getElementById('model-select').value;
  const performance = document.getElementById('performance-mode').value;
  const language = document.getElementById('selected-language').textContent.toLowerCase();
  if (language === 'no language selected') {
    alert('Please select a language first!');
    return;
  }
  vscode.postMessage({ command: 'startAuto', specs, model, performance, language });
});

document.getElementById('stop-auto').addEventListener('click', () => {
  vscode.postMessage({ command: 'stopAuto' });
});

document.getElementById('download-model').addEventListener('click', () => {
  vscode.postMessage({ command: 'downloadModels' });
});

document.getElementById('performance-mode').addEventListener('change', (e) => {
  vscode.postMessage({ command: 'updatePerformance', mode: e.target.value });
});

document.getElementById('skip-setup').addEventListener('click', () => {
  vscode.postMessage({ command: 'skipSetup' });
});

document.getElementById('generate-docs').addEventListener('click', () => {
  vscode.postMessage({ command: 'generateDocs' });
});

document.getElementById('backup-project').addEventListener('click', () => {
  vscode.postMessage({ command: 'backupProject' });
});

document.getElementById('select-language').addEventListener('click', () => {
  vscode.postMessage({ command: 'selectLanguage' });
});

window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.command) {

    case 'showSetupWizard':
      document.getElementById('setup-wizard').style.display = 'block';
      document.getElementById('main-content').style.display = 'none';
      break;

    case 'showMainContent':
      document.getElementById('setup-wizard').style.display = 'none';
      document.getElementById('main-content').style.display = 'block';
      break;

    case 'updateSetupStep':
      document.getElementById(`setup-step-${message.step}`).innerText = message.message;
      break;

    case 'updateHardware':
      document.getElementById('hardware-info').innerText = `
CPU: ${message.info.cpu}
RAM: ${message.info.ram}
GPU: ${message.info.gpu}
Storage: ${message.info.storage.join('\n')}
CUDA: ${message.info.hasCuda ? 'Supported' : 'Not Supported'}
ROCm: ${message.info.hasRocm ? 'Supported' : 'Not Supported'}
Recommended Vibe Mode: ${message.recommendedMode}
`;
      document.getElementById('performance-mode').value = message.recommendedMode;
      break;

    case 'updateMonitoring':
      document.getElementById('monitoring-info').innerText = message.info;
      break;

    case 'updateModels':
      const modelSelect = document.getElementById('model-select');
      modelSelect.innerHTML = '';
      message.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.text = model;
        modelSelect.appendChild(option);
      });
      break;

    case 'logProgress':
      const log = document.getElementById('progress-log');
      log.innerText += message.message + '\n';
      log.scrollTop = log.scrollHeight;
      break;

    case 'updateLanguage':
      document.getElementById('selected-language').textContent = message.language;
      break;

    case 'updateTheme':
      document.body.className = message.theme;
      break;
  }
});
