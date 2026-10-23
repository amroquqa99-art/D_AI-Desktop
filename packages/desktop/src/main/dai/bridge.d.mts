/** SPDX-License-Identifier: GPL-3.0-or-later */
export interface DaiBridgeClient {
  health(): Promise<{ service: string; status: string; mode: string; version: string }>;
  systems(): Promise<{ schema_version: number; systems: Array<Record<string, unknown>> }>;
  capabilities(): Promise<Record<string, unknown>>;
}
export interface DaiBridgeHandle {
  client: DaiBridgeClient;
  stop(): Promise<void>;
  processId?: number;
}
export function launchDaiDesktopBridge(options: {
  python: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  catalogPath?: string;
  startupTimeoutMs?: number;
}): Promise<DaiBridgeHandle>;
export function attachDaiDesktopBridge(app: {
  once(event: "before-quit", handler: () => void): unknown;
  off(event: "before-quit", handler: () => void): unknown;
}, options?: {
  python?: string;
  cwd?: string;
  catalogPath?: string;
  launch?: (args: { python: string; cwd: string; catalogPath?: string }) => Promise<DaiBridgeHandle>;
  onState?: (result: { status: string }) => void;
}): Promise<{ status: string }>;
