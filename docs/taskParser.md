# docs/taskParser.md - Current Location
# src/taskParser.ts - File Source

**Purpose**   
- Converts free‑form specs into a `Task[]` with `prompt`, `file`, and `testCommand`.  
- Handles Python (Flask or generic), JavaScript (Express or generic), Java.

**API**  
- `parseSpecifications(specs, config, logCb): Promise<Task[]>`

**Modification Points**  
- To support new languages or frameworks, add cases to the switch.  
- To parse more complex specs (multiple endpoints), integrate an NLP step.  
