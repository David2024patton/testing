/**
 * File: src/hardwareDetector.ts
 * Location: src/hardwareDetector.ts
 * Description: Detects system hardware (CPU, RAM, GPU, storage), provides periodic monitoring info,
 * and recommends a performance mode based on hardware capabilities.
 * NOTE: If you adjust detection logic, thresholds, or output formats, update the comments accordingly.
 *
 * Purpose:
 * - Detects system hardware (CPU, RAM, GPU, storage).
 * - Infers `hasCuda`, `hasRocm` and `recommendedMode` based on VRAM/RAM.
 * - Optionally streams live monitoring info (every 5s).
 *
 * API:
 * - `detectHardware(): Promise<HardwareInfo>`: one‑shot detection.
 * - `getMonitoringInfo(): Promise<string>`: memory & CPU load.
 * - `startMonitoring(cb)`: begin periodic updates.
 * - `stopMonitoring()`: clear the interval.
 *
 * Modification Points:
 * - To adjust thresholds (e.g. 32 GB → Balanced), update `recommendedMode` logic.
 * - To include disk IO monitoring, extend `getMonitoringInfo`.
 */

import * as si from 'systeminformation';
import { Logger } from './logger';

export interface HardwareInfo {
  cpu: string;             // CPU model description
  ram: string;             // Total RAM in GB
  gpu: string;             // GPU model or 'None'
  storage: string[];       // Array of storage mount info strings
  hasCuda: boolean;        // NVIDIA CUDA support detected
  hasRocm: boolean;        // AMD ROCm support detected
  recommendedMode: string; // 'high' | 'balanced' | 'efficient'
}

export class HardwareDetector {
  private logger: Logger;
  private monitoringInterval?: NodeJS.Timeout;

  /**
   * Initializes the detector with a Logger instance.
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Detects hardware details:
   *  - CPU: manufacturer + model
   *  - RAM: total GB
   *  - GPU: first graphics controller or 'None'
   *  - Storage: each mount point's free vs total GB
   *  - CUDA/ROCm availability based on GPU name
   *  - Recommended performance mode based on RAM and CUDA
   */
  public async detectHardware(): Promise<HardwareInfo> {
    // Fetch raw data
    const cpuData = await si.cpu();
    const memData = await si.mem();
    const graphicsData = await si.graphics();
    const diskData = await si.fsSize();

    // Format CPU info
    const cpu = `${cpuData.manufacturer} ${cpuData.brand}`;

    // Format RAM in GB
    const totalRamGB = (memData.total / (1024 ** 3)).toFixed(2);
    const ram = `${totalRamGB} GB`;

    // Determine GPU model
    const gpuModel = graphicsData.controllers[0]?.model || 'None';

    // Detect CUDA and ROCm support
    const hasCuda = graphicsData.controllers.some(c => /NVIDIA/i.test(c.model));
    const hasRocm = graphicsData.controllers.some(c => /AMD|Advanced Micro Devices/i.test(c.model));

    // Format storage info: "mount: free GB / total GB"
    const storage = diskData.map(d => {
      const freeGB = (d.available / (1024 ** 3)).toFixed(2);
      const totalGB = (d.size / (1024 ** 3)).toFixed(2);
      return `${d.mount}: ${freeGB} GB free / ${totalGB} GB total`;
    });

    // Determine recommended mode:
    // - 'high' if >=128GB RAM & CUDA
    // - 'balanced' if >=64GB RAM & CUDA
    // - otherwise 'efficient'
    let recommendedMode = 'efficient';
    const ramValue = parseFloat(totalRamGB);
    if (ramValue >= 128 && hasCuda) {
      recommendedMode = 'high';
    } else if (ramValue >= 64 && hasCuda) {
      recommendedMode = 'balanced';
    }

    // Log the detected hardware info
    this.logger.info(`Hardware detected: CPU=${cpu}, RAM=${ram}, GPU=${gpuModel}, CUDA=${hasCuda}, ROCm=${hasRocm}, Mode=${recommendedMode}`);

    return { cpu, ram, gpu: gpuModel, storage, hasCuda, hasRocm, recommendedMode };
  }

  /**
   * Retrieves current memory usage and CPU load as a formatted string.
   * Example:
   *  "RAM Vibe: 6.23 GB / 16.00 GB\nCPU Vibe: 12.34%"
   */
  public async getMonitoringInfo(): Promise<string> {
    const mem = await si.mem();
    const load = await si.currentLoad();

    const usedGB = (mem.used / (1024 ** 3)).toFixed(2);
    const totalGB = (mem.total / (1024 ** 3)).toFixed(2);
    const cpuLoad = load.currentload.toFixed(2);

    return `RAM Vibe: ${usedGB} GB / ${totalGB} GB\nCPU Vibe: ${cpuLoad}%`;
  }

  /**
   * Starts periodic monitoring, calling the provided callback every 5 seconds
   * with updated monitoring info. Call stopMonitoring() to cancel.
   */
  public startMonitoring(callback: (info: string) => void): void {
    // Clear any existing interval
    this.stopMonitoring();
    this.monitoringInterval = setInterval(async () => {
      const info = await this.getMonitoringInfo();
      callback(info);
    }, 5000);
  }

  /**
   * Stops the periodic monitoring if it is running.
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }
}
