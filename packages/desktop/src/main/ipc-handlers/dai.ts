/** SPDX-License-Identifier: GPL-3.0-or-later */
import { Effect } from "effect"
import { DaiRpcs } from "../../shared/ipc-rpc/dai"
import { daiDesktopManager } from "../dai/manager.mjs"

export const daiHandlers = DaiRpcs.toLayer(
  Effect.succeed(
    DaiRpcs.of({
      DaiDesktopStatus: () => Effect.promise(() => daiDesktopManager.status()),
      DaiDesktopSystems: () => Effect.sync(() => daiDesktopManager.systems()),
      DaiDesktopProjects: () => Effect.promise(() => daiDesktopManager.projects()),
      DaiDesktopMissions: ({ projectId }) => Effect.promise(() => daiDesktopManager.missions(projectId)),
    }),
  ),
)
