/** SPDX-License-Identifier: GPL-3.0-or-later */
import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/rpc"

// Strictly informational: no arbitrary commands, credentials, URLs or paths.
export const DaiBridgeStatus = Schema.Struct({
  state: Schema.Literals(["disabled", "starting", "connected", "unavailable"]),
  mode: Schema.Literals(["none", "read_only"]),
  version: Schema.NullOr(Schema.String),
})
export const DaiSystem = Schema.Struct({
  id: Schema.String,
  primary: Schema.NullOr(Schema.String),
  roles: Schema.Array(Schema.String),
  maturity: Schema.String,
  professional_validation: Schema.String,
})
export const DaiProject = Schema.Struct({
  id: Schema.String, name: Schema.String,
})
export const DaiMission = Schema.Struct({
  id: Schema.String, system: Schema.String, objective: Schema.String,
  status: Schema.String, next_action: Schema.String, version: Schema.Number,
})
export const DaiDesktopStatus = Rpc.make("DaiDesktopStatus", { success: DaiBridgeStatus })
export const DaiDesktopSystems = Rpc.make("DaiDesktopSystems", { success: Schema.Array(DaiSystem) })
export const DaiDesktopProjects = Rpc.make("DaiDesktopProjects", { success: Schema.Array(DaiProject) })
export const DaiDesktopMissions = Rpc.make("DaiDesktopMissions", {
  payload: { projectId: Schema.String }, success: Schema.Array(DaiMission),
})
export const DaiRpcs = RpcGroup.make(
  DaiDesktopStatus, DaiDesktopSystems, DaiDesktopProjects, DaiDesktopMissions,
)
