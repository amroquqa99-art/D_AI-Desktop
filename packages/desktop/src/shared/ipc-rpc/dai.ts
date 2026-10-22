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
export const DaiDesktopStatus = Rpc.make("DaiDesktopStatus", { success: DaiBridgeStatus })
export const DaiDesktopSystems = Rpc.make("DaiDesktopSystems", { success: Schema.Array(DaiSystem) })
export const DaiRpcs = RpcGroup.make(DaiDesktopStatus, DaiDesktopSystems)
