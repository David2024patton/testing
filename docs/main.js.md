# docs/main.js.md - Current Location
# media/main.js - File Source

**Purpose**  
- Front‑end logic for the WebView:  
  - Button click handlers (start, stop, downloadModels, etc.).  
  - Posts messages to extension.  
  - Listens for messages to update DOM (progress log, hardware, theme, models, language).

**Modification Points**  
- To add UI controls, bind new handlers here and send new message commands.  
