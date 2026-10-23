/** SPDX-License-Identifier: GPL-3.0-or-later */
export type DaiRouterInstall = { state: "disabled" | "installed" | "skipped"; detail?: string; reason?: string };
export function installDaiRouterProfile(options?: {
  enabled?: boolean; coreDir?: string; configDir?: string;
}): Promise<DaiRouterInstall>;
