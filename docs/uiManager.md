# docs/uiManager.md - Current Location
# src/uiManager.ts - File Source

**Purpose**  
- Wrapper for VS Code UI calls:  
  - `showProgress(title, task)`  
  - `showInformationMessage()`  
  - `showErrorMessage()`  
  - `showQuickPick()`

**Modification Points**  
- To add custom dialogs or input boxes, extend this helper.  
