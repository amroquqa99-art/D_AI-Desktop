// Fork-only feasibility probe. Not a production service or authorization boundary.
// One coordinator instance serializes creation. Multi-process uniqueness needs a reviewed DB contract.
import { Effect, Semaphore } from "effect"
import { Agent } from "@opencode/core/agent"
import { Session } from "@opencode/core/session"
import { SessionSchema } from "@opencode/core/session/schema"
import { SessionStore } from "@opencode/core/session/store"

const key = "opencode.team.probe"
const validName = (name: string) => /^[a-z][a-z0-9-]{0,47}$/.test(name)

export function memberName(root: SessionSchema.Info, child: SessionSchema.Info) {
  if (root.parentID !== undefined || root.time.archived !== undefined) return undefined
  if (child.parentID !== root.id || child.projectID !== root.projectID || child.fork !== undefined) return undefined
  const marker = child.metadata?.[key]
  if (typeof marker !== "object" || marker === null || Array.isArray(marker)) return undefined
  if (!("memberID" in marker) || marker.memberID !== child.id) return undefined
  if (!("rootID" in marker) || marker.rootID !== root.id) return undefined
  if (!("name" in marker) || typeof marker.name !== "string" || !validName(marker.name)) return undefined
  return marker.name
}

export const makeRosterProbe = Effect.fnUntraced(function* (
  sessions: Session.Interface,
  store: SessionStore.Interface,
) {
  const lock = yield* Semaphore.make(1)
  const rootInfo = Effect.fnUntraced(function* (rootID: Session.ID) {
    const root = yield* sessions.get(rootID)
    if (root.parentID !== undefined || root.time.archived !== undefined)
      return yield* Effect.fail(new Error("Roster requires an unarchived root session"))
    return root
  })
  const members = Effect.fnUntraced(function* (root: SessionSchema.Info) {
    const children = yield* store.list({ parentID: root.id })
    return children.flatMap((child) => {
      const name = memberName(root, child)
      return name === undefined ? [] : [{ name, session: child }]
    })
  })
  const list = Effect.fnUntraced(function* (rootID: Session.ID) {
    const root = yield* rootInfo(rootID)
    return (yield* members(root)).filter((member) => member.session.time.archived === undefined)
  })
  const create = (input: { rootID: Session.ID; name: string; agent: Agent.ID }) =>
    lock.withPermit(
      Effect.gen(function* () {
        const name = input.name
        if (!validName(name)) return yield* Effect.fail(new Error("Invalid roster name"))
        const root = yield* rootInfo(input.rootID)
        if ((yield* members(root)).some((member) => member.name === name))
          return yield* Effect.fail(new Error("Roster name already exists"))
        const id = Session.ID.create()
        const child = yield* sessions.create({
          id,
          parentID: root.id,
          agent: input.agent,
          title: name,
          model: root.model,
          // Preserve unrelated host policy annotations. Bind the marker to this exact identity.
          metadata: { ...root.metadata, [key]: { rootID: root.id, memberID: id, name } },
        })
        if (memberName(root, child) !== name) return yield* Effect.fail(new Error("Roster identity mismatch"))
        return child
      }),
    )
  return { list, create }
})
