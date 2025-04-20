# docs/hardwareDetector.md - Current Location
# src/hardwareDetector.ts - File Source

**Purpose**  
- Detects system hardware (CPU, RAM, GPU, storage).  
- Infers `hasCuda`, `hasRocm` and `recommendedMode` based on VRAM/RAM.  
- Optionally streams live monitoring info (every 5s).

**API**  
- `detectHardware(): Promise<HardwareInfo>`: one‑shot detection.  
- `getMonitoringInfo(): Promise<string>`: memory & CPU load.  
- `startMonitoring(cb)`: begin periodic updates.  
- `stopMonitoring()`: clear the interval.

**Modification Points**  
- To adjust thresholds (e.g. 32 GB → Balanced), update `recommendedMode` logic.  
- To include disk IO monitoring, extend `getMonitoringInfo`.  
