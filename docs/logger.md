# docs/logger.md - Current Location
# src/logger.ts - File Source

**Purpose**  
- Structured logging via Winston:  
  - Timestamps, JSON, file (`vibecoding.log`), console.  
- Honors telemetry flags at call sites.

**API**  
- `info(msg, meta?)`, `warn(msg, meta?)`, `error(msg, meta?)`

**Modification Points**  
- To forward logs to a remote service, add a custom Winston transport.  
