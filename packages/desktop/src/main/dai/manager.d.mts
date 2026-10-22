/** SPDX-License-Identifier: GPL-3.0-or-later */
export type DaiBridgeStatus = {
  state: "disabled" | "starting" | "connected" | "unavailable";
  mode: "none" | "read_only";
  version: string | null;
};
export type DaiSystem = {
  id: string; primary: string | null; roles: string[];
  maturity: string; professional_validation: string;
};
export interface DaiDesktopManager {
  start(app: { once(event: "before-quit", handler: () => void): unknown; off(event: "before-quit", handler: () => void): unknown }, config?: {
    python?: string; cwd?: string; catalogPath?: string;
  }): Promise<DaiBridgeStatus>;
  status(): Promise<DaiBridgeStatus>;
  systems(): DaiSystem[];
  stop(): Promise<void>;
}
export function createDaiDesktopManager(options?: { launch?: (options: {
  python: string; cwd: string; catalogPath?: string; startupTimeoutMs?: number;
}) => Promise<{ client: {
  health(): Promise<{service: string; status: string; mode: string; version: string}>;
  systems(): Promise<{systems: DaiSystem[]}>;
}, stop(): Promise<void> }> }): DaiDesktopManager;
export const daiDesktopManager: DaiDesktopManager;
