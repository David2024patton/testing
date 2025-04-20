 docs/fileManager.md - Current Location
# src/fileManager.ts - File Source

**Purpose**  
- Read/write files using VS Code FS API.  
- Automatically back up existing files in `.vibe/`, with version‑numbered names.  
- Directory creation helper and existence checks.

**API**  
- `writeFile(relativePath, content): Promise<void>`  
- `readFile(relativePath): Promise<string>`  
- `createDirectory(relativePath): Promise<void>`  
